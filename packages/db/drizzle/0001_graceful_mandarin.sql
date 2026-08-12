CREATE TYPE "public"."content_coverage" AS ENUM('summary', 'full');--> statement-breakpoint
CREATE TYPE "public"."evaluation_stage" AS ENUM('preview_triage', 'full_quality');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('pending', 'completed', 'invalid_output', 'failed');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('planned', 'running', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "content_discoveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"fetch_id" uuid NOT NULL,
	"topic_id" varchar(128) NOT NULL,
	"query" varchar(300) NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"stage" "evaluation_stage" NOT NULL,
	"status" "evaluation_status" DEFAULT 'pending' NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_version" varchar(64) NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"result" jsonb,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"run_type" varchar(32) NOT NULL,
	"status" "ingestion_run_status" DEFAULT 'planned' NOT NULL,
	"plan_version" varchar(64) NOT NULL,
	"query_count" integer NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(32) NOT NULL,
	"source_content_id" varchar(128) NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"canonical_url" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"full_text" text,
	"coverage" "content_coverage" DEFAULT 'summary' NOT NULL,
	"author_name" varchar(200) NOT NULL,
	"provisional_author_key" varchar(64) NOT NULL,
	"metrics" jsonb NOT NULL,
	"source_updated_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_fetches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"topic_id" varchar(128),
	"query" varchar(300) NOT NULL,
	"request_fingerprint" varchar(64) NOT NULL,
	"http_status" integer,
	"item_count" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"raw_response" jsonb,
	"error_code" varchar(100),
	"error_message" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_nodes" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"parent_id" varchar(128),
	"level" varchar(16) NOT NULL,
	"label" varchar(100) NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer NOT NULL,
	"cadence" varchar(32) NOT NULL,
	"taxonomy_version" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_discoveries" ADD CONSTRAINT "content_discoveries_content_id_source_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."source_contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_discoveries" ADD CONSTRAINT "content_discoveries_fetch_id_source_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."source_fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_discoveries" ADD CONSTRAINT "content_discoveries_topic_id_topic_nodes_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_evaluations" ADD CONSTRAINT "content_evaluations_content_id_source_contents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."source_contents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetches" ADD CONSTRAINT "source_fetches_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_fetches" ADD CONSTRAINT "source_fetches_topic_id_topic_nodes_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_discoveries_content_fetch_topic_unique" ON "content_discoveries" USING btree ("content_id","fetch_id","topic_id");--> statement-breakpoint
CREATE INDEX "content_discoveries_topic_idx" ON "content_discoveries" USING btree ("topic_id","discovered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_evaluations_idempotency_unique" ON "content_evaluations" USING btree ("content_id","stage","model","prompt_version","input_hash");--> statement-breakpoint
CREATE INDEX "content_evaluations_stage_status_idx" ON "content_evaluations" USING btree ("stage","status");--> statement-breakpoint
CREATE INDEX "ingestion_runs_status_created_idx" ON "ingestion_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "source_contents_source_id_unique" ON "source_contents" USING btree ("source","source_content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_contents_url_unique" ON "source_contents" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "source_contents_author_idx" ON "source_contents" USING btree ("provisional_author_key");--> statement-breakpoint
CREATE INDEX "source_fetches_run_idx" ON "source_fetches" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "source_fetches_topic_fetched_idx" ON "source_fetches" USING btree ("topic_id","fetched_at");--> statement-breakpoint
CREATE INDEX "topic_nodes_parent_idx" ON "topic_nodes" USING btree ("parent_id");