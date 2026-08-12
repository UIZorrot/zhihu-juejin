import type { ArticleQualityEvaluation } from "@zhihu-juejin/llm-evaluator";

export const articleScoreWeights = {
  evidenceAndTruthfulness: 0.25,
  practiceAndExperience: 0.15,
  informationGainAndDepth: 0.25,
  professionalismAndOriginality: 0.15,
  timelinessValue: 0.1,
  publicReception: 0.1,
} as const;

export type ArticleScoreDecision = "excellent" | "retain" | "low_value" | "reject";

export interface ArticleScoreResult {
  finalScore: number;
  uncappedScore: number;
  decision: ArticleScoreDecision;
  appliedCap: number | null;
  capReasons: string[];
  weights: typeof articleScoreWeights;
  commercialDeduction: number;
  modelFinalScore?: number;
  humanCalibration?: {
    minimum: number;
    maximum: number;
    recordedAt?: string;
  };
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function decideFromScore(score: number): ArticleScoreDecision {
  return score >= 8 ? "excellent" : score >= 6 ? "retain" : score >= 4 ? "low_value" : "reject";
}

const ARTICLE_DIMENSION_KEYS = [
  "evidenceAndTruthfulness",
  "practiceAndExperience",
  "informationGainAndDepth",
  "professionalismAndOriginality",
  "timelinessValue",
  "publicReception",
] as const;

function countDimensionsAtOrBelowSix(evaluation: ArticleQualityEvaluation): number {
  return ARTICLE_DIMENSION_KEYS.filter((key) => evaluation[key].score <= 6).length;
}

export function applyHumanScoreCalibration(
  result: ArticleScoreResult,
  calibration: {
    score: number;
    range?: { minimum: number; maximum: number };
    recordedAt?: string;
  },
): ArticleScoreResult {
  const finalScore = roundToHalf(calibration.score);
  const range = calibration.range ?? { minimum: finalScore, maximum: finalScore };
  return {
    ...result,
    finalScore,
    decision: decideFromScore(finalScore),
    modelFinalScore: result.finalScore,
    humanCalibration: {
      minimum: range.minimum,
      maximum: range.maximum,
      ...(calibration.recordedAt ? { recordedAt: calibration.recordedAt } : {}),
    },
  };
}

export function calculateArticleScore(evaluation: ArticleQualityEvaluation): ArticleScoreResult {
  const uncappedScore = roundToHalf(
    evaluation.evidenceAndTruthfulness.score * articleScoreWeights.evidenceAndTruthfulness +
      evaluation.practiceAndExperience.score * articleScoreWeights.practiceAndExperience +
      evaluation.informationGainAndDepth.score * articleScoreWeights.informationGainAndDepth +
      evaluation.professionalismAndOriginality.score *
        articleScoreWeights.professionalismAndOriginality +
      evaluation.timelinessValue.score * articleScoreWeights.timelinessValue +
      evaluation.publicReception.score * articleScoreWeights.publicReception,
  );

  const caps: Array<{ maximum: number; reason: string }> = [];
  if (evaluation.flags.includes("PURE_LEAD_GENERATION")) {
    const deductionCount = countDimensionsAtOrBelowSix(evaluation);
    caps.push({
      maximum: Math.max(0, 6 - deductionCount),
      reason: `检测到商业推广；${deductionCount} 个维度不高于 6 分，各扣 1 分`,
    });
  }
  if (evaluation.flags.includes("FAKE_OR_INVALID_CITATION")) {
    caps.push({ maximum: 2, reason: "引用不存在、失效或与论断不符" });
  }
  if (
    evaluation.factualProblems.some(
      (problem) => problem.severity === "major" && problem.contradictingEvidence.length > 0,
    )
  ) {
    caps.push({ maximum: 2, reason: "存在关键事实错误" });
  }
  if (
    evaluation.flags.includes("UNSUPPORTED_DEEP_COMPARISON") &&
    evaluation.evidenceAndTruthfulness.score <= 4
  ) {
    caps.push({ maximum: 4, reason: "声称深度对比但没有来源、版本或方法" });
  }
  if (
    evaluation.evidenceAndTruthfulness.score <= 4 &&
    evaluation.practiceAndExperience.score <= 4 &&
    evaluation.professionalismAndOriginality.score <= 4
  ) {
    caps.push({ maximum: 4, reason: "既无可靠证据或经验，也无专业原创判断" });
  }

  const appliedCap = caps.length > 0 ? Math.min(...caps.map((cap) => cap.maximum)) : null;
  const commercialDeduction = evaluation.flags.includes("PURE_LEAD_GENERATION")
    ? 0
    : evaluation.commercialIndependence.score >= 9.5
      ? 0
      : evaluation.commercialIndependence.score >= 7
        ? 0.5
        : evaluation.commercialIndependence.score >= 4
          ? 1
          : 2;
  const commercialStartingScore = evaluation.flags.includes("PURE_LEAD_GENERATION")
    ? Math.max(0, 6 - countDimensionsAtOrBelowSix(evaluation))
    : Math.max(0, uncappedScore - commercialDeduction);
  const finalScore = roundToHalf(
    Math.max(
      0,
      Math.min(
        10,
        appliedCap === null
          ? (commercialStartingScore ?? uncappedScore)
          : Math.min(commercialStartingScore ?? uncappedScore, appliedCap),
      ),
    ),
  );

  const decision = decideFromScore(finalScore);

  return {
    finalScore,
    uncappedScore,
    decision,
    appliedCap,
    capReasons: caps.filter((cap) => cap.maximum === appliedCap).map((cap) => cap.reason),
    weights: articleScoreWeights,
    commercialDeduction,
  };
}
