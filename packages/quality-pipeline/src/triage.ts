import type { NormalizedContent } from "@zhihu-juejin/contracts";
import type { PreviewTriage, PreviewTriageInput } from "@zhihu-juejin/llm-evaluator";

export interface PreviewEvaluatorPort {
  evaluate(input: PreviewTriageInput): Promise<PreviewTriage>;
}

export interface CandidateTriageRecord {
  contentId: string;
  evaluation: PreviewTriage;
  decision: PreviewTriageDecision;
  riskSignals: string[];
}

export type PreviewTriageDecision = "acquire_full_text" | "human_review" | "reject";

export interface PreviewAdmissionPolicy {
  acquireMinimumTopicRelevance: number;
  acquireMinimumLikelyDepth: number;
  acquireMinimumThesisNovelty: number;
  acquireMinimumEvidenceSpecificity: number;
  acquireMinimumFrontierAwareness: number;
  acquireMaximumSpamRisk: number;
  acquireMaximumGenericAiStyleRisk: number;
  rejectMaximumTopicRelevance: number;
  rejectMinimumSpamRisk: number;
  rejectMaximumThesisNovelty: number;
  rejectMaximumEvidenceSpecificity: number;
  rejectMinimumGenericAiStyleRisk: number;
  rejectShallowMaximumLikelyDepth: number;
  rejectShallowMaximumThesisNovelty: number;
  reviewMinimumRiskSignalCount: number;
}

export const previewAdmissionPolicy: Readonly<PreviewAdmissionPolicy> = {
  acquireMinimumTopicRelevance: 50,
  acquireMinimumLikelyDepth: 55,
  acquireMinimumThesisNovelty: 40,
  acquireMinimumEvidenceSpecificity: 40,
  acquireMinimumFrontierAwareness: 40,
  acquireMaximumSpamRisk: 69,
  acquireMaximumGenericAiStyleRisk: 69,
  rejectMaximumTopicRelevance: 24,
  rejectMinimumSpamRisk: 90,
  rejectMaximumThesisNovelty: 20,
  rejectMaximumEvidenceSpecificity: 30,
  rejectMinimumGenericAiStyleRisk: 75,
  rejectShallowMaximumLikelyDepth: 45,
  rejectShallowMaximumThesisNovelty: 39,
  reviewMinimumRiskSignalCount: 2,
};

const PREVIEW_RISK_PATTERNS: ReadonlyArray<{
  code: string;
  pattern: RegExp;
}> = [
  { code: "monetization-promise", pattern: /变现|赚钱|月入|副业|收入翻倍/iu },
  { code: "fomo-framing", pattern: /all[- ]?in|最值得|风口|错过|必须收藏/iu },
  { code: "formulaic-playbook", pattern: /\bSOP\b|保姆级|手把手|一文读懂|零基础/iu },
  { code: "mass-market-targeting", pattern: /普通人|小白|人人都能|新手必看/iu },
  { code: "lead-generation", pattern: /加微信|私信.{0,6}领取|免费领取|进群|训练营/iu },
  {
    code: "obvious-thesis-framing",
    pattern: /拐点.{0,6}(到来|已来)|时代.{0,6}(到来|已来)|未来已来|从.{1,20}到.{1,20}/iu,
  },
];

export function detectPreviewRiskSignals(title: string, excerpt: string): string[] {
  const text = `${title}\n${excerpt}`;
  return PREVIEW_RISK_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ code }) => code);
}

export function decidePreviewTriage(
  evaluation: PreviewTriage,
  riskSignals: readonly string[] = [],
  policy: Readonly<PreviewAdmissionPolicy> = previewAdmissionPolicy,
): PreviewTriageDecision {
  if (
    evaluation.topicRelevance <= policy.rejectMaximumTopicRelevance ||
    evaluation.spamRisk >= policy.rejectMinimumSpamRisk
  ) {
    return "reject";
  }
  if (riskSignals.includes("lead-generation")) {
    return "reject";
  }
  if (
    evaluation.thesisNovelty <= policy.rejectMaximumThesisNovelty &&
    evaluation.evidenceSpecificity <= policy.rejectMaximumEvidenceSpecificity &&
    evaluation.genericAiStyleRisk >= policy.rejectMinimumGenericAiStyleRisk
  ) {
    return "reject";
  }
  if (
    !evaluation.shouldAcquireFullText &&
    riskSignals.length >= policy.reviewMinimumRiskSignalCount &&
    evaluation.likelyDepth <= policy.rejectShallowMaximumLikelyDepth &&
    evaluation.thesisNovelty <= policy.rejectShallowMaximumThesisNovelty
  ) {
    return "reject";
  }
  if (riskSignals.length >= policy.reviewMinimumRiskSignalCount) {
    return "human_review";
  }
  if (
    evaluation.shouldAcquireFullText &&
    evaluation.topicRelevance >= policy.acquireMinimumTopicRelevance &&
    evaluation.likelyDepth >= policy.acquireMinimumLikelyDepth &&
    evaluation.thesisNovelty >= policy.acquireMinimumThesisNovelty &&
    evaluation.evidenceSpecificity >= policy.acquireMinimumEvidenceSpecificity &&
    evaluation.frontierAwareness >= policy.acquireMinimumFrontierAwareness &&
    evaluation.spamRisk <= policy.acquireMaximumSpamRisk &&
    evaluation.genericAiStyleRisk <= policy.acquireMaximumGenericAiStyleRisk
  ) {
    return "acquire_full_text";
  }
  return "human_review";
}

export async function triageDiscoveredCandidates(
  evaluator: PreviewEvaluatorPort,
  candidates: readonly NormalizedContent[],
  options: { maximumEvaluations: number },
): Promise<CandidateTriageRecord[]> {
  if (!Number.isInteger(options.maximumEvaluations) || options.maximumEvaluations < 0) {
    throw new RangeError("maximumEvaluations must be a non-negative integer");
  }

  const results: CandidateTriageRecord[] = [];
  for (const candidate of candidates.slice(0, options.maximumEvaluations)) {
    const riskSignals = detectPreviewRiskSignals(candidate.title, candidate.excerpt);
    const evaluation = await evaluator.evaluate({
      title: candidate.title,
      excerpt: candidate.excerpt,
      candidateTopicIds: candidate.candidateTopicIds,
      riskSignals,
    });
    results.push({
      contentId: candidate.id,
      evaluation,
      decision: decidePreviewTriage(evaluation, riskSignals),
      riskSignals,
    });
  }
  return results;
}
