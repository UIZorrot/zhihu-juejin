CREATE TYPE "public"."creator_expansion_priority" AS ENUM('high', 'standard', 'watch');--> statement-breakpoint
CREATE TYPE "public"."creator_expansion_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."creator_status" AS ENUM('provisional', 'watch', 'trusted', 'commercial_risk', 'suppressed');--> statement-breakpoint
CREATE TABLE "creator_expansion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"trigger_content_id" uuid NOT NULL,
	"priority" "creator_expansion_priority" NOT NULL,
	"target_sample_size" integer NOT NULL,
	"status" "creator_expansion_status" DEFAULT 'queued' NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "creator_quality_profiles" (
	"creator_id" uuid PRIMARY KEY NOT NULL,
	"assessed_content_count" integer DEFAULT 0 NOT NULL,
	"human_reviewed_content_count" integer DEFAULT 0 NOT NULL,
	"quality_score_basis_points" integer,
	"excellent_rate_basis_points" integer,
	"qualified_rate_basis_points" integer,
	"low_value_rate_basis_points" integer,
	"spam_rate_basis_points" integer,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"provisional_key" varchar(64) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"avatar_url" text,
	"status" "creator_status" DEFAULT 'provisional' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"observed_content_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_contents" ADD COLUMN "creator_id" uuid;--> statement-breakpoint
ALTER TABLE "creator_expansion_jobs" ADD CONSTRAINT "creator_expansion_jobs_creator_id_source_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."source_creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_expansion_jobs" ADD CONSTRAINT "creator_expansion_jobs_trigger_content_id_source_contents_id_fk" FOREIGN KEY ("trigger_content_id") REFERENCES "public"."source_contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_quality_profiles" ADD CONSTRAINT "creator_quality_profiles_creator_id_source_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."source_creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_expansion_jobs_status_priority_idx" ON "creator_expansion_jobs" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "creator_expansion_jobs_creator_created_idx" ON "creator_expansion_jobs" USING btree ("creator_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_creators_source_key_unique" ON "source_creators" USING btree ("source","provisional_key");--> statement-breakpoint
CREATE INDEX "source_creators_status_last_seen_idx" ON "source_creators" USING btree ("status","last_seen_at");--> statement-breakpoint
ALTER TABLE "source_contents" ADD CONSTRAINT "source_contents_creator_id_source_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."source_creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_contents_creator_idx" ON "source_contents" USING btree ("creator_id","last_seen_at");