import { describe, expect, test } from "bun:test";
import {
  parseZhihuInput,
  readZhihuArticle,
  sampleArticleText,
  ZhihuArticleReadError,
} from "./read-zhihu-article";

const initialData = {
  initialState: {
    post: {
      "123": {
        id: "123",
        title: "一篇真实评测",
        created: 1_780_000_000,
        updated: 1_780_000_100,
        content: `<p>第一段包含<strong>实测</strong>。</p><p>${"详细过程".repeat(80)}</p><a href="https://example.com/report">来源</a>`,
      },
    },
  },
};

const answerInitialData = {
  initialState: {
    entities: {
      questions: {
        "2070336637360518307": {
          id: "2070336637360518307",
          title: "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？",
          detail:
            '<p>问题背景给出了 41.6% 与 67.2% 的来源。</p><a href="https://link.zhihu.com/?target=https%3A%2F%2Fwww.anthropic.com%2Fresearch%2Friemann-zeta">Anthropic 官方说明</a>',
        },
      },
      answers: {
        "2070452326175969352": {
          id: "2070452326175969352",
          content: `<p><b>Linear Algebra Is All You Need.</b></p><p>${"完整分析".repeat(100)}</p><img data-original="https://picx.zhimg.com/evidence_r.jpg" src="https://picx.zhimg.com/evidence.jpg"><img data-original="https://picx.zhimg.com/evidence_r.jpg" src="data:image/svg+xml"><sup data-text="https://example.com/source.pdf">[1]</sup><a href="https://example.com/paper.pdf">论文</a>`,
          createdTime: 1_786_414_301,
          updatedTime: 1_786_415_340,
          author: {
            name: "赵泠",
            headline: "数学领域创作者",
            badge: [
              {
                description: "优秀答主",
                topics: [{ name: "数学" }, { name: "物理学" }],
              },
            ],
          },
          question: {
            id: "2070336637360518307",
            title: "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？",
          },
        },
      },
    },
  },
};

