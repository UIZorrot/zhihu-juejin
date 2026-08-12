import { type Static, Type } from "@sinclair/typebox";

const ScoreSchema = Type.Integer({ minimum: 0, maximum: 100 });
const TenPointScoreSchema = Type.Number({ minimum: 0, maximum: 10, multipleOf: 0.5 });

export const PreviewTriageSchema = Type.Object({
  contentCoverage: Type.Literal("summary"),
  topicRelevance: ScoreSchema,
  likelyDepth: ScoreSchema,
  noveltyPotential: ScoreSchema,
  thesisNovelty: ScoreSchema,
  evidenceSpecificity: ScoreSchema,
  frontierAwareness: ScoreSchema,
  firstHandSignal: ScoreSchema,
  genericAiStyleRisk: ScoreSchema,
  spamRisk: ScoreSchema,
  shouldAcquireFullText: Type.Boolean(),
  targetTopicIds: Type.Array(Type.String({ minLength: 1 }), { maxItems: 10 }),
  reasonCodes: Type.Array(Type.String({ minLength: 1, maxLength: 80 }), { maxItems: 10 }),
  rationale: Type.String({ minLength: 1, maxLength: 1_000 }),
});

export type PreviewTriage = Static<typeof PreviewTriageSchema>;

export const FullQualityEvaluationSchema = Type.Object({
  contentCoverage: Type.Literal("full"),
  verdict: Type.Union([
    Type.Literal("excellent"),
    Type.Literal("qualified"),
    Type.Literal("low_value"),
    Type.Literal("spam"),
  ]),
  depth: ScoreSchema,
  originality: ScoreSchema,
  thesisNovelty: ScoreSchema,
  frontierAwareness: ScoreSchema,
  firstHandEvidence: ScoreSchema,
  practicalSpecificity: ScoreSchema,
  claimVerifiability: ScoreSchema,
  sourceTraceability: ScoreSchema,
  comparativeRigor: ScoreSchema,
  readability: ScoreSchema,
  evidenceQuality: ScoreSchema,
  decisionValue: ScoreSchema,
  informationGain: ScoreSchema,
  marketingRisk: ScoreSchema,
  homogeneityRisk: ScoreSchema,
  genericAiStyleRisk: ScoreSchema,
  keyContributions: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  supportingEvidence: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  weaknesses: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  factChecksNeeded: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 20 }),
  recommendedTopicIds: Type.Array(Type.String({ minLength: 1 }), { maxItems: 10 }),
  confidence: ScoreSchema,
  rationale: Type.String({ minLength: 1, maxLength: 2_000 }),
});

export type FullQualityEvaluation = Static<typeof FullQualityEvaluationSchema>;

export const BlindBaselineSchema = Type.Object({
  question: Type.String({ minLength: 1, maxLength: 300 }),
  answer: Type.String({ minLength: 1, maxLength: 3_000 }),
  genericPoints: Type.Array(Type.String({ minLength: 1, maxLength: 300 }), { maxItems: 12 }),
});

export type BlindBaseline = Static<typeof BlindBaselineSchema>;

export const BaselineComparisonSchema = Type.Object({
  reconstructablePercentage: Type.Integer({ minimum: 0, maximum: 100 }),
  reconstructablePoints: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
    maxItems: 12,
  }),
  presentationOnlyPoints: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
    maxItems: 12,
  }),
  incrementalPoints: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 12 }),
  genericAiStyleSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
    maxItems: 12,
  }),
  informationGainCeiling: TenPointScoreSchema,
  originalityCeiling: TenPointScoreSchema,
  reason: Type.String({ minLength: 1, maxLength: 1_000 }),
});

export type BaselineComparison = Static<typeof BaselineComparisonSchema>;

const DimensionSchema = Type.Object({
  score: TenPointScoreSchema,
  evidence: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), { maxItems: 12 }),
  reason: Type.String({ minLength: 1, maxLength: 1_000 }),
});

export const ContentArchetypeSchema = Type.Union([
  Type.Literal("technical_scientific"),
  Type.Literal("social_commentary"),
  Type.Literal("personal_experience"),
  Type.Literal("historical_narrative"),
  Type.Literal("news_report"),
  Type.Literal("entertainment_culture"),
  Type.Literal("other"),
]);

export const ArticleQualityEvaluationSchema = Type.Object({
  contentProfile: Type.Object({
    primaryArchetype: ContentArchetypeSchema,
    effortScore: TenPointScoreSchema,
    effortSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
      maxItems: 12,
    }),
    effortLimitations: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
      maxItems: 12,
    }),
  }),
  evidenceAndTruthfulness: Type.Intersect([
    DimensionSchema,
    Type.Object({
      verifiedSources: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      unsupportedClaims: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      comparisonChecks: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  practiceAndExperience: Type.Intersect([
    DimensionSchema,
    Type.Object({
      practiceSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      tacitExperienceSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      genericExperience: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  informationGainAndDepth: Type.Intersect([
    DimensionSchema,
    Type.Object({
      beyondBaseline: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      overlapsBaseline: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  professionalismAndOriginality: Type.Intersect([
    DimensionSchema,
    Type.Object({
      domainSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      originalInsights: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      technicalProblems: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      boundaryAwareness: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  commercialIndependence: Type.Intersect([
    DimensionSchema,
    Type.Object({
      promotionalSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      contentFarmSignals: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  timelinessValue: Type.Intersect([
    DimensionSchema,
    Type.Object({
      timeSensitive: Type.Boolean(),
      freshnessBasis: Type.String({ minLength: 1, maxLength: 500 }),
    }),
  ]),
  publicReception: Type.Intersect([
    DimensionSchema,
    Type.Object({
      commentObservationScore: TenPointScoreSchema,
      interactionSignalScore: TenPointScoreSchema,
      positiveObservations: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      criticalObservations: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
      sampleLimitations: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 12,
      }),
    }),
  ]),
  factualProblems: Type.Array(
    Type.Object({
      severity: Type.Union([Type.Literal("minor"), Type.Literal("major")]),
      problem: Type.String({ minLength: 1, maxLength: 500 }),
      basis: Type.String({ minLength: 1, maxLength: 500 }),
      contradictingEvidence: Type.Array(Type.String({ minLength: 1, maxLength: 500 }), {
        maxItems: 3,
      }),
    }),
    { maxItems: 12 },
  ),
  flags: Type.Array(
    Type.Union([
      Type.Literal("PURE_LEAD_GENERATION"),
      Type.Literal("FAKE_OR_INVALID_CITATION"),
      Type.Literal("UNSUPPORTED_DEEP_COMPARISON"),
    ]),
    { maxItems: 3 },
  ),
  confidence: Type.Integer({ minimum: 0, maximum: 100 }),
  summary: Type.String({ minLength: 1, maxLength: 1_000 }),
});

export type ArticleQualityEvaluation = Static<typeof ArticleQualityEvaluationSchema>;
