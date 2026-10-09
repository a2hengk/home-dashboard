CREATE TYPE "public"."week_rhythm" AS ENUM('jede', 'a', 'b');--> statement-breakpoint
ALTER TYPE "public"."todo_area" ADD VALUE 'arbeit';--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD COLUMN "rhythm" "week_rhythm" DEFAULT 'jede' NOT NULL;