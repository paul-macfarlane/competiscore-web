CREATE TABLE IF NOT EXISTS "event_game_type_config" (
	"id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
	"event_id" text NOT NULL,
	"game_type_id" text NOT NULL,
	"point_config" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_game_type_config_unique" UNIQUE("event_id","game_type_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_game_type_config_event_idx" ON "event_game_type_config" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "event_game_type_config" ADD CONSTRAINT "event_game_type_config_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_game_type_config" ADD CONSTRAINT "event_game_type_config_game_type_id_game_type_id_fk" FOREIGN KEY ("game_type_id") REFERENCES "public"."game_type"("id") ON DELETE cascade ON UPDATE no action;
