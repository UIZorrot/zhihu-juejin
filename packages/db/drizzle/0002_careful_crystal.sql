ALTER TABLE "source_fetches" ADD COLUMN "freshness_intent" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "source_fetches" ADD COLUMN "minimum_source_edit_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD COLUMN "recent_query_share_basis_points" integer;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD COLUMN "recent_window_days" integer;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD COLUMN "historical_maximum_age_days" integer;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD COLUMN "decay_half_life_days" integer;