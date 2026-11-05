CREATE TABLE "client_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"plan" text DEFAULT 'signature' NOT NULL,
	"package_name" text,
	"focl_url" text,
	"last_touch" date,
	"completed_tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"referral_moments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"journey_date_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_journeys_timeline_id_unique" UNIQUE("timeline_id")
);
--> statement-breakpoint
ALTER TABLE "timelines" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_journeys" ADD CONSTRAINT "client_journeys_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;