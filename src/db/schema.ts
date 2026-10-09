import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  real,
  date,
  index,
} from "drizzle-orm/pg-core";

// Nur ein Nutzer (du), deshalb keine user_id an den Daten. Zugriff regelt der Login.

/** Lernfelder und Fächer, der Mittelpunkt für alles Schulische */
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  kuerzel: text("kuerzel").notNull().unique(), // z.b. "LF5"
  name: text("name").notNull(),
  farbe: text("farbe").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const todoArea = pgEnum("todo_area", ["schule", "privat", "arbeit"]);

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    area: todoArea("area").notNull().default("privat"),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    due: date("due", { mode: "string" }),
    important: boolean("important").notNull().default(false),
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("todos_due_idx").on(t.due)],
);

export const eventType = pgEnum("event_type", ["pruefung", "abgabe", "privat"]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    type: eventType("type").notNull().default("privat"),
    date: date("date", { mode: "string" }).notNull(),
    time: text("time"), // "HH:MM", leer = ganztägig
    important: boolean("important").notNull().default(false),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_date_idx").on(t.date)],
);

export const reminderChannel = pgEnum("reminder_channel", ["mail", "discord"]);

// Für später: der Cron fragt nur remind_at <= now() and sent_at is null
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

/**
 * Jede Woche oder alle 2 Wochen. A/B zählt fortlaufend ab Montag, 1.1.2024
 * (nicht nach KW, sonst verrutscht es in Jahren mit 53 Wochen).
 */
export const weekRhythm = pgEnum("week_rhythm", ["jede", "a", "b"]);

export const timetableSlots = pgTable("timetable_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekday: integer("weekday").notNull(), // 1 = Montag … 5 = Freitag
  rhythm: weekRhythm("rhythm").notNull().default("jede"),
  start: text("start").notNull(), // "07:45"
  end: text("end").notNull(),
  room: text("room"),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
});

export const gradeType = pgEnum("grade_type", ["klassenarbeit", "test", "muendlich"]);

export const grades = pgTable("grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  value: real("value").notNull(),
  weight: real("weight").notNull().default(1),
  type: gradeType("type").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
});

/** Eigene Ordner in der Ablage, optional einem Fach zugeordnet */
export const folders = pgTable("folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Dateien liegen privat in Vercel Blob, hier nur die Infos dazu */
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pathname: text("pathname").notNull().unique(), // Pfad im privaten Blob-Store
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

// Login-Tabellen von Better Auth (generiert mit `npx @better-auth/cli generate`)
export * from "./auth-schema";
