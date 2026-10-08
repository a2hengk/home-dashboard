-- Baut die App-Tabellen auf das neue Datenmodell um (echte Daten statt Beispieldaten).
-- Die Login-Tabellen (user, session, account, verification) bleiben unverändert.
-- Sicherheitsnetz: Stehen in den alten Tabellen schon Daten, bricht die Migration ab, statt sie zu löschen.
DO $$
DECLARE n bigint; total bigint := 0;
BEGIN
  IF to_regclass('public.subjects') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.subjects' INTO n; total := total + n; END IF;
  IF to_regclass('public.todos') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.todos' INTO n; total := total + n; END IF;
  IF to_regclass('public.events') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.events' INTO n; total := total + n; END IF;
  IF to_regclass('public.reminders') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.reminders' INTO n; total := total + n; END IF;
  IF to_regclass('public.timetable_slots') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.timetable_slots' INTO n; total := total + n; END IF;
  IF to_regclass('public.grades') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.grades' INTO n; total := total + n; END IF;
  IF to_regclass('public.folders') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.folders' INTO n; total := total + n; END IF;
  IF to_regclass('public.documents') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.documents' INTO n; total := total + n; END IF;
  IF to_regclass('public.tags') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.tags' INTO n; total := total + n; END IF;
  IF to_regclass('public.document_tags') IS NOT NULL THEN EXECUTE 'SELECT count(*) FROM public.document_tags' INTO n; total := total + n; END IF;
  IF total > 0 THEN
    RAISE EXCEPTION 'Alte App-Tabellen enthalten % Zeilen, Umbau abgebrochen. Bitte manuell migrieren.', total;
  END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "document_tags", "tags", "reminders", "documents", "folders", "grades", "timetable_slots", "events", "todos", "subjects" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."event_type", "public"."grade_type", "public"."reminder_channel", "public"."todo_area";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('pruefung', 'abgabe', 'privat');--> statement-breakpoint
CREATE TYPE "public"."grade_type" AS ENUM('klassenarbeit', 'test', 'muendlich');--> statement-breakpoint
CREATE TYPE "public"."reminder_channel" AS ENUM('mail', 'discord');--> statement-breakpoint
CREATE TYPE "public"."todo_area" AS ENUM('schule', 'privat');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"subject_id" uuid,
	"folder_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_pathname_unique" UNIQUE("pathname")
);--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" "event_type" DEFAULT 'privat' NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"important" boolean DEFAULT false NOT NULL,
	"subject_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value" real NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"type" "grade_type" NOT NULL,
	"date" date NOT NULL,
	"subject_id" uuid NOT NULL
);--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"remind_at" timestamp with time zone NOT NULL,
	"channel" "reminder_channel" DEFAULT 'mail' NOT NULL,
	"sent_at" timestamp with time zone,
	"event_id" uuid,
	"todo_id" uuid
);--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kuerzel" text NOT NULL,
	"name" text NOT NULL,
	"farbe" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_kuerzel_unique" UNIQUE("kuerzel")
);--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" integer NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"room" text,
	"subject_id" uuid NOT NULL
);--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"area" "todo_area" DEFAULT 'privat' NOT NULL,
	"subject_id" uuid,
	"due" date,
	"important" boolean DEFAULT false NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "reminders_due_idx" ON "reminders" USING btree ("remind_at");--> statement-breakpoint
CREATE INDEX "todos_due_idx" ON "todos" USING btree ("due");
