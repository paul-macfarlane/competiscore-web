CREATE TYPE "public"."event_point_category" AS ENUM('h2h_match', 'ffa_match', 'high_score', 'tournament');--> statement-breakpoint
CREATE TYPE "public"."event_point_outcome" AS ENUM('win', 'loss', 'draw', 'placement', 'submission');--> statement-breakpoint
CREATE TYPE "public"."event_scoring_type" AS ENUM('individual', 'team');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'completed');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"scoring_type" "event_scoring_type" NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_point_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"point_rule_id" text NOT NULL,
	"user_id" text,
	"placeholder_member_id" text,
	"event_team_id" text,
	"match_id" text,
	"high_score_entry_id" text,
	"tournament_id" text,
	"points" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_point_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"description" text,
	"category" "event_point_category" NOT NULL,
	"outcome" "event_point_outcome" NOT NULL,
	"placement" integer,
	"points" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_team" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_team_member" (
	"id" text PRIMARY KEY NOT NULL,
	"event_team_id" text NOT NULL,
	"user_id" text,
	"placeholder_member_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_team_member_user_unique" UNIQUE("event_team_id","user_id"),
	CONSTRAINT "event_team_member_placeholder_unique" UNIQUE("event_team_id","placeholder_member_id")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_point_rule_id_event_point_rule_id_fk" FOREIGN KEY ("point_rule_id") REFERENCES "public"."event_point_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_high_score_entry_id_high_score_entry_id_fk" FOREIGN KEY ("high_score_entry_id") REFERENCES "public"."high_score_entry"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_rule" ADD CONSTRAINT "event_point_rule_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team" ADD CONSTRAINT "event_team_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_league_idx" ON "event" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_created_by_idx" ON "event" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_event_idx" ON "event_point_entry" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_user_idx" ON "event_point_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_placeholder_idx" ON "event_point_entry" USING btree ("placeholder_member_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_team_idx" ON "event_point_entry" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_match_idx" ON "event_point_entry" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_high_score_idx" ON "event_point_entry" USING btree ("high_score_entry_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_tournament_idx" ON "event_point_entry" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "event_point_rule_event_idx" ON "event_point_rule" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_team_event_idx" ON "event_team" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_team_member_team_idx" ON "event_team_member" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_team_member_user_idx" ON "event_team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_team_member_placeholder_idx" ON "event_team_member" USING btree ("placeholder_member_id");