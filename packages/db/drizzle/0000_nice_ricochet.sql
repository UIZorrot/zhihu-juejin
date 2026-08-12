CREATE TYPE "public"."attribution_status" AS ENUM('eligible', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."audit_role" AS ENUM('reviewer', 'third_reviewer', 'adjudicator');--> statement-breakpoint
CREATE TYPE "public"."audit_task_status" AS ENUM('open', 'third_review_required', 'adjudication_required', 'resolved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."audit_verdict" AS ENUM('excellent', 'qualified', 'low_value', 'spam');--> statement-breakpoint
CREATE TYPE "public"."auditor_status" AS ENUM('invited', 'training', 'active', 'senior', 'adjudicator', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_status" AS ENUM('pending', 'available', 'paid', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."recommendation_kind" AS ENUM('self', 'other');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('submitted', 'screening', 'audit_pending', 'accepted', 'published', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."reward_source_type" AS ENUM('audit', 'referral');--> statement-breakpoint
CREATE TABLE "audit_assignments" (
	"task_id" uuid NOT NULL,
	"auditor_user_id" uuid NOT NULL,
	"role" "audit_role" DEFAULT 'reviewer' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	CONSTRAINT "audit_assignments_task_id_auditor_user_id_pk" PRIMARY KEY("task_id","auditor_user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"auditor_user_id" uuid NOT NULL,
	"verdict" "audit_verdict" NOT NULL,
	"scores" jsonb NOT NULL,
	"conflict_of_interest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid,
	"content_key" varchar(256) NOT NULL,
	"status" "audit_task_status" DEFAULT 'open' NOT NULL,
	"is_calibration_case" boolean DEFAULT false NOT NULL,
	"resolved_verdict" "audit_verdict",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auditor_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"accepted_by_user_id" uuid,
	"invite_code_hash" varchar(64) NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auditor_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"invitation_id" uuid,
	"status" "auditor_status" DEFAULT 'invited' NOT NULL,
	"domain_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"calibration_basis_points" integer DEFAULT 0 NOT NULL,
	"completed_audit_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_recommendation_quotas" (
	"user_id" uuid NOT NULL,
	"quota_date" date NOT NULL,
	"allowance" integer NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_recommendation_quotas_user_id_quota_date_pk" PRIMARY KEY("user_id","quota_date")
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommender_user_id" uuid NOT NULL,
	"content_author_user_id" uuid,
	"canonical_url" text NOT NULL,
	"source_content_id" varchar(128),
	"kind" "recommendation_kind" NOT NULL,
	"reason" text NOT NULL,
	"target_feed_ids" jsonb NOT NULL,
	"conflict_of_interest" boolean DEFAULT false NOT NULL,
	"referral_eligible" boolean DEFAULT false NOT NULL,
	"status" "recommendation_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"beneficiary_user_id" uuid NOT NULL,
	"basis" varchar(64) NOT NULL,
	"status" "attribution_status" DEFAULT 'eligible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"beneficiary_user_id" uuid NOT NULL,
	"source_type" "reward_source_type" NOT NULL,
	"source_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" "ledger_entry_status" DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" varchar(64) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"reward_eligible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_task_id_audit_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."audit_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_assignments" ADD CONSTRAINT "audit_assignments_auditor_user_id_users_id_fk" FOREIGN KEY ("auditor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_submissions" ADD CONSTRAINT "audit_submissions_task_id_audit_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."audit_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_submissions" ADD CONSTRAINT "audit_submissions_auditor_user_id_users_id_fk" FOREIGN KEY ("auditor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tasks" ADD CONSTRAINT "audit_tasks_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_invitations" ADD CONSTRAINT "auditor_invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_invitations" ADD CONSTRAINT "auditor_invitations_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_profiles" ADD CONSTRAINT "auditor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_profiles" ADD CONSTRAINT "auditor_profiles_invitation_id_auditor_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."auditor_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_recommendation_quotas" ADD CONSTRAINT "daily_recommendation_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommender_user_id_users_id_fk" FOREIGN KEY ("recommender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_content_author_user_id_users_id_fk" FOREIGN KEY ("content_author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_submissions_task_auditor_unique" ON "audit_submissions" USING btree ("task_id","auditor_user_id");--> statement-breakpoint
CREATE INDEX "audit_tasks_status_created_idx" ON "audit_tasks" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auditor_invite_code_hash_unique" ON "auditor_invitations" USING btree ("invite_code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendations_user_url_unique" ON "recommendations" USING btree ("recommender_user_id","canonical_url");--> statement-breakpoint
CREATE INDEX "recommendations_status_submitted_idx" ON "recommendations" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_attributions_recommendation_unique" ON "referral_attributions" USING btree ("recommendation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_ledger_idempotency_unique" ON "reward_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "reward_ledger_beneficiary_status_idx" ON "reward_ledger" USING btree ("beneficiary_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_unique" ON "users" USING btree ("handle");