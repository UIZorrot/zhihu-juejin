import type { DailyRecommendationQuota, RecommendationKind } from "@zhihu-juejin/contracts";

export type RecommendationRejectionReason =
  | "DAILY_QUOTA_EXHAUSTED"
  | "DUPLICATE_RECOMMENDATION"
  | "RELATIONSHIP_MISMATCH"
  | "UNDISCLOSED_CONFLICT";

export interface RecommendationRequestContext {
  recommenderUserId: string;
  contentAuthorUserId?: string;
  kind: RecommendationKind;
  conflictOfInterest: boolean;
  conflictWasDisclosed: boolean;
  alreadyRecommendedByUser: boolean;
  quota: DailyRecommendationQuota;
}

export type RecommendationAdmissionDecision =
  | {
      admitted: true;
      updatedQuota: DailyRecommendationQuota;
      referralEligible: boolean;
    }
  | {
      admitted: false;
      reason: RecommendationRejectionReason;
      updatedQuota: DailyRecommendationQuota;
    };

export function evaluateRecommendationAdmission(
  context: RecommendationRequestContext,
): RecommendationAdmissionDecision {
  if (context.alreadyRecommendedByUser) {
    return {
      admitted: false,
      reason: "DUPLICATE_RECOMMENDATION",
      updatedQuota: context.quota,
    };
  }

  const isKnownAuthor = context.contentAuthorUserId === context.recommenderUserId;
  if (
    context.contentAuthorUserId !== undefined &&
    ((context.kind === "self" && !isKnownAuthor) || (context.kind === "other" && isKnownAuthor))
  ) {
    return {
      admitted: false,
      reason: "RELATIONSHIP_MISMATCH",
      updatedQuota: context.quota,
    };
  }

  if (context.conflictOfInterest && !context.conflictWasDisclosed) {
    return {
      admitted: false,
      reason: "UNDISCLOSED_CONFLICT",
      updatedQuota: context.quota,
    };
  }

  if (context.quota.used >= context.quota.allowance) {
    return {
      admitted: false,
      reason: "DAILY_QUOTA_EXHAUSTED",
      updatedQuota: context.quota,
    };
  }

  return {
    admitted: true,
    updatedQuota: {
      ...context.quota,
      used: context.quota.used + 1,
    },
    referralEligible: context.kind === "other" && !isKnownAuthor && !context.conflictOfInterest,
  };
}
