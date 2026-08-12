import type { FullQualityEvaluation } from "@zhihu-juejin/llm-evaluator";

export type FullQualityDecision = "publish" | "human_audit" | "reject";

export interface FullQualityAdmissionPolicy {
  publishMinimumDepth: number;
  publishMinimumThesisNovelty: number;
  publishMinimumEvidenceQuality: number;
  publishMinimumInformationGain: number;
  publishMinimumPracticalSpecificity: number;
  publishMinimumClaimVerifiability: number;
  publishMinimumSourceTraceability: number;
  publishMinimumReadability: number;
  publishMaximumMarketingRisk: number;
  publishMaximumGenericAiStyleRisk: number;
}

export const fullQualityAdmissionPolicy: Readonly<FullQualityAdmissionPolicy> = {
  publishMinimumDepth: 65,
  publishMinimumThesisNovelty: 55,
  publishMinimumEvidenceQuality: 60,
  publishMinimumInformationGain: 60,
  publishMinimumPracticalSpecificity: 55,
  publishMinimumClaimVerifiability: 55,
  publishMinimumSourceTraceability: 50,
  publishMinimumReadability: 50,
  publishMaximumMarketingRisk: 49,
  publishMaximumGenericAiStyleRisk: 59,
};

export function decideFullQuality(
  evaluation: FullQualityEvaluation,
  policy: Readonly<FullQualityAdmissionPolicy> = fullQualityAdmissionPolicy,
): FullQualityDecision {
  if (evaluation.verdict === "spam" || evaluation.verdict === "low_value") {
    return "reject";
  }
  if (
    evaluation.verdict === "excellent" &&
    evaluation.depth >= policy.publishMinimumDepth &&
    evaluation.thesisNovelty >= policy.publishMinimumThesisNovelty &&
    evaluation.evidenceQuality >= policy.publishMinimumEvidenceQuality &&
    evaluation.informationGain >= policy.publishMinimumInformationGain &&
    evaluation.practicalSpecificity >= policy.publishMinimumPracticalSpecificity &&
    evaluation.claimVerifiability >= policy.publishMinimumClaimVerifiability &&
    evaluation.sourceTraceability >= policy.publishMinimumSourceTraceability &&
    evaluation.readability >= policy.publishMinimumReadability &&
    evaluation.marketingRisk <= policy.publishMaximumMarketingRisk &&
    evaluation.genericAiStyleRisk <= policy.publishMaximumGenericAiStyleRisk
  ) {
    return "publish";
  }
  return "human_audit";
}
