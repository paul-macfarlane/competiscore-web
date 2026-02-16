-- Create event_member table for individual event membership
CREATE TABLE IF NOT EXISTS "event_member" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"event_id" text NOT NULL,
	"user_id" text,
	"placeholder_member_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_member_user_unique" UNIQUE("event_id","user_id"),
	CONSTRAINT "event_member_placeholder_unique" UNIQUE("event_id","placeholder_member_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_member_event_idx" ON "event_member" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_member_user_idx" ON "event_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_member_placeholder_idx" ON "event_member" USING btree ("placeholder_member_id");--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_member" ADD CONSTRAINT "event_member_placeholder_member_id_placeholder_member_id_fk" FOREIGN KEY ("placeholder_member_id") REFERENCES "public"."placeholder_member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Modify event_point_entry: remove point_rule_id, add category and outcome
ALTER TABLE "event_point_entry" ADD COLUMN "category" "event_point_category";--> statement-breakpoint
ALTER TABLE "event_point_entry" ADD COLUMN "outcome" "event_point_outcome";--> statement-breakpoint

-- Populate category/outcome from existing point rules before making NOT NULL
UPDATE "event_point_entry" epe
SET category = epr.category, outcome = epr.outcome
FROM "event_point_rule" epr
WHERE epe.point_rule_id = epr.id;--> statement-breakpoint

-- Set defaults for any entries that couldn't be matched
UPDATE "event_point_entry"
SET category = 'h2h_match', outcome = 'win'
WHERE category IS NULL OR outcome IS NULL;--> statement-breakpoint

-- Now make columns NOT NULL
ALTER TABLE "event_point_entry" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "event_point_entry" ALTER COLUMN "outcome" SET NOT NULL;--> statement-breakpoint

-- Drop the point_rule_id FK and column
ALTER TABLE "event_point_entry" DROP CONSTRAINT IF EXISTS "event_point_entry_point_rule_id_event_point_rule_id_fk";--> statement-breakpoint
ALTER TABLE "event_point_entry" DROP COLUMN IF EXISTS "point_rule_id";--> statement-breakpoint

-- Add event_point_config to tournament
ALTER TABLE "tournament" ADD COLUMN "event_point_config" text;--> statement-breakpoint

-- Drop event_point_rule table
DROP TABLE IF EXISTS "event_point_rule" CASCADE;
