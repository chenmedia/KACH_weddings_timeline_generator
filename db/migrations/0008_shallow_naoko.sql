ALTER TABLE "timelines" DROP CONSTRAINT "timelines_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "client_journeys" ADD COLUMN "enabled_tasks" jsonb DEFAULT '["welcomeGuide","foclSetup","storyCall","questionnaire","engagementSession","planningCall","finalMeeting","weddingEncouragement","weddingCare","backupCheck","sneakPreview","galleryDelivery","reviewRequest","parentPrint","holidayGift","anniversaryTouch"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "client_journeys" ADD COLUMN "message_templates" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "journey_defaults" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;