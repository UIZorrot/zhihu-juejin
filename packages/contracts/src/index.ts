import { type Static, Type } from "@sinclair/typebox";

export * from "./audits";
export * from "./recommendations";

export const FeedIdSchema = Type.String({
  minLength: 3,
  maxLength: 64,
  pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
});

export const FeedManifestSchema = Type.Object({
  id: FeedIdSchema,
  displayName: Type.String({ minLength: 1, maxLength: 80 }),
  description: Type.String({ minLength: 1, maxLength: 500 }),
  source: Type.Literal("zhihu"),
  queries: Type.Array(Type.String({ minLength: 1, maxLength: 100 }), {
    minItems: 1,
    maxItems: 50,
    uniqueItems: true,
  }),
  negativeKeywords: Type.Array(Type.String({ minLength: 1, maxLength: 50 }), {
    maxItems: 100,
    uniqueItems: true,
  }),
  freshnessDays: Type.Integer({ minimum: 1, maximum: 3650 }),
  maxResultsPerQuery: Type.Integer({ minimum: 1, maximum: 10 }),
  scoringVersion: Type.String({ minLength: 1, maxLength: 40 }),
});

export type FeedManifest = Static<typeof FeedManifestSchema>;

export const NormalizedContentSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  source: Type.Literal("zhihu"),
  sourceContentId: Type.String({ minLength: 1 }),
  contentType: Type.Union([
    Type.Literal("article"),
    Type.Literal("answer"),
    Type.Literal("question"),
    Type.Literal("other"),
  ]),
  canonicalUrl: Type.String({ format: "uri" }),
  title: Type.String(),
  excerpt: Type.String(),
  author: Type.Object({
    displayName: Type.String(),
    avatarUrl: Type.Optional(Type.String({ format: "uri" })),
    provisionalIdentityKey: Type.String({ minLength: 64, maxLength: 64 }),
  }),
  metrics: Type.Object({
    likes: Type.Integer({ minimum: 0 }),
    comments: Type.Integer({ minimum: 0 }),
  }),
  authorityLevel: Type.Optional(Type.Integer({ minimum: 0 })),
  updatedAt: Type.Optional(Type.String({ format: "date-time" })),
  discoveredBy: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true }),
  candidateTopicIds: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
});

export type NormalizedContent = Static<typeof NormalizedContentSchema>;

export const DiscoveryResultSchema = Type.Object({
  feedId: FeedIdSchema,
  manifestVersion: Type.String(),
  fetchedAt: Type.String({ format: "date-time" }),
  fetchedCount: Type.Integer({ minimum: 0 }),
  uniqueCount: Type.Integer({ minimum: 0 }),
  filteredCount: Type.Integer({ minimum: 0 }),
  candidates: Type.Array(NormalizedContentSchema),
});

export type DiscoveryResult = Static<typeof DiscoveryResultSchema>;
