CREATE TYPE "public"."match_result" AS ENUM('win', 'loss', 'draw');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('pending', 'accepted', 'completed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TABLE "high_score_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"game_type_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"placeholder_member_id" text,
	"score" integer NOT NULL,
	"recorder_id" text NOT NULL,
	"achieved_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"game_type_id" text NOT NULL,
	"status" "match_status" DEFAULT 'completed' NOT NULL,
	"played_at" timestamp NOT NULL,
	"recorder_id" text NOT NULL,
	"challenger_id" text,
	"challenged_at" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"placeholder_member_id" text,
	"side" integer,
	"score" integer,
	"rank" integer,
	"result" "match_result",
	"is_challenged" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_recorder_id_user_id_fk" FOREIGN KEY ("recorder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_recorder_id_user_id_fk" FOREIGN KEY ("recorder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_challenger_id_user_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participant" ADD CONSTRAINT "match_participant_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "high_score_entry_league_idx" ON "high_score_entry" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "high_score_entry_game_type_idx" ON "high_score_entry" USING btree ("game_type_id");--> statement-breakpoint
CREATE INDEX "high_score_entry_user_idx" ON "high_score_entry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "high_score_entry_team_idx" ON "high_score_entry" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "high_score_entry_placeholder_idx" ON "high_score_entry" USING btree ("placeholder_member_id");--> statement-breakpoint
CREATE INDEX "high_score_entry_score_idx" ON "high_score_entry" USING btree ("score");--> statement-breakpoint
CREATE INDEX "high_score_entry_achieved_at_idx" ON "high_score_entry" USING btree ("achieved_at");--> statement-breakpoint
CREATE INDEX "match_league_idx" ON "match" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "match_game_type_idx" ON "match" USING btree ("game_type_id");--> statement-breakpoint
CREATE INDEX "match_status_idx" ON "match" USING btree ("status");--> statement-breakpoint
CREATE INDEX "match_played_at_idx" ON "match" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "match_recorder_idx" ON "match" USING btree ("recorder_id");--> statement-breakpoint
CREATE INDEX "match_challenger_idx" ON "match" USING btree ("challenger_id");--> statement-breakpoint
CREATE INDEX "match_participant_match_idx" ON "match_participant" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "match_participant_user_idx" ON "match_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_participant_team_idx" ON "match_participant" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "match_participant_placeholder_idx" ON "match_participant" USING btree ("placeholder_member_id");