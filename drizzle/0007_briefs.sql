CREATE TYPE "public"."brief_kind" AS ENUM('morgen', 'vorarbeit');--> statement-breakpoint
CREATE TABLE "briefs" (
	"kind" "brief_kind" PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
