import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const auditorStatus = pgEnum("auditor_status", [
  "invited",
  "training",
  "active",
  "senior",
  "adjudicator",
  "suspended",
]);

export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

export const recommendationKind = pgEnum("recommendation_kind", ["self", "other"]);

export const recommendationStatus = pgEnum("recommendation_status", [
  "submitted",
  "screening",
  "audit_pending",
  "accepted",
  "published",
  "rejected",
  "withdrawn",
]);

export const auditTaskStatus = pgEnum("audit_task_status", [
  "open",
  "third_review_required",
  "adjudication_required",
  "resolved",
  "cancelled",
]);

export const auditRole = pgEnum("audit_role", ["reviewer", "third_reviewer", "adjudicator"]);

export const auditVerdict = pgEnum("audit_verdict", [
  "excellent",
  "qualified",
  "low_value",
  "spam",
]);

export const ledgerEntryStatus = pgEnum("ledger_entry_status", [
  "pending",
  "available",
  "paid",
  "reversed",
]);

export const rewardSourceType = pgEnum("reward_source_type", ["audit", "referral"]);

export const attributionStatus = pgEnum("attribution_status", ["eligible", "active", "revoked"]);

export const ingestionRunStatus = pgEnum("ingestion_run_status", [
  "planned",
  "running",
  "completed",
  "partial",
  "failed",
]);

export const contentCoverage = pgEnum("content_coverage", ["summary", "full"]);

export const evaluationStage = pgEnum("evaluation_stage", ["preview_triage", "full_quality"]);

export const evaluationStatus = pgEnum("evaluation_status", [
  "pending",
  "completed",
  "invalid_output",
  "failed",
]);

export const creatorStatus = pgEnum("creator_status", [
  "provisional",
  "watch",
  "trusted",
  "commercial_risk",
  "suppressed",
]);

export const creatorExpansionPriority = pgEnum("creator_expansion_priority", [
  "high",
  "standard",
  "watch",
]);

export const creatorExpansionStatus = pgEnum("creator_expansion_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const topicNodes = pgTable(
  "topic_nodes",
  {
    id: varchar("id", { length: 128 }).primaryKey(),
    parentId: varchar("parent_id", { length: 128 }),
    level: varchar("level", { length: 16 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    priority: integer("priority").notNull(),
    cadence: varchar("cadence", { length: 32 }).notNull(),
    taxonomyVersion: varchar("taxonomy_version", { length: 64 }).notNull(),
    recentQueryShareBasisPoints: integer("recent_query_share_basis_points"),
    recentWindowDays: integer("recent_window_days"),
    historicalMaximumAgeDays: integer("historical_maximum_age_days"),
    decayHalfLifeDays: integer("decay_half_life_days"),
    active: boolean("active").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("topic_nodes_parent_idx").on(table.parentId)],
);

export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 32 }).notNull(),
    runType: varchar("run_type", { length: 32 }).notNull(),
    status: ingestionRunStatus("status").notNull().default("planned"),
    planVersion: varchar("plan_version", { length: 64 }).notNull(),
    queryCount: integer("query_count").notNull(),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ingestion_runs_status_created_idx").on(table.status, table.createdAt)],
);

export const sourceFetches = pgTable(
  "source_fetches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ingestionRuns.id),
    topicId: varchar("topic_id", { length: 128 }).references(() => topicNodes.id),
    query: varchar("query", { length: 300 }).notNull(),
    freshnessIntent: varchar("freshness_intent", { length: 16 }).notNull(),
    minimumSourceEditTime: timestamp("minimum_source_edit_time", { withTimezone: true }),
    requestFingerprint: varchar("request_fingerprint", { length: 64 }).notNull(),
    httpStatus: integer("http_status"),
    itemCount: integer("item_count").notNull().default(0),
    latencyMs: integer("latency_ms"),
    rawResponse: jsonb("raw_response"),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("source_fetches_run_idx").on(table.runId),
    index("source_fetches_topic_fetched_idx").on(table.topicId, table.fetchedAt),
  ],
);

export interface SourceMetricsPayload {
  likes: number;
  comments: number;
}

