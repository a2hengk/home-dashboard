CREATE TYPE "public"."achievement_kind" AS ENUM('geschafft', 'gelernt');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" "achievement_kind" DEFAULT 'geschafft' NOT NULL,
	"gruppe" text NOT NULL,
	"gewicht" integer DEFAULT 2 NOT NULL,
	"note" text,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "achievements_date_idx" ON "achievements" USING btree ("date");