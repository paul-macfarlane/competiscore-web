CREATE TABLE "elo_history" (
	"id" text PRIMARY KEY NOT NULL,
	"elo_rating_id" text NOT NULL,
	"match_id" text NOT NULL,
	"rating_before" real NOT NULL,
	"rating_after" real NOT NULL,
	"rating_change" real NOT NULL,
	"k_factor" integer NOT NULL,
	"opponent_rating_avg" real NOT NULL,
	"expected_score" real NOT NULL,
	"actual_score" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elo_rating" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"game_type_id" text NOT NULL,
	"user_id" text,
	"team_id" text,
	"placeholder_member_id" text,
	"rating" real DEFAULT 1200 NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "elo_history" ADD CONSTRAINT "elo_history_elo_rating_id_elo_rating_id_fk" FOREIGN KEY ("elo_rating_id") REFERENCES "public"."elo_rating"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_history" ADD CONSTRAINT "elo_history_match_id_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_rating" ADD CONSTRAINT "elo_rating_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_rating" ADD CONSTRAINT "elo_rating_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_rating" ADD CONSTRAINT "elo_rating_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_rating" ADD CONSTRAINT "elo_rating_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_rating" ADD CONSTRAINT "elo_rating_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elo_history_elo_rating_idx" ON "elo_history" USING btree ("elo_rating_id");--> statement-breakpoint
CREATE INDEX "elo_history_match_idx" ON "elo_history" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "elo_history_created_at_idx" ON "elo_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "elo_rating_league_game_type_idx" ON "elo_rating" USING btree ("league_id","game_type_id");--> statement-breakpoint
CREATE INDEX "elo_rating_user_idx" ON "elo_rating" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "elo_rating_team_idx" ON "elo_rating" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "elo_rating_placeholder_idx" ON "elo_rating" USING btree ("placeholder_member_id");--> statement-breakpoint
CREATE INDEX "elo_rating_rating_idx" ON "elo_rating" USING btree ("rating");--> statement-breakpoint
CREATE UNIQUE INDEX "elo_rating_user_game_type_unique" ON "elo_rating" USING btree ("user_id","game_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elo_rating_team_game_type_unique" ON "elo_rating" USING btree ("team_id","game_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elo_rating_placeholder_game_type_unique" ON "elo_rating" USING btree ("placeholder_member_id","game_type_id");