describe("readZhihuArticle", () => {
  test("samples both the beginning and ending of long articles", () => {
    const text = `${"开头".repeat(500)}${"中间".repeat(500)}${"结尾".repeat(500)}`;
    const sample = sampleArticleText(text, 500);
    expect(sample).toStartWith("开头");
    expect(sample).not.toContain("中间");
    expect(sample).toEndWith("结尾");
    expect(sample).toHaveLength(500);
  });

  test("reads app-view article data and preserves external citations", async () => {
    const result = await readZhihuArticle("https://zhuanlan.zhihu.com/p/123?utm_source=test", {
      maximumCharacters: 500,
      fetch: async () =>
        new Response(
          `<html><script id="js-initialData" type="text/json">${JSON.stringify(initialData)}</script></html>`,
          { headers: { "content-type": "text/html" } },
        ),
    });

    expect(result.title).toBe("一篇真实评测");
    expect(result.text).toContain("第一段包含 实测");
    expect(result.citations).toEqual(["https://example.com/report"]);
    expect(result.canonicalUrl).toBe("https://zhuanlan.zhihu.com/p/123");
    expect(result.textSource).toBe("app_view");
  });

  test("uses official search only after webpage sources remain incomplete", async () => {
    let searchCalls = 0;
    const result = await readZhihuArticle("https://zhuanlan.zhihu.com/p/123", {
      maximumCharacters: 500,
      fetch: async () =>
        new Response(
          `<html><script id="js-initialData" type="text/json">${JSON.stringify(initialData)}</script></html>`,
        ),
      articleReaderFetch: async () => new Response("reader unavailable", { status: 503 }),
      searchClient: {
        searchZhihu: async () => {
          searchCalls += 1;
          return {
            items: [
              {
                Url: "https://zhuanlan.zhihu.com/p/123?utm_source=openapi",
                ContentText: `官方可见文本 ${"更长内容".repeat(200)}`,
              },
            ],
          };
        },
      },
    });
    expect(searchCalls).toBe(1);
    expect(result.text).toStartWith("官方可见文本");
    expect(result.textSource).toBe("open_platform_search");
    expect(result.truncated).toBe(true);
  });

  test("uses the article reader fallback when official sources only return a truncated column", async () => {
    let searchCalls = 0;
    const shortInitialData = {
      initialState: {
        post: {
          "123": {
            id: "123",
            title: "一篇被截断的专栏",
            content: `<p>${"官方片段".repeat(120)}</p>`,
          },
        },
      },
    };
    const fullMarkdown = `Title: 一篇被截断的专栏

URL Source: https://zhuanlan.zhihu.com/p/123

Markdown Content:

# 一篇被截断的专栏

[外部论文](https://example.com/paper)说明了方法。

${"完整正文".repeat(500)}

![实验图](https://picx.zhimg.com/evidence_r.jpg)`;

    const result = await readZhihuArticle("https://zhuanlan.zhihu.com/p/123", {
      maximumCharacters: 4_000,
      fetch: async () =>
        new Response(
          `<html><script id="js-initialData" type="text/json">${JSON.stringify(shortInitialData)}</script></html>`,
        ),
      articleReaderFetch: async (input) => {
        expect(String(input)).toBe("https://r.jina.ai/https://zhuanlan.zhihu.com/p/123");
        return new Response(fullMarkdown);
      },
      searchClient: {
        searchZhihu: async () => {
          searchCalls += 1;
          return { items: [] };
        },
      },
    });

    expect(searchCalls).toBe(0);
    expect(result.textSource).toBe("article_reader_fallback");
    expect(result.sourceCharacterCount).toBeGreaterThan(1_500);
    expect(result.text).toContain("外部论文说明了方法");
    expect(result.citations).toContain("https://example.com/paper");
    expect(result.embeddedImages).toEqual(["https://picx.zhimg.com/evidence_r.jpg"]);
  });

  test("keeps official text when the optional article reader is unavailable", async () => {
    const result = await readZhihuArticle("https://zhuanlan.zhihu.com/p/123", {
      fetch: async () =>
        new Response(
          `<html><script id="js-initialData" type="text/json">${JSON.stringify(initialData)}</script></html>`,
        ),
      articleReaderFetch: async () => new Response("reader failed", { status: 503 }),
    });
    expect(result.textSource).toBe("app_view");
    expect(result.text).toContain("第一段包含 实测");
  });

  test("does not spend an official search call when the direct webpage is already complete", async () => {
    let searchCalls = 0;
    const completeInitialData = {
      initialState: {
        post: {
          "123": {
            id: "123",
            title: "网页完整专栏",
            content: `<p>${"网页完整正文".repeat(300)}</p>`,
          },
        },
      },
    };
    const result = await readZhihuArticle("https://zhuanlan.zhihu.com/p/123", {
      fetch: async () =>
        new Response(
          `<html><script id="js-initialData" type="text/json">${JSON.stringify(completeInitialData)}</script></html>`,
        ),
      searchClient: {
        searchZhihu: async () => {
          searchCalls += 1;
          return { items: [] };
        },
      },
    });
    expect(result.textSource).toBe("app_view");
    expect(searchCalls).toBe(0);
  });

  test("extracts an answer URL and author hints from complete share text", () => {
    const parsed = parseZhihuInput(
      "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？ - 赵泠的回答 - 知乎 https://www.zhihu.com/question/2070336637360518307/answer/2070452326175969352",
    );
    expect(parsed).toMatchObject({
      contentType: "answer",
      sourceContentId: "2070452326175969352",
      questionId: "2070336637360518307",
      titleHint: "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？",
      authorHint: "赵泠",
    });
  });

  test("reads a Zhihu answer from page initial data", async () => {
    const result = await readZhihuArticle(
      "标题 - 赵泠的回答 - 知乎 https://www.zhihu.com/question/2070336637360518307/answer/2070452326175969352",
      {
        maximumCharacters: 500,
        fetch: async () =>
          new Response(
            `<html><script id="js-initialData" type="text/json">${JSON.stringify(answerInitialData)}</script></html>`,
          ),
      },
    );
    expect(result.contentType).toBe("answer");
    expect(result.author).toBe("赵泠");
    expect(result.authorContext).toEqual({
      name: "赵泠",
      headline: "数学领域创作者",
      badges: ["优秀答主"],
      topicExpertise: ["数学", "物理学"],
    });
    expect(result.title).toStartWith("如何评价 Anthropic");
    expect(result.citations).toEqual([
      "https://example.com/source.pdf",
      "https://example.com/paper.pdf",
    ]);
    expect(result.embeddedImages).toEqual(["https://picx.zhimg.com/evidence_r.jpg"]);
    expect(result.questionContext).toEqual({
      text: "问题背景给出了 41.6% 与 67.2% 的来源。\nAnthropic 官方说明",
      citations: ["https://www.anthropic.com/research/riemann-zeta"],
    });
    expect(result.textSource).toBe("answer_page");
  });

  test("accepts a complete short answer instead of treating it as missing content", async () => {
    const shortAnswerData = {
      initialState: {
        entities: {
          questions: {
            "2066577828443854713": {
              id: "2066577828443854713",
              title: "27 岁做出自己的游戏却一行代码未写，反映了游戏开发怎样的趋势？",
            },
          },
          answers: {
            "2067654709398312487": {
              id: "2067654709398312487",
              content: "<p>27岁，仅靠点外卖就吃上了水煮鱼，反映了餐饮业怎样的趋势？</p>",
              question: {
                id: "2066577828443854713",
                title: "27 岁做出自己的游戏却一行代码未写，反映了游戏开发怎样的趋势？",
              },
            },
          },
        },
      },
    };
    const result = await readZhihuArticle(
      "https://www.zhihu.com/question/2066577828443854713/answer/2067654709398312487",
      {
        fetch: async () =>
          new Response(
            `<html><script id="js-initialData" type="text/json">${JSON.stringify(shortAnswerData)}</script></html>`,
          ),
      },
    );
    expect(result.text).toBe("27岁，仅靠点外卖就吃上了水煮鱼，反映了餐饮业怎样的趋势？");
    expect(result.sourceCharacterCount).toBeLessThan(80);
  });

  test("rejects unsupported Zhihu content without fetching", async () => {
    let fetched = false;
    expect(
      readZhihuArticle("https://www.zhihu.com/people/example", {
        fetch: async () => {
          fetched = true;
          return new Response();
        },
      }),
    ).rejects.toBeInstanceOf(ZhihuArticleReadError);
    expect(fetched).toBe(false);
  });
});
