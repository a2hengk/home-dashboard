import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  time,
  date,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Lernfelder und Fächer – der Mittelpunkt für alles Schulische.
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kuerzel: text("kuerzel").notNull().unique(), // z.b. "LF5"
  farbe: text("farbe"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  notes: text("notes"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  priority: integer("priority").notNull().default(0),
  doneAt: timestamp("done_at", { withTimezone: true }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventType = pgEnum("event_type", ["pruefung", "abgabe", "privat"]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  type: eventType("type").notNull().default("privat"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  location: text("location"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
});

export const reminderChannel = pgEnum("reminder_channel", ["mail", "discord"]);

// Der Cron fragt nur: remind_at <= now() and sent_at is null
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    channel: reminderChannel("channel").notNull().default("mail"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    todoId: uuid("todo_id").references(() => todos.id, { onDelete: "cascade" }),
  },
  (t) => [index("reminders_due_idx").on(t.remindAt)],
);

// Eigene Ordner in der Ablage. Optional einem Fach zugeordnet (Farbe am Reiter).
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Ein Dokument liegt in höchstens einem Ordner; ohne Ordner nur in der Übersicht.
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
});

export const documentTags = pgTable(
  "document_tags",
  {
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.tagId] })],
);

export const timetableSlots = pgTable("timetable_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekday: integer("weekday").notNull(), // 1 = Montag
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  room: text("room"),
  teacher: text("teacher"),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
});

export const gradeType = pgEnum("grade_type", ["klausur", "test", "muendlich"]);

export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  value: numeric("value", { precision: 3, scale: 1 }).notNull(),
  weight: numeric("weight", { precision: 4, scale: 2 }).notNull().default("1"),
  type: gradeType("type").notNull(),
  date: date("date").notNull(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
});
