DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_point_rule') THEN ALTER TABLE "event_point_rule" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_point_entry') THEN ALTER TABLE "event_point_entry" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_team_member') THEN ALTER TABLE "event_team_member" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_team') THEN ALTER TABLE "event_team" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_member') THEN ALTER TABLE "event_member" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event_game_type_config') THEN ALTER TABLE "event_game_type_config" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'event') THEN ALTER TABLE "event" DISABLE ROW LEVEL SECURITY; END IF; END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "event_point_rule" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_point_entry" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_member" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_game_type_config" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_team_member" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event_team" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "event" CASCADE;--> statement-breakpoint
ALTER TABLE "high_score_entry" DROP CONSTRAINT IF EXISTS "high_score_entry_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "match" DROP CONSTRAINT IF EXISTS "match_event_id_event_id_fk";
--> statement-breakpoint
ALTER TABLE "tournament" DROP CONSTRAINT IF EXISTS "tournament_event_id_event_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "high_score_entry_event_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "match_event_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tournament_event_idx";--> statement-breakpoint
ALTER TABLE "high_score_entry" DROP COLUMN IF EXISTS "event_id";--> statement-breakpoint
ALTER TABLE "match" DROP COLUMN IF EXISTS "event_id";--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN IF EXISTS "event_id";--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN IF EXISTS "event_point_config";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."event_point_category";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."event_point_outcome";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."event_scoring_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."event_status";