CREATE TABLE "event_point_entry_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"event_point_entry_id" text NOT NULL,
	"user_id" text,
	"event_placeholder_participant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_point_entry" DROP CONSTRAINT "event_point_entry_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "event_point_entry" DROP CONSTRAINT "event_point_entry_event_placeholder_participant_id_event_placeholder_participant_id_fk";
--> statement-breakpoint
DROP INDEX "event_point_entry_user_idx";--> statement-breakpoint
ALTER TABLE "event_point_entry_participant" ADD CONSTRAINT "event_point_entry_participant_event_point_entry_id_event_point_entry_id_fk" FOREIGN KEY ("event_point_entry_id") REFERENCES "public"."event_point_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry_participant" ADD CONSTRAINT "event_point_entry_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_point_entry_participant" ADD CONSTRAINT "event_point_entry_participant_event_placeholder_participant_id_event_placeholder_participant_id_fk" FOREIGN KEY ("event_placeholder_participant_id") REFERENCES "public"."event_placeholder_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_pep_entry_idx" ON "event_point_entry_participant" USING btree ("event_point_entry_id");--> statement-breakpoint
CREATE INDEX "event_pep_user_idx" ON "event_point_entry_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_pep_placeholder_idx" ON "event_point_entry_participant" USING btree ("event_placeholder_participant_id");--> statement-breakpoint
ALTER TABLE "event_point_entry" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "event_point_entry" DROP COLUMN "event_placeholder_participant_id";