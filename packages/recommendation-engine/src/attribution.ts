import type { RecommendationKind, RecommendationStatus } from "@zhihu-juejin/contracts";

export interface ReferralCandidate {
  recommendationId: string;
  recommenderUserId: string;
  contentAuthorUserId?: string;
  kind: RecommendationKind;
  status: RecommendationStatus;
  submittedAt: string;
  conflictOfInterest: boolean;
  accountEligibleForRewards: boolean;
}

export interface ReferralAttribution {
  recommendationId: string;
  beneficiaryUserId: string;
  basis: "first_eligible_discovery";
}

export function selectReferralAttribution(
  candidates: ReferralCandidate[],
): ReferralAttribution | undefined {
  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.kind === "other" &&
        (candidate.status === "accepted" || candidate.status === "published") &&
        !candidate.conflictOfInterest &&
        candidate.accountEligibleForRewards &&
        candidate.recommenderUserId !== candidate.contentAuthorUserId,
    )
    .sort((left, right) => {
      const timestampDifference =
        new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
      return timestampDifference || left.recommendationId.localeCompare(right.recommendationId);
    });

  const winner = eligible[0];
  return winner
    ? {
        recommendationId: winner.recommendationId,
        beneficiaryUserId: winner.recommenderUserId,
        basis: "first_eligible_discovery",
      }
    : undefined;
}
