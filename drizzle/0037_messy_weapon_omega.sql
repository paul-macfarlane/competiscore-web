ALTER TYPE "public"."tournament_type" ADD VALUE 'swiss';--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "placement_point_config" text;--> statement-breakpoint
ALTER TABLE "tournament_round_match" ADD COLUMN "is_draw" boolean DEFAULT false NOT NULL;