CREATE TYPE "public"."moderation_action_type" AS ENUM('dismissed', 'warned', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('unsportsmanlike', 'false_reporting', 'harassment', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved');--> statement-breakpoint
CREATE TABLE "moderation_action" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"league_id" text NOT NULL,
	"action" "moderation_action_type" NOT NULL,
	"reason" text NOT NULL,
	"suspended_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"league_id" text NOT NULL,
	"reason" "report_reason" NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_member" ADD COLUMN "suspended_until" timestamp;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_moderator_id_user_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_action_report_idx" ON "moderation_action" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "moderation_action_target_idx" ON "moderation_action" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "moderation_action_league_idx" ON "moderation_action" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "report_league_idx" ON "report" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "report_reported_user_idx" ON "report" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "report_reporter_idx" ON "report" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status");