CREATE TYPE "public"."event_member_role" AS ENUM('organizer', 'participant');--> statement-breakpoint
CREATE TYPE "public"."event_point_category" AS ENUM('h2h_match', 'ffa_match', 'high_score', 'tournament');--> statement-breakpoint
CREATE TYPE "public"."event_point_outcome" AS ENUM('win', 'loss', 'draw', 'placement', 'submission');--> statement-breakpoint
CREATE TYPE "public"."event_scoring_type" AS ENUM('team');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."high_score_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"visibility" "event_visibility" DEFAULT 'private' NOT NULL,
	"scoring_type" "event_scoring_type" DEFAULT 'team' NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_game_type" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"category" "game_category" NOT NULL,
	"config" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_high_score_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"event_id" text NOT NULL,
	"event_game_type_id" text NOT NULL,
	"user_id" text,
	"event_placeholder_member_id" text,
	"score" real NOT NULL,
	"recorder_id" text NOT NULL,
	"achieved_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_high_score_session" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_game_type_id" text NOT NULL,
	"status" "high_score_session_status" DEFAULT 'open' NOT NULL,
	"placement_point_config" text,
	"opened_by_id" text NOT NULL,
	"closed_by_id" text,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"inviter_id" text NOT NULL,
	"invitee_user_id" text,
	"role" "event_member_role" DEFAULT 'participant' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"token" text,
	"max_uses" integer,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "event_invitation_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "event_match" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_game_type_id" text NOT NULL,
	"played_at" timestamp NOT NULL,
	"recorder_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_match_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"event_match_id" text NOT NULL,
	"event_team_id" text,
	"user_id" text,
	"event_placeholder_member_id" text,
	"side" integer,
	"score" real,
	"rank" integer,
	"result" "match_result",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_member" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "event_member_role" DEFAULT 'participant' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_placeholder_member" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"display_name" text NOT NULL,
	"linked_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"retired_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "event_point_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"category" "event_point_category" NOT NULL,
	"outcome" "event_point_outcome" NOT NULL,
	"event_team_id" text,
	"user_id" text,
	"event_placeholder_member_id" text,
	"event_match_id" text,
	"event_high_score_session_id" text,
	"event_tournament_id" text,
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
	"event_placeholder_member_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_team_member_user_unique" UNIQUE("event_team_id","user_id"),
	CONSTRAINT "event_team_member_placeholder_unique" UNIQUE("event_team_id","event_placeholder_member_id")
);
--> statement-breakpoint
CREATE TABLE "event_tournament" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_game_type_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"logo" text,
	"tournament_type" "tournament_type" DEFAULT 'single_elimination' NOT NULL,
	"status" "tournament_status" DEFAULT 'draft' NOT NULL,
	"seeding_type" "seeding_type" NOT NULL,
	"best_of" integer DEFAULT 1 NOT NULL,
	"placement_point_config" text,
	"total_rounds" integer,
	"start_date" timestamp,
	"completed_at" timestamp,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tournament_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"event_tournament_id" text NOT NULL,
	"event_team_id" text NOT NULL,
	"seed" integer,
	"is_eliminated" boolean DEFAULT false NOT NULL,
	"eliminated_in_round" integer,
	"final_placement" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_tournament_round_match" (
	"id" text PRIMARY KEY NOT NULL,
	"event_tournament_id" text NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"participant1_id" text,
	"participant2_id" text,
	"winner_id" text,
	"event_match_id" text,
	"is_bye" boolean DEFAULT false NOT NULL,
	"is_forfeit" boolean DEFAULT false NOT NULL,
	"participant1_score" real,
	"participant2_score" real,
	"next_match_id" text,
	"next_match_slot" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_trm_unique" UNIQUE("event_tournament_id","round","position")
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_game_type" ADD CONSTRAINT "event_game_type_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_session_id_event_high_score_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_high_score_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_event_game_type_id_event_game_type_id_fk" FOREIGN KEY ("event_game_type_id") REFERENCES "public"."event_game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_event_placeholder_member_id_event_placeholder_member_id_fk" FOREIGN KEY ("event_placeholder_member_id") REFERENCES "public"."event_placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_recorder_id_user_id_fk" FOREIGN KEY ("recorder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_session" ADD CONSTRAINT "event_high_score_session_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_session" ADD CONSTRAINT "event_high_score_session_event_game_type_id_event_game_type_id_fk" FOREIGN KEY ("event_game_type_id") REFERENCES "public"."event_game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_session" ADD CONSTRAINT "event_high_score_session_opened_by_id_user_id_fk" FOREIGN KEY ("opened_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_session" ADD CONSTRAINT "event_high_score_session_closed_by_id_user_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation" ADD CONSTRAINT "event_invitation_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation" ADD CONSTRAINT "event_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_invitation" ADD CONSTRAINT "event_invitation_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match" ADD CONSTRAINT "event_match_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match" ADD CONSTRAINT "event_match_event_game_type_id_event_game_type_id_fk" FOREIGN KEY ("event_game_type_id") REFERENCES "public"."event_game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match" ADD CONSTRAINT "event_match_recorder_id_user_id_fk" FOREIGN KEY ("recorder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_participant" ADD CONSTRAINT "event_match_participant_event_match_id_event_match_id_fk" FOREIGN KEY ("event_match_id") REFERENCES "public"."event_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_participant" ADD CONSTRAINT "event_match_participant_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_participant" ADD CONSTRAINT "event_match_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_match_participant" ADD CONSTRAINT "event_match_participant_event_placeholder_member_id_event_placeholder_member_id_fk" FOREIGN KEY ("event_placeholder_member_id") REFERENCES "public"."event_placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_placeholder_member" ADD CONSTRAINT "event_placeholder_member_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_placeholder_member" ADD CONSTRAINT "event_placeholder_member_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_placeholder_member_id_event_placeholder_member_id_fk" FOREIGN KEY ("event_placeholder_member_id") REFERENCES "public"."event_placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_match_id_event_match_id_fk" FOREIGN KEY ("event_match_id") REFERENCES "public"."event_match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_high_score_session_id_event_high_score_session_id_fk" FOREIGN KEY ("event_high_score_session_id") REFERENCES "public"."event_high_score_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD CONSTRAINT "event_point_entry_event_tournament_id_event_tournament_id_fk" FOREIGN KEY ("event_tournament_id") REFERENCES "public"."event_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team" ADD CONSTRAINT "event_team_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_team_member" ADD CONSTRAINT "event_team_member_event_placeholder_member_id_event_placeholder_member_id_fk" FOREIGN KEY ("event_placeholder_member_id") REFERENCES "public"."event_placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament" ADD CONSTRAINT "event_tournament_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament" ADD CONSTRAINT "event_tournament_event_game_type_id_event_game_type_id_fk" FOREIGN KEY ("event_game_type_id") REFERENCES "public"."event_game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament" ADD CONSTRAINT "event_tournament_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_participant" ADD CONSTRAINT "event_tournament_participant_event_tournament_id_event_tournament_id_fk" FOREIGN KEY ("event_tournament_id") REFERENCES "public"."event_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_participant" ADD CONSTRAINT "event_tournament_participant_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_round_match" ADD CONSTRAINT "event_tournament_round_match_event_tournament_id_event_tournament_id_fk" FOREIGN KEY ("event_tournament_id") REFERENCES "public"."event_tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_round_match" ADD CONSTRAINT "event_tournament_round_match_participant1_id_event_tournament_participant_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."event_tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_round_match" ADD CONSTRAINT "event_tournament_round_match_participant2_id_event_tournament_participant_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."event_tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_round_match" ADD CONSTRAINT "event_tournament_round_match_winner_id_event_tournament_participant_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."event_tournament_participant"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_round_match" ADD CONSTRAINT "event_tournament_round_match_event_match_id_event_match_id_fk" FOREIGN KEY ("event_match_id") REFERENCES "public"."event_match"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_name_idx" ON "event" USING btree ("name");--> statement-breakpoint
CREATE INDEX "event_created_by_idx" ON "event" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "event_status_idx" ON "event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_game_type_event_idx" ON "event_game_type" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_game_type_name_event_idx" ON "event_game_type" USING btree ("event_id","name");--> statement-breakpoint
CREATE INDEX "event_hs_entry_session_idx" ON "event_high_score_entry" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_event_idx" ON "event_high_score_entry" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_game_type_idx" ON "event_high_score_entry" USING btree ("event_game_type_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_user_idx" ON "event_high_score_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_placeholder_idx" ON "event_high_score_entry" USING btree ("event_placeholder_member_id");--> statement-breakpoint
CREATE INDEX "event_hs_session_event_idx" ON "event_high_score_session" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_hs_session_game_type_idx" ON "event_high_score_session" USING btree ("event_game_type_id");--> statement-breakpoint
CREATE INDEX "event_hs_session_status_idx" ON "event_high_score_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_invitation_event_idx" ON "event_invitation" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_invitation_invitee_idx" ON "event_invitation" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "event_invitation_token_idx" ON "event_invitation" USING btree ("token");--> statement-breakpoint
CREATE INDEX "event_match_event_idx" ON "event_match" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_match_game_type_idx" ON "event_match" USING btree ("event_game_type_id");--> statement-breakpoint
CREATE INDEX "event_match_played_at_idx" ON "event_match" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "event_match_participant_match_idx" ON "event_match_participant" USING btree ("event_match_id");--> statement-breakpoint
CREATE INDEX "event_match_participant_team_idx" ON "event_match_participant" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_match_participant_user_idx" ON "event_match_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_match_participant_placeholder_idx" ON "event_match_participant" USING btree ("event_placeholder_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_member_unique" ON "event_member" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_member_event_idx" ON "event_member" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_member_user_idx" ON "event_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_placeholder_member_event_idx" ON "event_placeholder_member" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_placeholder_member_linked_user_idx" ON "event_placeholder_member" USING btree ("linked_user_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_event_idx" ON "event_point_entry" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_team_idx" ON "event_point_entry" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_user_idx" ON "event_point_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_match_idx" ON "event_point_entry" USING btree ("event_match_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_session_idx" ON "event_point_entry" USING btree ("event_high_score_session_id");--> statement-breakpoint
CREATE INDEX "event_point_entry_tournament_idx" ON "event_point_entry" USING btree ("event_tournament_id");--> statement-breakpoint
CREATE INDEX "event_team_event_idx" ON "event_team" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_team_name_event_idx" ON "event_team" USING btree ("event_id","name");--> statement-breakpoint
CREATE INDEX "event_team_member_team_idx" ON "event_team_member" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_team_member_user_idx" ON "event_team_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_team_member_placeholder_idx" ON "event_team_member" USING btree ("event_placeholder_member_id");--> statement-breakpoint
CREATE INDEX "event_tournament_event_idx" ON "event_tournament" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_tournament_game_type_idx" ON "event_tournament" USING btree ("event_game_type_id");--> statement-breakpoint
CREATE INDEX "event_tournament_status_idx" ON "event_tournament" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_tp_tournament_idx" ON "event_tournament_participant" USING btree ("event_tournament_id");--> statement-breakpoint
CREATE INDEX "event_tp_team_idx" ON "event_tournament_participant" USING btree ("event_team_id");--> statement-breakpoint
CREATE INDEX "event_trm_tournament_idx" ON "event_tournament_round_match" USING btree ("event_tournament_id");--> statement-breakpoint
CREATE INDEX "event_trm_round_idx" ON "event_tournament_round_match" USING btree ("event_tournament_id","round");