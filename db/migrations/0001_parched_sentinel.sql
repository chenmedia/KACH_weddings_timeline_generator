ALTER TABLE "timelines" ADD COLUMN "view_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "timelines" ADD COLUMN "last_viewed_at" timestamp with time zone;