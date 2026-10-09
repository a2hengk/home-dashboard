"use server";

import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { del } from "@vercel/blob";
import { db } from "@/db";
import * as t from "@/db/schema";
import { requireUser } from "@/lib/session";

// Jede Aktion: Login prüfen, Eingaben prüfen, schreiben, Seite neu laden.
// Rückgabe { error } statt Exceptions, damit die Oberfläche eine Meldung zeigen kann.

type Result = { ok: true } | { error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt");
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Uhrzeit im Format HH:MM");
const optionalId = z
  .string()
  .uuid()
  .nullish()
  .or(z.literal("").transform(() => null));

async function run(fn: () => Promise<unknown>): Promise<Result> {
  await requireUser();
  try {
    await fn();
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Eingabe ungültig" };
    console.error(e);
    return { error: "Speichern hat nicht geklappt. Ist die Datenbank verbunden?" };
  }
  refresh();
  return { ok: true };
}

/* ---------- Todos ---------- */

const todoInput = z.object({
  title: z.string().trim().min(1, "Titel fehlt").max(200),
  subjectId: optionalId,
  area: z.enum(["schule", "privat", "arbeit"]).default("privat"),
  due: isoDate.nullish(),
  important: z.boolean().default(false),
});

export async function createTodo(input: z.input<typeof todoInput>) {
  return run(async () => {
    const v = todoInput.parse(input);
    await db.insert(t.todos).values({
      title: v.title,
      subjectId: v.subjectId ?? null,
      area: v.subjectId ? "schule" : v.area,
      due: v.due ?? null,
      important: v.important,
    });
  });
}

export async function setTodoDone(id: string, done: boolean) {
  return run(async () => {
    await db
      .update(t.todos)
      .set({ doneAt: done ? new Date() : null })
      .where(eq(t.todos.id, z.string().uuid().parse(id)));
  });
}

export async function deleteTodo(id: string) {
  return run(async () => {
    await db.delete(t.todos).where(eq(t.todos.id, z.string().uuid().parse(id)));
  });
}

/* ---------- Termine ---------- */

const eventInput = z.object({
  title: z.string().trim().min(1, "Titel fehlt").max(200),
  type: z.enum(["pruefung", "abgabe", "privat"]),
  date: isoDate,
  time: hhmm.nullish().or(z.literal("").transform(() => null)),
  subjectId: optionalId,
  important: z.boolean().default(false),
});

export async function createEvent(input: z.input<typeof eventInput>) {
  return run(async () => {
    const v = eventInput.parse(input);
    await db.insert(t.events).values({ ...v, time: v.time ?? null, subjectId: v.subjectId ?? null });
  });
}

export async function setEventImportant(id: string, important: boolean) {
  return run(async () => {
    await db.update(t.events).set({ important }).where(eq(t.events.id, z.string().uuid().parse(id)));
  });
}

export async function deleteEvent(id: string) {
  return run(async () => {
    await db.delete(t.events).where(eq(t.events.id, z.string().uuid().parse(id)));
  });
}

/* ---------- Fächer ---------- */

const subjectInput = z.object({
  kuerzel: z
    .string()
    .trim()
    .min(1, "Kürzel fehlt")
    .max(8, "Kürzel höchstens 8 Zeichen")
    .regex(/^[A-Za-z0-9]+$/, "Kürzel nur aus Buchstaben und Zahlen"),
  name: z.string().trim().min(1, "Name fehlt").max(120),
  farbe: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe ungültig"),
});

export async function createSubject(input: z.input<typeof subjectInput>) {
  return run(async () => {
    const v = subjectInput.parse(input);
    const exists = await db.select({ id: t.subjects.id }).from(t.subjects).where(eq(t.subjects.kuerzel, v.kuerzel));
    if (exists.length) throw new z.ZodError([{ code: "custom", path: ["kuerzel"], message: `${v.kuerzel} gibt es schon`, input: v.kuerzel }]);
    await db.insert(t.subjects).values({ ...v, position: 100 });
  });
}

export async function updateSubject(id: string, input: z.input<typeof subjectInput>) {
  return run(async () => {
    const v = subjectInput.parse(input);
    await db.update(t.subjects).set(v).where(eq(t.subjects.id, z.string().uuid().parse(id)));
  });
}

export async function deleteSubject(id: string) {
  // Todos, Termine, Dokumente bleiben erhalten (ohne Fach), Stundenplan und Noten gehen mit
  return run(async () => {
    await db.delete(t.subjects).where(eq(t.subjects.id, z.string().uuid().parse(id)));
  });
}

/* ---------- Stundenplan ---------- */

const slotInput = z
  .object({
    weekday: z.number().int().min(1).max(5),
    rhythm: z.enum(["jede", "a", "b"]).default("jede"),
    start: hhmm,
    end: hhmm,
    subjectId: z.string().uuid("Fach fehlt"),
    room: z.string().trim().max(20).nullish(),
  })
  .refine((v) => v.end > v.start, { message: "Ende muss nach dem Beginn liegen" });

export async function createSlot(input: z.input<typeof slotInput>) {
  return run(async () => {
    const v = slotInput.parse(input);
    await db.insert(t.timetableSlots).values({ ...v, room: v.room || null });
  });
}

export async function deleteSlot(id: string) {
  return run(async () => {
    await db.delete(t.timetableSlots).where(eq(t.timetableSlots.id, z.string().uuid().parse(id)));
  });
}

/* ---------- Noten ---------- */

const gradeInput = z.object({
  subjectId: z.string().uuid(),
  value: z.number().min(1, "Note zwischen 1 und 6").max(6, "Note zwischen 1 und 6"),
  weight: z.number().min(0.1).max(10).default(1),
  type: z.enum(["klassenarbeit", "test", "muendlich"]),
  date: isoDate,
});

export async function createGrade(input: z.input<typeof gradeInput>) {
  return run(async () => {
    await db.insert(t.grades).values(gradeInput.parse(input));
  });
}

export async function deleteGrade(id: string) {
  return run(async () => {
    await db.delete(t.grades).where(eq(t.grades.id, z.string().uuid().parse(id)));
  });
}

/* ---------- Ordner & Dokumente ---------- */

const folderInput = z.object({
  name: z.string().trim().min(1, "Name fehlt").max(60),
  subjectId: optionalId,
});

export async function createFolder(input: z.input<typeof folderInput>) {
  return run(async () => {
    const v = folderInput.parse(input);
    await db.insert(t.folders).values({ name: v.name, subjectId: v.subjectId ?? null });
  });
}

export async function renameFolder(id: string, name: string) {
  return run(async () => {
    const v = folderInput.pick({ name: true }).parse({ name });
    await db.update(t.folders).set({ name: v.name }).where(eq(t.folders.id, z.string().uuid().parse(id)));
  });
}

export async function deleteFolder(id: string) {
  // Dateien bleiben erhalten und landen wieder in der Übersicht ohne Ordner
  return run(async () => {
    await db.delete(t.folders).where(eq(t.folders.id, z.string().uuid().parse(id)));
  });
}

const docInput = z.object({
  name: z.string().trim().min(1).max(200),
  // Nur Dateien, die über unsere Upload-Route im Ordner "ablage/" gelandet sind
  pathname: z.string().startsWith("ablage/").max(400),
  contentType: z.string().max(200),
  sizeBytes: z.number().int().nonnegative(),
  folderId: optionalId,
  subjectId: optionalId,
});

/** Nach dem Upload in den Blob-Store: Eintrag in der Datenbank anlegen */
export async function registerDocument(input: z.input<typeof docInput>) {
  return run(async () => {
    const v = docInput.parse(input);
    await db.insert(t.documents).values({ ...v, folderId: v.folderId ?? null, subjectId: v.subjectId ?? null });
  });
}

export async function moveDocument(id: string, folderId: string | null) {
  return run(async () => {
    await db
      .update(t.documents)
      .set({ folderId: optionalId.parse(folderId) ?? null })
      .where(eq(t.documents.id, z.string().uuid().parse(id)));
  });
}

export async function setDocumentSubject(id: string, subjectId: string | null) {
  return run(async () => {
    await db
      .update(t.documents)
      .set({ subjectId: optionalId.parse(subjectId) ?? null })
      .where(eq(t.documents.id, z.string().uuid().parse(id)));
  });
}

export async function deleteDocument(id: string) {
  return run(async () => {
    const [doc] = await db
      .select({ pathname: t.documents.pathname })
      .from(t.documents)
      .where(eq(t.documents.id, z.string().uuid().parse(id)));
    if (!doc) return;
    // Erst die Datei, dann der Eintrag. Ist die Datei schon weg, trotzdem aufräumen.
    await del(doc.pathname).catch((e) => console.warn("Blob löschen:", e));
    await db.delete(t.documents).where(eq(t.documents.id, id));
  });
}
