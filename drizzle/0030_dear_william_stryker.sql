ALTER TABLE "event_high_score_entry" ADD COLUMN "event_team_id" text;--> statement-breakpoint
ALTER TABLE "event_tournament" ADD COLUMN "participant_type" text DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "event_high_score_entry" ADD CONSTRAINT "event_high_score_entry_event_team_id_event_team_id_fk" FOREIGN KEY ("event_team_id") REFERENCES "public"."event_team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_hs_entry_team_idx" ON "event_high_score_entry" USING btree ("event_team_id");