CREATE TABLE "integration_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text,
	"last_synced_at" timestamp with time zone,
	CONSTRAINT "integration_links_timeline_id_provider_external_id_unique" UNIQUE("timeline_id","provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "milestone_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"hidden" boolean DEFAULT false,
	"date" date,
	"note" text,
	CONSTRAINT "milestone_overrides_timeline_id_item_key_unique" UNIQUE("timeline_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"scope" text,
	CONSTRAINT "oauth_connections_owner_id_provider_unique" UNIQUE("owner_id","provider")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"amount_nok" numeric(10, 2),
	"due_date" date,
	"paid_at" timestamp with time zone,
	"status" text DEFAULT 'due',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "photographers" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"delw_default" integer DEFAULT 4,
	"send_days_default" integer DEFAULT 1,
	"term_days_default" integer DEFAULT 10,
	"include_engage" boolean DEFAULT false,
	"include_album" boolean DEFAULT false,
	"enabled_item_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"template_id" uuid,
	"couple" text DEFAULT '' NOT NULL,
	"wdate" date NOT NULL,
	"bdate" date,
	"place" text,
	"delw" integer DEFAULT 4,
	"send_days" integer DEFAULT 1,
	"term_days" integer DEFAULT 10,
	"final_override" date,
	"t_engage" boolean DEFAULT false,
	"t_album" boolean DEFAULT false,
	"share_slug" text,
	"share_enabled" boolean DEFAULT false,
	"share_expires_at" timestamp with time zone,
	"status" text DEFAULT 'lead',
	"lang" text DEFAULT 'nb',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "timelines_share_slug_unique" UNIQUE("share_slug")
);
--> statement-breakpoint
ALTER TABLE "integration_links" ADD CONSTRAINT "integration_links_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestone_overrides" ADD CONSTRAINT "milestone_overrides_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;