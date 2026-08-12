import type { RecommendationStatus } from "@zhihu-juejin/contracts";

const ALLOWED_TRANSITIONS: Record<RecommendationStatus, readonly RecommendationStatus[]> = {
  submitted: ["screening", "withdrawn"],
  screening: ["audit_pending", "rejected", "withdrawn"],
  audit_pending: ["accepted", "rejected", "withdrawn"],
  accepted: ["published", "withdrawn"],
  published: ["withdrawn"],
  rejected: [],
  withdrawn: [],
};

export function canTransitionRecommendation(
  from: RecommendationStatus,
  to: RecommendationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
