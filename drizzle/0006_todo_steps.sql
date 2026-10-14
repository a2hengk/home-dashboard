CREATE TABLE "todo_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"todo_id" uuid NOT NULL,
	"title" text NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo_steps" ADD CONSTRAINT "todo_steps_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todo_steps_todo_idx" ON "todo_steps" USING btree ("todo_id");