import { describe, expect, test } from "bun:test";
import type { ArticleQualityEvaluation } from "@zhihu-juejin/llm-evaluator";
import { applyHumanScoreCalibration, calculateArticleScore } from "./article-score";

function evaluation(
  scores: Partial<
    Record<"evidence" | "practice" | "gain" | "professional" | "commercial" | "timeliness", number>
  >,
): ArticleQualityEvaluation {
  const dimension = (score: number) => ({ score, evidence: [], reason: "测试" });
  return {
    contentProfile: {
      primaryArchetype: "technical_scientific",
      effortScore: 7,
      effortSignals: [],
      effortLimitations: [],
    },
    evidenceAndTruthfulness: {
      ...dimension(scores.evidence ?? 7),
      verifiedSources: [],
      unsupportedClaims: [],
      comparisonChecks: [],
    },
    practiceAndExperience: {
      ...dimension(scores.practice ?? 7),
      practiceSignals: [],
      tacitExperienceSignals: [],
      genericExperience: [],
    },
    informationGainAndDepth: {
      ...dimension(scores.gain ?? 7),
      beyondBaseline: [],
      overlapsBaseline: [],
    },
    professionalismAndOriginality: {
      ...dimension(scores.professional ?? 7),
      domainSignals: [],
      originalInsights: [],
      technicalProblems: [],
      boundaryAwareness: [],
    },
    commercialIndependence: {
      ...dimension(scores.commercial ?? 10),
      promotionalSignals: [],
      contentFarmSignals: [],
    },
    timelinessValue: {
      ...dimension(scores.timeliness ?? 5),
      timeSensitive: false,
      freshnessBasis: "时间中性",
    },
    factualProblems: [],
    flags: [],
    confidence: 80,
    summary: "测试",
  };
}

describe("calculateArticleScore", () => {
  test("uses weighted ten-point dimensions and rounds to half points", () => {
    const result = calculateArticleScore(
      evaluation({ evidence: 9, practice: 7, gain: 7.5, commercial: 8, timeliness: 7 }),
    );
    expect(result.uncappedScore).toBe(7.5);
    expect(result.finalScore).toBe(7.5);
    expect(result.decision).toBe("retain");
  });

  test("caps unsupported content even when stylistic dimensions are high", () => {
    const input = evaluation({
      evidence: 4,
      practice: 4,
      gain: 9,
      professional: 4,
      commercial: 10,
      timeliness: 10,
    });
    const result = calculateArticleScore(input);
    expect(result.uncappedScore).toBe(6);
    expect(result.finalScore).toBe(4);
    expect(result.capReasons).toContain("既无可靠证据或经验，也无专业原创判断");
  });

  test("does not cap a professional original commentary for lacking an experiment", () => {
    const input = evaluation({ evidence: 4, practice: 4, professional: 8, gain: 9 });
    const result = calculateArticleScore(input);
    expect(result.appliedCap).toBeNull();
    expect(result.finalScore).toBe(6);
  });

  test("deducts one point for every dimension at or below six on obvious promotion", () => {
    const input = evaluation({ evidence: 8, practice: 8, gain: 8, commercial: 0, timeliness: 6 });
    input.flags = ["PURE_LEAD_GENERATION"];
    const result = calculateArticleScore(input);
    expect(result.finalScore).toBe(4);
    expect(result.capReasons).toContain("检测到商业推广；2 个维度不高于 6 分，各扣 1 分");
    expect(result.decision).toBe("low_value");
  });

  test("can reduce low-quality promotion to zero", () => {
    const input = evaluation({
      evidence: 4,
      practice: 4,
      gain: 4,
      professional: 4,
      commercial: 0,
      timeliness: 5,
    });
    input.flags = ["PURE_LEAD_GENERATION"];
    const result = calculateArticleScore(input);
    expect(result.finalScore).toBe(0);
    expect(result.appliedCap).toBe(0);
  });

  test("includes the zero commercial dimension in the extra deduction", () => {
    const input = evaluation({
      evidence: 8,
      practice: 8,
      gain: 8,
      professional: 8,
      commercial: 0,
      timeliness: 7,
    });
    input.flags = ["PURE_LEAD_GENERATION"];
    const result = calculateArticleScore(input);
    expect(result.finalScore).toBe(5);
    expect(result.capReasons).toEqual(["检测到商业推广；1 个维度不高于 6 分，各扣 1 分"]);
  });

  test("scores the Buffett promotion example at one", () => {
    const input = evaluation({
      evidence: 6.5,
      practice: 3.5,
      gain: 5.5,
      professional: 5.5,
      commercial: 0,
      timeliness: 5,
    });
    input.flags = ["PURE_LEAD_GENERATION"];
    const result = calculateArticleScore(input);
    expect(result.uncappedScore).toBe(4.5);
    expect(result.finalScore).toBe(1);
    expect(result.appliedCap).toBe(1);
    expect(result.capReasons).toEqual(["检测到商业推广；5 个维度不高于 6 分，各扣 1 分"]);
  });

  test("lets ordinary promotion lower the weighted score without a hard limit", () => {
    const input = evaluation({ evidence: 7, practice: 7, gain: 7, professional: 7, commercial: 4 });
    const result = calculateArticleScore(input);
    expect(result.appliedCap).toBeNull();
    expect(result.finalScore).toBe(6.5);
  });

  test("does not apply an unsupported-comparison cap to a high evidence score", () => {
    const input = evaluation({
      evidence: 8.5,
      practice: 6.5,
      gain: 8,
      commercial: 9,
      timeliness: 9,
    });
    input.flags = ["UNSUPPORTED_DEEP_COMPARISON"];
    const result = calculateArticleScore(input);
    expect(result.uncappedScore).toBe(8);
    expect(result.finalScore).toBe(8);
    expect(result.appliedCap).toBeNull();
  });

  test("uses a recorded human score while preserving the model result", () => {
    const modelResult = calculateArticleScore(
      evaluation({ evidence: 8, practice: 8, gain: 8, professional: 8 }),
    );
    const result = applyHumanScoreCalibration(modelResult, {
      score: 6.5,
      range: { minimum: 6, maximum: 6.5 },
      recordedAt: "2026-08-11",
    });
    expect(result.finalScore).toBe(6.5);
    expect(result.modelFinalScore).toBe(8);
    expect(result.decision).toBe("retain");
    expect(result.humanCalibration).toEqual({
      minimum: 6,
      maximum: 6.5,
      recordedAt: "2026-08-11",
    });
  });

  test("does not treat missing verification as a major factual-error cap", () => {
    const input = evaluation({ evidence: 4, practice: 6, professional: 6 });
    input.factualProblems = [
      {
        severity: "major",
        problem: "某段人物经历尚未核验",
        basis: "外部搜索没有找到",
        contradictingEvidence: [],
      },
    ];
    const result = calculateArticleScore(input);
    expect(result.capReasons).not.toContain("存在关键事实错误");
  });

  test("caps a major factual error only when contrary evidence is present", () => {
    const input = evaluation({ evidence: 4, practice: 6, professional: 6 });
    input.factualProblems = [
      {
        severity: "major",
        problem: "关键日期与官方记录冲突",
        basis: "官方记录给出了不同日期",
        contradictingEvidence: ["https://example.com/official-record"],
      },
    ];
    expect(calculateArticleScore(input).finalScore).toBe(2);
  });
});
