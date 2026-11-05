CREATE TABLE "wedding_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"actor_type" text DEFAULT 'owner' NOT NULL,
	"actor_name" text,
	"action" text NOT NULL,
	"item_key" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wedding_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"summary" text,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wedding_versions_timeline_id_sequence_unique" UNIQUE("timeline_id","sequence")
);
--> statement-breakpoint
ALTER TABLE "wedding_activity_events" ADD CONSTRAINT "wedding_activity_events_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_versions" ADD CONSTRAINT "wedding_versions_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wedding_activity_events_timeline_id_created_at_index" ON "wedding_activity_events" USING btree ("timeline_id","created_at");--> statement-breakpoint
CREATE INDEX "wedding_versions_timeline_id_created_at_index" ON "wedding_versions" USING btree ("timeline_id","created_at");