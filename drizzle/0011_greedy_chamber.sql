CREATE TYPE "public"."limit_type" AS ENUM('max_leagues_per_user', 'max_members_per_league', 'max_game_types_per_league');--> statement-breakpoint
CREATE TABLE "limit_override" (
	"id" text PRIMARY KEY NOT NULL,
	"limit_type" "limit_type" NOT NULL,
	"user_id" text,
	"league_id" text,
	"limit_value" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "limit_override" ADD CONSTRAINT "limit_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "limit_override" ADD CONSTRAINT "limit_override_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "limit_override" ADD CONSTRAINT "limit_override_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "limit_override_user_idx" ON "limit_override" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "limit_override_league_idx" ON "limit_override" USING btree ("league_id");