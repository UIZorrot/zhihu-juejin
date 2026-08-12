import { describe, expect, test } from "bun:test";
import { DeepSeekClient, DeepSeekHttpError, DeepSeekProtocolError } from "./client";
import { evaluateArticleQuality, evaluateFullContent, triageContentPreview } from "./evaluate";

function completion(content: object): Response {
  return Response.json({
    id: "completion-1",
    model: "deepseek-v4-flash",
    choices: [
      {
        finish_reason: "stop",
        message: { role: "assistant", content: JSON.stringify(content) },
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  });
}

function articleEvaluation() {
  const dimension = { score: 7, evidence: ["有具体证据"], reason: "测试" };
  return {
    contentProfile: {
      primaryArchetype: "social_commentary",
      effortScore: 6,
      effortSignals: ["有具体推理"],
      effortLimitations: ["缺少案例"],
    },
    evidenceAndTruthfulness: {
      ...dimension,
      verifiedSources: ["官方来源"],
      unsupportedClaims: [],
      comparisonChecks: [],
    },
    practiceAndExperience: {
      ...dimension,
      practiceSignals: [],
      tacitExperienceSignals: [],
      genericExperience: [],
    },
    informationGainAndDepth: { ...dimension, beyondBaseline: [], overlapsBaseline: [] },
    professionalismAndOriginality: {
      ...dimension,
      domainSignals: [],
      originalInsights: [],
      technicalProblems: [],
      boundaryAwareness: [],
    },
    commercialIndependence: { ...dimension, promotionalSignals: [], contentFarmSignals: [] },
    timelinessValue: { ...dimension, timeSensitive: true, freshnessBasis: "当天发布" },
    factualProblems: [],
    flags: [],
    confidence: 80,
    summary: "测试评价",
  };
}

describe("DeepSeek quality evaluator", () => {
  test.each([402, 429])("preserves DeepSeek capacity HTTP status %i", async (status) => {
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async () => new Response("capacity unavailable", { status }),
    });

    try {
      await triageContentPreview(client, {
        title: "测试",
        excerpt: "测试",
        candidateTopicIds: [],
      });
      throw new Error("expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DeepSeekHttpError);
      expect((error as DeepSeekHttpError).status).toBe(status);
    }
  });

  test("uses non-thinking JSON mode for summary triage", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return completion({
          contentCoverage: "summary",
          topicRelevance: 90,
          likelyDepth: 70,
          noveltyPotential: 75,
          thesisNovelty: 70,
          evidenceSpecificity: 80,
          frontierAwareness: 75,
          firstHandSignal: 65,
          genericAiStyleRisk: 10,
          spamRisk: 10,
          shouldAcquireFullText: true,
          targetTopicIds: ["agent-evaluation"],
          reasonCodes: ["CONCRETE_BENCHMARK"],
          rationale: "摘要包含明确评测对象。",
        });
      },
    });

    const result = await triageContentPreview(client, {
      title: "Agent 工具调用评测",
      excerpt: "对五种框架进行测试",
      candidateTopicIds: ["agent-evaluation"],
    });

    expect(result.shouldAcquireFullText).toBe(true);
    expect(requestBody?.response_format).toEqual({ type: "json_object" });
    expect(requestBody?.thinking).toEqual({ type: "disabled" });
    expect(requestBody?.model).toBe("deepseek-v4-flash");
  });

  test("requires full text before running final quality evaluation", async () => {
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async () => {
        throw new Error("must not call API");
      },
    });

    expect(
      evaluateFullContent(client, {
        title: "标题",
        fullText: "",
        candidateTopicIds: [],
        comparisonSnippets: [],
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });

  test("passes question premises and external verification separately from the answer", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body));
        return completion(articleEvaluation());
      },
    });

    await evaluateArticleQuality(client, {
      title: "问题标题",
      text: "回答正文",
      canonicalUrl: "https://www.zhihu.com/question/1/answer/2",
      citations: [],
      baseline: { question: "问题", answer: "基线", genericPoints: [] },
      questionContext: {
        text: "题目已经给出关键数据",
        citations: ["https://example.com/official"],
      },
      verificationEvidence: [
        { title: "官方核验", url: "https://example.com/official", excerpt: "关键数据属实" },
      ],
      mediaEvidence: {
        embeddedImageCount: 3,
        imageUrls: ["https://picx.zhimg.com/evidence.jpg"],
      },
      authorContext: {
        name: "作者",
        headline: "领域从业者",
        badges: ["优秀答主"],
        topicExpertise: ["数学"],
      },
      sampling: { truncated: true, headCharacters: 2_000, tailCharacters: 2_000 },
    });

    const messages = requestBody?.messages as Array<{ content: string }>;
    expect(requestBody?.temperature).toBe(0);
    expect(messages[0]?.content).toContain("严禁仅凭语气扣分");
    expect(messages[0]?.content).toContain("搜索未召回、没有找到或暂时无法验证，不构成事实错误");
    const evaluationInput = JSON.parse(messages[1]?.content ?? "{}") as {
      questionContext?: { text?: string };
      verificationEvidence?: Array<{ title?: string }>;
      mediaEvidence?: { embeddedImageCount?: number };
      authorContext?: { topicExpertise?: string[] };
      article?: { sampling?: { headCharacters?: number } };
    };
    expect(evaluationInput.questionContext?.text).toBe("题目已经给出关键数据");
    expect(evaluationInput.verificationEvidence?.[0]?.title).toBe("官方核验");
    expect(evaluationInput.mediaEvidence?.embeddedImageCount).toBe(3);
    expect(evaluationInput.authorContext?.topicExpertise).toEqual(["数学"]);
    expect(evaluationInput.article?.sampling?.headCharacters).toBe(2_000);
  });

  test("rejects JSON that does not match the quality schema", async () => {
    let requestCount = 0;
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async () => {
        requestCount += 1;
        return completion({ verdict: "excellent" });
      },
    });

    expect(
      triageContentPreview(client, {
        title: "标题",
        excerpt: "摘要",
        candidateTopicIds: [],
      }),
    ).rejects.toBeInstanceOf(DeepSeekProtocolError);
    expect(requestCount).toBe(2);
  });

  test("repairs one schema-invalid JSON response", async () => {
    let requestCount = 0;
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async () => {
        requestCount += 1;
        if (requestCount === 1) {
          return completion({ contentCoverage: "summary" });
        }
        return completion({
          contentCoverage: "summary",
          topicRelevance: 80,
          likelyDepth: 60,
          noveltyPotential: 55,
          thesisNovelty: 55,
          evidenceSpecificity: 65,
          frontierAwareness: 60,
          firstHandSignal: 50,
          genericAiStyleRisk: 20,
          spamRisk: 10,
          shouldAcquireFullText: true,
          targetTopicIds: ["agent-evaluation"],
          reasonCodes: ["EVIDENCE_SIGNAL"],
          rationale: "修复后的完整输出。",
        });
      },
    });

    const result = await triageContentPreview(client, {
      title: "Agent 评测",
      excerpt: "包含真实测试",
      candidateTopicIds: ["agent-evaluation"],
    });

    expect(result.shouldAcquireFullText).toBe(true);
    expect(requestCount).toBe(2);
  });
});
