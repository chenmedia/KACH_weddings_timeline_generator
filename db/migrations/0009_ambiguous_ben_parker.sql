CREATE TABLE "focl_import_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source_id" text,
	"payload" jsonb NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_project_version" integer NOT NULL,
	"expected_profile_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "focl_import_sessions" ADD CONSTRAINT "focl_import_sessions_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focl_import_sessions_owner_id_status_created_at_index" ON "focl_import_sessions" USING btree ("owner_id","status","created_at");--> statement-breakpoint
CREATE INDEX "focl_import_sessions_timeline_id_created_at_index" ON "focl_import_sessions" USING btree ("timeline_id","created_at");