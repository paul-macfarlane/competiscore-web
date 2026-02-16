-- Rename event_member_role enum to event_participant_role
ALTER TYPE "public"."event_member_role" RENAME TO "event_participant_role";--> statement-breakpoint

-- Rename tables
ALTER TABLE "event_member" RENAME TO "event_participant";--> statement-breakpoint
ALTER TABLE "event_placeholder_member" RENAME TO "event_placeholder_participant";--> statement-breakpoint

-- Rename event_placeholder_member_id columns in all tables
ALTER TABLE "event_high_score_entry" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint
ALTER TABLE "event_match_participant" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint
ALTER TABLE "event_point_entry" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint
ALTER TABLE "event_team_member" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint
ALTER TABLE "event_invitation" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint
ALTER TABLE "event_tournament_participant" RENAME COLUMN "event_placeholder_member_id" TO "event_placeholder_participant_id";--> statement-breakpoint

-- Rename indexes on event_participant (formerly event_member)
ALTER INDEX "event_member_unique" RENAME TO "event_participant_unique";--> statement-breakpoint
ALTER INDEX "event_member_event_idx" RENAME TO "event_participant_event_idx";--> statement-breakpoint
ALTER INDEX "event_member_user_idx" RENAME TO "event_participant_user_idx";--> statement-breakpoint

-- Rename indexes on event_placeholder_participant (formerly event_placeholder_member)
ALTER INDEX "event_placeholder_member_event_idx" RENAME TO "event_placeholder_participant_event_idx";--> statement-breakpoint
ALTER INDEX "event_placeholder_member_linked_user_idx" RENAME TO "event_placeholder_participant_linked_user_idx";--> statement-breakpoint

-- Rename FK constraints on event_participant (formerly event_member)
ALTER TABLE "event_participant" RENAME CONSTRAINT "event_member_event_id_event_id_fk" TO "event_participant_event_id_event_id_fk";--> statement-breakpoint
ALTER TABLE "event_participant" RENAME CONSTRAINT "event_member_user_id_user_id_fk" TO "event_participant_user_id_user_id_fk";--> statement-breakpoint

-- Rename FK constraints on event_placeholder_participant (formerly event_placeholder_member)
ALTER TABLE "event_placeholder_participant" RENAME CONSTRAINT "event_placeholder_member_event_id_event_id_fk" TO "event_placeholder_participant_event_id_event_id_fk";--> statement-breakpoint
ALTER TABLE "event_placeholder_participant" RENAME CONSTRAINT "event_placeholder_member_linked_user_id_user_id_fk" TO "event_placeholder_participant_linked_user_id_user_id_fk";--> statement-breakpoint

-- Rename FK constraints that referenced the event_placeholder_member_id column
ALTER TABLE "event_high_score_entry" RENAME CONSTRAINT "event_high_score_entry_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_high_score_entry_event_placeholder_participant_id_event_placeholder_participant_id_fk";--> statement-breakpoint
ALTER TABLE "event_match_participant" RENAME CONSTRAINT "event_match_participant_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_match_participant_event_placeholder_participant_id_event_placeholder_participant_id_fk";--> statement-breakpoint
ALTER TABLE "event_point_entry" RENAME CONSTRAINT "event_point_entry_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_point_entry_event_placeholder_participant_id_event_placeholder_participant_id_fk";--> statement-breakpoint
ALTER TABLE "event_team_member" RENAME CONSTRAINT "event_team_member_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_team_member_event_placeholder_participant_id_event_placeholder_participant_id_fk";--> statement-breakpoint
ALTER TABLE "event_invitation" RENAME CONSTRAINT "event_invitation_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_invitation_event_placeholder_participant_id_event_placeholder_participant_id_fk";--> statement-breakpoint
ALTER TABLE "event_tournament_participant" RENAME CONSTRAINT "event_tournament_participant_event_placeholder_member_id_event_placeholder_member_id_fk" TO "event_tournament_participant_event_placeholder_participant_id_event_placeholder_participant_id_fk";
