export const auditPolicy = {
  access: "invitation_only",
  minimumIndependentReviews: 2,
  hideRecommenderIdentity: true,
  hideRecommendationKind: true,
  disagreementResolution: "third_review_then_adjudication",
  rewardsDependOnReliability: true,
} as const;
