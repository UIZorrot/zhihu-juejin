import { type Static, Type } from "@sinclair/typebox";

export const RecommendationKindSchema = Type.Union([Type.Literal("self"), Type.Literal("other")]);

export type RecommendationKind = Static<typeof RecommendationKindSchema>;

export const RecommendationStatusSchema = Type.Union([
  Type.Literal("submitted"),
  Type.Literal("screening"),
  Type.Literal("audit_pending"),
  Type.Literal("accepted"),
  Type.Literal("published"),
  Type.Literal("rejected"),
  Type.Literal("withdrawn"),
]);

export type RecommendationStatus = Static<typeof RecommendationStatusSchema>;

export const RecommendationSubmissionSchema = Type.Object({
  contentUrl: Type.String({ format: "uri", maxLength: 2_000 }),
  kind: RecommendationKindSchema,
  reason: Type.String({ minLength: 20, maxLength: 1_000 }),
  targetFeedIds: Type.Array(Type.String({ minLength: 3, maxLength: 64 }), {
    minItems: 1,
    maxItems: 5,
    uniqueItems: true,
  }),
  conflictOfInterest: Type.Boolean(),
});

export type RecommendationSubmission = Static<typeof RecommendationSubmissionSchema>;

export const DailyRecommendationQuotaSchema = Type.Object({
  quotaDate: Type.String({ format: "date" }),
  allowance: Type.Integer({ minimum: 0, maximum: 100 }),
  used: Type.Integer({ minimum: 0, maximum: 100 }),
});

export type DailyRecommendationQuota = Static<typeof DailyRecommendationQuotaSchema>;
