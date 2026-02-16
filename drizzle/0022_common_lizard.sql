ALTER TABLE "high_score_entry" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "high_score_entry" ADD CONSTRAINT "high_score_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "high_score_entry_event_idx" ON "high_score_entry" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "match_event_idx" ON "match" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "tournament_event_idx" ON "tournament" USING btree ("event_id");