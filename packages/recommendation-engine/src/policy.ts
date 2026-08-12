export const recommendationPolicy = {
  baseDailyAllowance: 3,
  maximumDailyAllowance: 10,
  quotaConsumedOnSubmission: true,
  returnQuotaForInvalidSource: true,
  returnQuotaForQualityRejection: false,
  selfRecommendationReferralEligible: false,
  attributionBasis: "first_eligible_discovery",
  referralRequiresPublication: true,
  referralRequiresRevenue: true,
} as const;
