CREATE TYPE "public"."seeding_type" AS ENUM('manual', 'random');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('draft', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."tournament_type" AS ENUM('single_elimination');--> statement-breakpoint
CREATE TABLE "tournament" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"game_type_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"tournament_type" "tournament_type" DEFAULT 'single_elimination' NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"participant_type" text NOT NULL,
	"seeding_type" "seeding_type" NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"total_rounds" integer,
	"start_date" timestamp,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"placeholder_member_id" text,
	"seed" integer,
	"is_eliminated" boolean DEFAULT false NOT NULL,
	"eliminated_in_round" integer,
	"final_placement" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_round_match" (
	"id" text PRIMARY KEY NOT NULL,
	"tournament_id" text NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"participant1_id" text,
	"participant2_id" text,
	"winner_id" text,
	"match_id" text,
	"is_bye" boolean DEFAULT false NOT NULL,
	"is_forfeit" boolean DEFAULT false NOT NULL,
	"next_match_id" text,
	"next_match_slot" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_round_match_unique" UNIQUE("tournament_id","round","position")
);
--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participant" ADD CONSTRAINT "tournament_participant_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD CONSTRAINT "tournament_round_match_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD CONSTRAINT "tournament_round_match_participant1_id_tournament_participant_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD CONSTRAINT "tournament_round_match_participant2_id_tournament_participant_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD CONSTRAINT "tournament_round_match_winner_id_tournament_participant_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD CONSTRAINT "tournament_round_match_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournament_league_idx" ON "tournament" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "tournament_game_type_idx" ON "tournament" USING btree ("game_type_id");--> statement-breakpoint
CREATE INDEX "tournament_status_idx" ON "tournament" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tournament_created_by_idx" ON "tournament" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_tournament_idx" ON "tournament_participant" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_user_idx" ON "tournament_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_team_idx" ON "tournament_participant" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tournament_participant_placeholder_idx" ON "tournament_participant" USING btree ("placeholder_member_id");--> statement-breakpoint
CREATE INDEX "tournament_round_match_tournament_idx" ON "tournament_round_match" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_round_match_tournament_round_idx" ON "tournament_round_match" USING btree ("tournament_id","round");--> statement-breakpoint
CREATE INDEX "tournament_round_match_match_idx" ON "tournament_round_match" USING btree ("match_id");