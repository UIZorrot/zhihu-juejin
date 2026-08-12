import { describe, expect, test } from "bun:test";
import type { FullQualityEvaluation } from "@zhihu-juejin/llm-evaluator";
import { humanCalibrationCases } from "./calibration-cases";
import { decideFullQuality } from "./full-quality";

function evaluation(overrides: Partial<FullQualityEvaluation> = {}): FullQualityEvaluation {
  return {
    contentCoverage: "full",
    verdict: "excellent",
    depth: 80,
    originality: 75,
    thesisNovelty: 75,
    frontierAwareness: 75,
    firstHandEvidence: 70,
    practicalSpecificity: 75,
    claimVerifiability: 70,
    sourceTraceability: 70,
    comparativeRigor: 60,
    readability: 70,
    evidenceQuality: 75,
    decisionValue: 75,
    informationGain: 75,
    marketingRisk: 15,
    homogeneityRisk: 20,
    genericAiStyleRisk: 15,
    keyContributions: ["贡献"],
    supportingEvidence: ["证据"],
    weaknesses: [],
    factChecksNeeded: [],
    recommendedTopicIds: ["ai-agents"],
    confidence: 80,
    rationale: "有新信息和可核验证据。",
    ...overrides,
  };
}

describe("full quality admission", () => {
  test("publishes only an excellent result that clears every quality floor", () => {
    expect(decideFullQuality(evaluation())).toBe("publish");
    expect(decideFullQuality(evaluation({ verdict: "qualified" }))).toBe("human_audit");
    expect(decideFullQuality(evaluation({ thesisNovelty: 30 }))).toBe("human_audit");
    expect(decideFullQuality(evaluation({ evidenceQuality: 40 }))).toBe("human_audit");
  });

  test("rejects the human-calibrated low-value class", () => {
    const lowValue = evaluation({
      verdict: "low_value",
      depth: 30,
      thesisNovelty: 10,
      frontierAwareness: 20,
      firstHandEvidence: 5,
      practicalSpecificity: 20,
      claimVerifiability: 15,
      evidenceQuality: 20,
      informationGain: 10,
      marketingRisk: 70,
      genericAiStyleRisk: 85,
    });

    expect(decideFullQuality(lowValue)).toBe("reject");
    expect(humanCalibrationCases.length).toBeGreaterThanOrEqual(10);
    expect(
      humanCalibrationCases
        .filter((item) => item.expectedVerdict === "low_value" || item.expectedVerdict === "spam")
        .every((item) => item.expectedCorpusDecision === "reject"),
    ).toBe(true);
  });
});
