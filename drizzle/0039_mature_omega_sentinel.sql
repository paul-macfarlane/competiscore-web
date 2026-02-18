CREATE TABLE "event_high_score_entry_member" (
	"id" text PRIMARY KEY NOT NULL,
	"event_high_score_entry_id" text NOT NULL,
	"user_id" text,
	"event_placeholder_participant_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_high_score_entry_member" ADD CONSTRAINT "event_high_score_entry_member_event_high_score_entry_id_event_high_score_entry_id_fk" FOREIGN KEY ("event_high_score_entry_id") REFERENCES "public"."event_high_score_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry_member" ADD CONSTRAINT "event_high_score_entry_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_high_score_entry_member" ADD CONSTRAINT "event_high_score_entry_member_event_placeholder_participant_id_event_placeholder_participant_id_fk" FOREIGN KEY ("event_placeholder_participant_id") REFERENCES "public"."event_placeholder_participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_hs_entry_member_entry_idx" ON "event_high_score_entry_member" USING btree ("event_high_score_entry_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_member_user_idx" ON "event_high_score_entry_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_hs_entry_member_placeholder_idx" ON "event_high_score_entry_member" USING btree ("event_placeholder_participant_id");