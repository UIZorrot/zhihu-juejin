import { describe, expect, test } from "bun:test";
import { DeepSeekClient, DeepSeekHttpError, DeepSeekProtocolError } from "./client";
import {
  applyBaselineComparisonLimits,
  applyPublicReceptionComposition,
  evaluateArticleQuality,
  evaluateFullContent,
  generateBlindBaseline,
  generateBlindBaselineWithFallback,
  triageContentPreview,
} from "./evaluate";
import type { ArticleQualityEvaluation } from "./schemas";

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

function webSearchCompletion(content: object, usedWebSearch = true): Response {
  return Response.json({
    id: "message-1",
    model: "deepseek-v4-flash",
    stop_reason: "end_turn",
    content: [
      ...(usedWebSearch
        ? [
            {
              type: "server_tool_use",
              id: "tool-1",
              name: "web_search",
              input: { query: "测试问题 官方资料" },
            },
            {
              type: "web_search_tool_result",
              tool_use_id: "tool-1",
              content: [],
            },
          ]
        : []),
      { type: "text", text: `\`\`\`json\n${JSON.stringify(content)}\n\`\`\`` },
    ],
  });
}

function articleEvaluation(): ArticleQualityEvaluation {
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
    publicReception: {
      ...dimension,
      commentObservationScore: 7,
      interactionSignalScore: 7,
      positiveObservations: [],
      criticalObservations: [],
      sampleLimitations: [],
    },
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

  test("grounds the blind baseline in external evidence without exposing the article", async () => {
    let requestBody: Record<string, unknown> | undefined;
    let requestUrl = "";
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async (input, init) => {
        requestUrl = String(input);
        requestBody = JSON.parse(String(init?.body));
        return webSearchCompletion({
          question: "测试问题",
          answer: "强基线答案",
          genericPoints: ["公开资料可重建的要点"],
        });
      },
    });

    await generateBlindBaseline(client, {
      title: "测试问题",
      questionContext: "公开问题背景",
      verificationEvidence: [
        { title: "官方资料", url: "https://example.com/source", excerpt: "公开事实" },
      ],
    });

    const messages = requestBody?.messages as Array<{ content: string }>;
    const baselineInput = JSON.parse(messages[0]?.content ?? "{}") as {
      verificationEvidence?: Array<{ title?: string }>;
      article?: unknown;
    };
    const tools = requestBody?.tools as Array<Record<string, unknown>>;
    expect(requestUrl).toEndWith("/anthropic/v1/messages");
    expect(tools[0]?.type).toBe("web_search_20250305");
    expect(tools[0]?.blocked_domains).toEqual(["zhihu.com"]);
    expect(baselineInput.verificationEvidence?.[0]?.title).toBe("官方资料");
    expect(baselineInput.article).toBeUndefined();
    expect(requestBody?.system).toContain("必须先使用 Web Search");
  });

  test("rejects a claimed web baseline when no search tool was used", async () => {
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async () =>
        webSearchCompletion({ question: "问题", answer: "答案", genericPoints: [] }, false),
    });

    expect(generateBlindBaseline(client, { title: "问题" })).rejects.toBeInstanceOf(
      DeepSeekProtocolError,
    );
  });

  test("uses Zhihu global-search evidence when native Web Search fails", async () => {
    const requestUrls: string[] = [];
    const requestBodies: Array<Record<string, unknown>> = [];
    const client = new DeepSeekClient({
      apiKey: "test-key",
      fetch: async (input, init) => {
        requestUrls.push(String(input));
        requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        if (String(input).endsWith("/anthropic/v1/messages")) {
          return new Response("web search temporarily unavailable", { status: 500 });
        }
        return completion({
          question: "测试问题",
          answer: "根据全网搜索摘要生成的基线",
          genericPoints: ["公开资料中的共同信息"],
        });
      },
    });

    const result = await generateBlindBaselineWithFallback(client, {
      title: "测试问题",
      verificationEvidence: [
        {
          title: "外部二手资料",
          url: "https://example.com/report",
          excerpt: "可用于重建的公共事实",
          authorityLevel: "2",
        },
      ],
    });

    expect(result.researchMode).toBe("zhihu_global_search_fallback");
    expect(result.baseline.genericPoints).toEqual(["公开资料中的共同信息"]);
    expect(requestUrls).toEqual([
      "https://api.deepseek.com/anthropic/v1/messages",
      "https://api.deepseek.com/chat/completions",
    ]);
    const fallbackMessages = requestBodies[1]?.messages as Array<{ content: string }>;
    const fallbackInput = JSON.parse(fallbackMessages[1]?.content ?? "{}") as {
      verificationEvidence?: Array<{
        title?: string;
        url?: string;
        excerpt?: string;
        authorityLevel?: string;
      }>;
      article?: unknown;
    };
    expect(fallbackInput.verificationEvidence?.[0]).toEqual({
      title: "外部二手资料",
      url: "https://example.com/report",
      excerpt: "可用于重建的公共事实",
      authorityLevel: "2",
    });
    expect(fallbackInput.article).toBeUndefined();
  });

  test("deterministically limits high scores when the baseline reconstructs most content", () => {
    const evaluation = articleEvaluation();
    evaluation.informationGainAndDepth.score = 8.5;
    evaluation.professionalismAndOriginality.score = 8;

    const limited = applyBaselineComparisonLimits(evaluation, {
      reconstructablePercentage: 85,
      reconstructablePoints: ["核心事实"],
      presentationOnlyPoints: ["术语化表达"],
      incrementalPoints: ["一项局部解释"],
      genericAiStyleSignals: ["模板化分节"],
      informationGainCeiling: 6,
      originalityCeiling: 6,
      reason: "大部分可重建",
    });

    expect(limited.informationGainAndDepth.score).toBe(4.5);
    expect(limited.professionalismAndOriginality.score).toBe(4.5);
    expect(limited.informationGainAndDepth.reason).toContain("可重建约 85%");
  });

  test("does not erase substantive first-hand tests just because public background is reconstructable", () => {
    const evaluation = articleEvaluation();
    evaluation.practiceAndExperience.score = 7;
    evaluation.informationGainAndDepth.score = 7;
    evaluation.professionalismAndOriginality.score = 7;

    const limited = applyBaselineComparisonLimits(evaluation, {
      reconstructablePercentage: 85,
      reconstructablePoints: ["发布信息和官方 benchmark"],
      presentationOnlyPoints: [],
      incrementalPoints: [
        "比较 Claude Code 与 opencode 的同任务表现",
        "记录目录遮挡、乱码和功能缺失等失败现象",
      ],
      genericAiStyleSignals: [],
      informationGainCeiling: 5.5,
      originalityCeiling: 5.5,
      reason: "公共背景很多，但存在一手实测",
    });

    expect(limited.informationGainAndDepth.score).toBe(6.5);
    expect(limited.professionalismAndOriginality.score).toBe(6.5);
  });

  test("composes public reception from comments 60% and interactions 40%", () => {
    const evaluation = articleEvaluation();
    evaluation.publicReception.commentObservationScore = 3;
    evaluation.publicReception.interactionSignalScore = 10;
    evaluation.publicReception.reason =
      "根据规则，commentObservationScore 为 3，interactionSignalScore 为 10";
    evaluation.publicReception.positiveObservations = ["认可其中的技术解释"];
    evaluation.publicReception.criticalObservations = ["质疑内容带有明显 AI 味道"];

    const composed = applyPublicReceptionComposition(evaluation, {
      voteUpCount: 308,
      commentCount: 25,
      visibleComments: ["一眼 AI", "缺少独立增量"],
      interactionSignalScore: 8,
      source: "zhihu_open_platform_search",
    });

    expect(composed.publicReception.score).toBe(5);
    expect(composed.publicReception.commentObservationScore).toBe(3);
    expect(composed.publicReception.interactionSignalScore).toBe(8);
    expect(composed.publicReception.sampleLimitations).toContain(
      "仅分析开放平台返回的 2 条可见评论样本",
    );
    expect(composed.publicReception.reason).not.toContain("60%");
    expect(composed.publicReception.reason).not.toContain("40%");
    expect(composed.publicReception.reason).not.toContain("commentObservationScore");
    expect(composed.publicReception.reason).not.toContain("interactionSignalScore");
    expect(composed.publicReception.reason).toBe(
      "可见评论中同时存在认可与质疑，整体评价存在分歧，尚未形成明确共识。",
    );
    expect(composed.publicReception.evidence).toEqual([
      "评论质疑：质疑内容带有明显 AI 味道",
      "评论认可：认可其中的技术解释",
    ]);
  });

  test("uses public reception baseline 6.5 when comments are unavailable", () => {
    const evaluation = articleEvaluation();
    evaluation.publicReception.commentObservationScore = 3;
    evaluation.publicReception.interactionSignalScore = 10;

    const withoutReaction = applyPublicReceptionComposition(evaluation);
    expect(withoutReaction.publicReception.score).toBe(6.5);
    expect(withoutReaction.publicReception.commentObservationScore).toBe(6.5);
    expect(withoutReaction.publicReception.interactionSignalScore).toBe(6.5);
    expect(withoutReaction.publicReception.reason).toBe(
      "暂未取得足够的公开评论，舆论氛围按中性处理。",
    );

    const withVotesButNoComments = applyPublicReceptionComposition(evaluation, {
      voteUpCount: 308,
      commentCount: 25,
      visibleComments: [],
      interactionSignalScore: 8,
      source: "zhihu_open_platform_search",
    });
    expect(withVotesButNoComments.publicReception.score).toBe(6.5);
    expect(withVotesButNoComments.publicReception.commentObservationScore).toBe(6.5);
    expect(withVotesButNoComments.publicReception.interactionSignalScore).toBe(6.5);
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
