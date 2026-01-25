CREATE TYPE "public"."team_member_role" AS ENUM('member', 'manager');--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "role" "team_member_role" DEFAULT 'member' NOT NULL;