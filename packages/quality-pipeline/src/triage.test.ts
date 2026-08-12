import { describe, expect, test } from "bun:test";
import type { NormalizedContent } from "@zhihu-juejin/contracts";
import {
  decidePreviewTriage,
  detectPreviewRiskSignals,
  triageDiscoveredCandidates,
} from "./triage";

const candidate: NormalizedContent = {
  id: "zhihu:article:1",
  source: "zhihu",
  sourceContentId: "1",
  contentType: "article",
  canonicalUrl: "https://zhuanlan.zhihu.com/p/1",
  title: "Agent 评测",
  excerpt: "包含评测数据",
  author: {
    displayName: "作者",
    provisionalIdentityKey: "a".repeat(64),
  },
  metrics: { likes: 1, comments: 0 },
  discoveredBy: ["Agent 评测"],
  candidateTopicIds: ["agent-evaluation"],
};

describe("triageDiscoveredCandidates", () => {
  test("uses LLM preview evaluation as the quality gate after deterministic cleaning", async () => {
    const results = await triageDiscoveredCandidates(
      {
        evaluate: async (input) => ({
          contentCoverage: "summary",
          topicRelevance: input.candidateTopicIds.length > 0 ? 90 : 0,
          likelyDepth: 75,
          noveltyPotential: 70,
          thesisNovelty: 70,
          evidenceSpecificity: 75,
          frontierAwareness: 70,
          firstHandSignal: 60,
          genericAiStyleRisk: 10,
          spamRisk: 5,
          shouldAcquireFullText: true,
          targetTopicIds: [...input.candidateTopicIds],
          reasonCodes: ["EVIDENCE_SIGNAL"],
          rationale: "摘要显示具体评测数据。",
        }),
      },
      [candidate],
      { maximumEvaluations: 1 },
    );

    expect(results[0]?.contentId).toBe(candidate.id);
    expect(results[0]?.evaluation.shouldAcquireFullText).toBe(true);
    expect(results[0]?.decision).toBe("acquire_full_text");
  });

  test("rejects only clear spam or irrelevance and holds ambiguous summaries", () => {
    const base = {
      contentCoverage: "summary" as const,
      topicRelevance: 80,
      likelyDepth: 70,
      noveltyPotential: 50,
      thesisNovelty: 60,
      evidenceSpecificity: 65,
      frontierAwareness: 65,
      firstHandSignal: 50,
      genericAiStyleRisk: 10,
      spamRisk: 10,
      shouldAcquireFullText: true,
      targetTopicIds: [],
      reasonCodes: [],
      rationale: "test",
    };

    expect(decidePreviewTriage(base)).toBe("acquire_full_text");
    expect(decidePreviewTriage({ ...base, spamRisk: 90 })).toBe("reject");
    expect(decidePreviewTriage({ ...base, topicRelevance: 24 })).toBe("reject");
    expect(decidePreviewTriage({ ...base, spamRisk: 75 })).toBe("human_review");
    expect(decidePreviewTriage({ ...base, shouldAcquireFullText: false })).toBe("human_review");

    const marketingSignals = detectPreviewRiskSignals(
      "普通人 90 天变现 SOP：最值得 All-in 的项目",
      "包含六个项目介绍",
    );
    expect(marketingSignals).toEqual([
      "monetization-promise",
      "fomo-framing",
      "formulaic-playbook",
      "mass-market-targeting",
    ]);
    expect(decidePreviewTriage(base, marketingSignals)).toBe("human_review");

    const leadGenerationSignals = detectPreviewRiskSignals("资料免费领取", "请私信领取");
    expect(decidePreviewTriage(base, leadGenerationSignals)).toBe("reject");

    const obviousThesisSignals = detectPreviewRiskSignals(
      "从能说话到能干活：AI Agent 的拐点已经到来",
      "普通人的新机会",
    );
    expect(obviousThesisSignals).toEqual(["mass-market-targeting", "obvious-thesis-framing"]);
    expect(decidePreviewTriage(base, obviousThesisSignals)).toBe("human_review");

    expect(
      decidePreviewTriage(
        {
          ...base,
          likelyDepth: 40,
          thesisNovelty: 30,
          shouldAcquireFullText: false,
        },
        obviousThesisSignals,
      ),
    ).toBe("reject");

    expect(
      decidePreviewTriage({
        ...base,
        thesisNovelty: 15,
        evidenceSpecificity: 25,
        genericAiStyleRisk: 85,
      }),
    ).toBe("reject");
  });
});
