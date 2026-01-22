CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."league_member_role" AS ENUM('member', 'manager', 'executive');--> statement-breakpoint
CREATE TYPE "public"."league_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "league" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"visibility" "league_visibility" DEFAULT 'private' NOT NULL,
	"logo" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"inviter_id" text NOT NULL,
	"invitee_user_id" text,
	"invitee_email" text,
	"role" "league_member_role" DEFAULT 'member' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "league_member" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"league_id" text NOT NULL,
	"role" "league_member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placeholder_member" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "league_invitation" ADD CONSTRAINT "league_invitation_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_invitation" ADD CONSTRAINT "league_invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_invitation" ADD CONSTRAINT "league_invitation_invitee_user_id_user_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_member" ADD CONSTRAINT "league_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_member" ADD CONSTRAINT "league_member_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placeholder_member" ADD CONSTRAINT "placeholder_member_league_id_league_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."league"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_name_idx" ON "league" USING btree ("name");--> statement-breakpoint
CREATE INDEX "league_invitation_league_idx" ON "league_invitation" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "league_invitation_invitee_idx" ON "league_invitation" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "league_member_unique" ON "league_member" USING btree ("user_id","league_id");--> statement-breakpoint
CREATE INDEX "league_member_user_idx" ON "league_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "league_member_league_idx" ON "league_member" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "placeholder_member_league_idx" ON "placeholder_member" USING btree ("league_id");