export const sourceCreators = pgTable(
  "source_creators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 32 }).notNull(),
    provisionalKey: varchar("provisional_key", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    avatarUrl: text("avatar_url"),
    status: creatorStatus("status").notNull().default("provisional"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    observedContentCount: integer("observed_content_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("source_creators_source_key_unique").on(table.source, table.provisionalKey),
    index("source_creators_status_last_seen_idx").on(table.status, table.lastSeenAt),
  ],
);

export const sourceContents = pgTable(
  "source_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 32 }).notNull(),
    sourceContentId: varchar("source_content_id", { length: 128 }).notNull(),
    contentType: varchar("content_type", { length: 32 }).notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    fullText: text("full_text"),
    coverage: contentCoverage("coverage").notNull().default("summary"),
    creatorId: uuid("creator_id").references(() => sourceCreators.id),
    authorName: varchar("author_name", { length: 200 }).notNull(),
    provisionalAuthorKey: varchar("provisional_author_key", { length: 64 }).notNull(),
    metrics: jsonb("metrics").$type<SourceMetricsPayload>().notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_contents_source_id_unique").on(table.source, table.sourceContentId),
    uniqueIndex("source_contents_url_unique").on(table.canonicalUrl),
    index("source_contents_author_idx").on(table.provisionalAuthorKey),
    index("source_contents_creator_idx").on(table.creatorId, table.lastSeenAt),
  ],
);

export interface CreatorQualityDimensionsPayload {
  originality?: number;
  firstHandPractice?: number;
  evidenceQuality?: number;
  frontierAwareness?: number;
  readability?: number;
  commercialRisk?: number;
  genericAiStyleRisk?: number;
}

export const creatorQualityProfiles = pgTable("creator_quality_profiles", {
  creatorId: uuid("creator_id")
    .primaryKey()
    .references(() => sourceCreators.id),
  assessedContentCount: integer("assessed_content_count").notNull().default(0),
  humanReviewedContentCount: integer("human_reviewed_content_count").notNull().default(0),
  qualityScoreBasisPoints: integer("quality_score_basis_points"),
  excellentRateBasisPoints: integer("excellent_rate_basis_points"),
  qualifiedRateBasisPoints: integer("qualified_rate_basis_points"),
  lowValueRateBasisPoints: integer("low_value_rate_basis_points"),
  spamRateBasisPoints: integer("spam_rate_basis_points"),
  dimensions: jsonb("dimensions").$type<CreatorQualityDimensionsPayload>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorExpansionJobs = pgTable(
  "creator_expansion_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => sourceCreators.id),
    triggerContentId: uuid("trigger_content_id")
      .notNull()
      .references(() => sourceContents.id),
    priority: creatorExpansionPriority("priority").notNull(),
    targetSampleSize: integer("target_sample_size").notNull(),
    status: creatorExpansionStatus("status").notNull().default("queued"),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("creator_expansion_jobs_status_priority_idx").on(table.status, table.priority),
    index("creator_expansion_jobs_creator_created_idx").on(table.creatorId, table.createdAt),
  ],
);

export const contentDiscoveries = pgTable(
  "content_discoveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => sourceContents.id),
    fetchId: uuid("fetch_id")
      .notNull()
      .references(() => sourceFetches.id),
    topicId: varchar("topic_id", { length: 128 })
      .notNull()
      .references(() => topicNodes.id),
    query: varchar("query", { length: 300 }).notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("content_discoveries_content_fetch_topic_unique").on(
      table.contentId,
      table.fetchId,
      table.topicId,
    ),
    index("content_discoveries_topic_idx").on(table.topicId, table.discoveredAt),
  ],
);

export const contentEvaluations = pgTable(
  "content_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => sourceContents.id),
    stage: evaluationStage("stage").notNull(),
    status: evaluationStatus("status").notNull().default("pending"),
    model: varchar("model", { length: 100 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 64 }).notNull(),
    inputHash: varchar("input_hash", { length: 64 }).notNull(),
    result: jsonb("result"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("content_evaluations_idempotency_unique").on(
      table.contentId,
      table.stage,
      table.model,
      table.promptVersion,
      table.inputHash,
    ),
    index("content_evaluations_stage_status_idx").on(table.stage, table.status),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handle: varchar("handle", { length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    rewardEligible: boolean("reward_eligible").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_handle_unique").on(table.handle)],
);

export const auditorInvitations = pgTable(
  "auditor_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => users.id),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
    inviteCodeHash: varchar("invite_code_hash", { length: 64 }).notNull(),
    status: invitationStatus("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("auditor_invite_code_hash_unique").on(table.inviteCodeHash)],
);

export const auditorProfiles = pgTable("auditor_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id),
  invitationId: uuid("invitation_id").references(() => auditorInvitations.id),
  status: auditorStatus("status").notNull().default("invited"),
  domainScores: jsonb("domain_scores").notNull().default({}),
  calibrationBasisPoints: integer("calibration_basis_points").notNull().default(0),
  completedAuditCount: integer("completed_audit_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyRecommendationQuotas = pgTable(
  "daily_recommendation_quotas",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    quotaDate: date("quota_date", { mode: "string" }).notNull(),
    allowance: integer("allowance").notNull(),
    used: integer("used").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.quotaDate] })],
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommenderUserId: uuid("recommender_user_id")
      .notNull()
      .references(() => users.id),
    contentAuthorUserId: uuid("content_author_user_id").references(() => users.id),
    canonicalUrl: text("canonical_url").notNull(),
    sourceContentId: varchar("source_content_id", { length: 128 }),
    kind: recommendationKind("kind").notNull(),
    reason: text("reason").notNull(),
    targetFeedIds: jsonb("target_feed_ids").notNull(),
    conflictOfInterest: boolean("conflict_of_interest").notNull().default(false),
    referralEligible: boolean("referral_eligible").notNull().default(false),
    status: recommendationStatus("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("recommendations_user_url_unique").on(table.recommenderUserId, table.canonicalUrl),
    index("recommendations_status_submitted_idx").on(table.status, table.submittedAt),
  ],
);

export const auditTasks = pgTable(
  "audit_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommendationId: uuid("recommendation_id").references(() => recommendations.id),
    contentKey: varchar("content_key", { length: 256 }).notNull(),
    status: auditTaskStatus("status").notNull().default("open"),
    isCalibrationCase: boolean("is_calibration_case").notNull().default(false),
    resolvedVerdict: auditVerdict("resolved_verdict"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("audit_tasks_status_created_idx").on(table.status, table.createdAt)],
);

export const auditAssignments = pgTable(
  "audit_assignments",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => auditTasks.id),
    auditorUserId: uuid("auditor_user_id")
      .notNull()
      .references(() => users.id),
    role: auditRole("role").notNull().default("reviewer"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.auditorUserId] })],
);

