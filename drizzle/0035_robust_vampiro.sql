CREATE TABLE "event_tournament_participant_member" (
	"id" text PRIMARY KEY NOT NULL,
	"event_tournament_participant_id" text NOT NULL,
	"user_id" text,
	"event_placeholder_participant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_match" DROP CONSTRAINT "event_match_event_tournament_round_match_id_event_tournament_round_match_id_fk";
--> statement-breakpoint
ALTER TABLE "event_tournament_participant_member" ADD CONSTRAINT "event_tournament_participant_member_event_tournament_participant_id_event_tournament_participant_id_fk" FOREIGN KEY ("event_tournament_participant_id") REFERENCES "public"."event_tournament_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_participant_member" ADD CONSTRAINT "event_tournament_participant_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tournament_participant_member" ADD CONSTRAINT "event_tournament_participant_member_event_placeholder_participant_id_event_placeholder_participant_id_fk" FOREIGN KEY ("event_placeholder_participant_id") REFERENCES "public"."event_placeholder_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_tpm_participant_idx" ON "event_tournament_participant_member" USING btree ("event_tournament_participant_id");--> statement-breakpoint
CREATE INDEX "event_tpm_user_idx" ON "event_tournament_participant_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_tpm_placeholder_idx" ON "event_tournament_participant_member" USING btree ("event_placeholder_participant_id");