export interface AuditScorePayload {
  depth: number;
  originality: number;
  evidenceQuality: number;
  decisionValue: number;
  marketingRisk: number;
  informationGain: number;
  confidence: number;
  newInformation: string[];
  supportingEvidence: string[];
  concerns: string[];
  verificationNeeded: string[];
}

export const auditSubmissions = pgTable(
  "audit_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => auditTasks.id),
    auditorUserId: uuid("auditor_user_id")
      .notNull()
      .references(() => users.id),
    verdict: auditVerdict("verdict").notNull(),
    scores: jsonb("scores").$type<AuditScorePayload>().notNull(),
    conflictOfInterest: boolean("conflict_of_interest").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("audit_submissions_task_auditor_unique").on(table.taskId, table.auditorUserId),
  ],
);

export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recommendationId: uuid("recommendation_id")
      .notNull()
      .references(() => recommendations.id),
    beneficiaryUserId: uuid("beneficiary_user_id")
      .notNull()
      .references(() => users.id),
    basis: varchar("basis", { length: 64 }).notNull(),
    status: attributionStatus("status").notNull().default("eligible"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("referral_attributions_recommendation_unique").on(table.recommendationId),
  ],
);

export const rewardLedger = pgTable(
  "reward_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beneficiaryUserId: uuid("beneficiary_user_id")
      .notNull()
      .references(() => users.id),
    sourceType: rewardSourceType("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: ledgerEntryStatus("status").notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    availableAt: timestamp("available_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("reward_ledger_idempotency_unique").on(table.idempotencyKey),
    index("reward_ledger_beneficiary_status_idx").on(table.beneficiaryUserId, table.status),
  ],
);
