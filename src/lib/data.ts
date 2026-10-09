import "server-only";
import { asc, desc, eq, gte, isNull, and, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/schema";
import { requireUser } from "./session";
import { addDays } from "./dates";
import type { Doc, EventItem, Folder, Grade, Slot, Subject, SubjectRef, Todo } from "./types";

// Jede Abfrage prüft selbst den Login. Seiten tun das auch, doppelt hält besser,
// weil Layout und Seite parallel rendern.

const subjectCols = {
  id: t.subjects.id,
  kuerzel: t.subjects.kuerzel,
  name: t.subjects.name,
  farbe: t.subjects.farbe,
};

function ref(row: { sId: string | null; sK: string | null; sN: string | null; sF: string | null }): SubjectRef | null {
  return row.sId ? { id: row.sId, kuerzel: row.sK!, name: row.sN!, farbe: row.sF! } : null;
}
const subjectJoinCols = {
  sId: t.subjects.id,
  sK: t.subjects.kuerzel,
  sN: t.subjects.name,
  sF: t.subjects.farbe,
};

export async function getSubjects(): Promise<Subject[]> {
  await requireUser();
  return db.select(subjectCols).from(t.subjects).orderBy(asc(t.subjects.position), asc(t.subjects.kuerzel));
}

export async function getSubjectByKuerzel(kuerzel: string): Promise<Subject | null> {
  await requireUser();
  const rows = await db
    .select(subjectCols)
    .from(t.subjects)
    .where(sql`lower(${t.subjects.kuerzel}) = ${kuerzel.toLowerCase()}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function getTodos(opts: { subjectId?: string; openOnly?: boolean } = {}): Promise<Todo[]> {
  await requireUser();
  const where = [];
  if (opts.subjectId) where.push(eq(t.todos.subjectId, opts.subjectId));
  if (opts.openOnly) where.push(isNull(t.todos.doneAt));
  const rows = await db
    .select({
      id: t.todos.id,
      title: t.todos.title,
      area: t.todos.area,
      due: t.todos.due,
      important: t.todos.important,
      doneAt: t.todos.doneAt,
      ...subjectJoinCols,
    })
    .from(t.todos)
    .leftJoin(t.subjects, eq(t.todos.subjectId, t.subjects.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(sql`${t.todos.due} asc nulls last`, desc(t.todos.createdAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    area: r.area,
    due: r.due,
    important: r.important,
    done: !!r.doneAt,
    subject: ref(r),
  }));
}

export async function getEvents(opts: { from?: string; subjectId?: string } = {}): Promise<EventItem[]> {
  await requireUser();
  const where = [];
  if (opts.from) where.push(gte(t.events.date, opts.from));
  if (opts.subjectId) where.push(eq(t.events.subjectId, opts.subjectId));
  const rows = await db
    .select({
      id: t.events.id,
      title: t.events.title,
      type: t.events.type,
      date: t.events.date,
      time: t.events.time,
      important: t.events.important,
      ...subjectJoinCols,
    })
    .from(t.events)
    .leftJoin(t.subjects, eq(t.events.subjectId, t.subjects.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(t.events.date), sql`${t.events.time} asc nulls first`);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    date: r.date,
    time: r.time,
    important: r.important,
    subject: ref(r),
  }));
}

export async function getTimetable(): Promise<Slot[]> {
  await requireUser();
  const rows = await db
    .select({
      id: t.timetableSlots.id,
      weekday: t.timetableSlots.weekday,
      rhythm: t.timetableSlots.rhythm,
      start: t.timetableSlots.start,
      end: t.timetableSlots.end,
      room: t.timetableSlots.room,
      ...subjectJoinCols,
    })
    .from(t.timetableSlots)
    .innerJoin(t.subjects, eq(t.timetableSlots.subjectId, t.subjects.id))
    .orderBy(asc(t.timetableSlots.weekday), asc(t.timetableSlots.start));
  return rows.map((r) => ({
    id: r.id,
    weekday: r.weekday,
    rhythm: r.rhythm,
    start: r.start,
    end: r.end,
    room: r.room,
    subject: ref(r)!,
  }));
}

export async function getGrades(subjectId?: string): Promise<Grade[]> {
  await requireUser();
  return db
    .select({
      id: t.grades.id,
      value: t.grades.value,
      weight: t.grades.weight,
      type: t.grades.type,
      date: t.grades.date,
      subjectId: t.grades.subjectId,
    })
    .from(t.grades)
    .where(subjectId ? eq(t.grades.subjectId, subjectId) : undefined)
    .orderBy(desc(t.grades.date));
}

export async function getFolders(): Promise<Folder[]> {
  await requireUser();
  const rows = await db
    .select({ id: t.folders.id, name: t.folders.name, ...subjectJoinCols })
    .from(t.folders)
    .leftJoin(t.subjects, eq(t.folders.subjectId, t.subjects.id))
    .orderBy(asc(t.folders.createdAt));
  return rows.map((r) => ({ id: r.id, name: r.name, subject: ref(r) }));
}

const berlinDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(d);

export async function getDocs(subjectId?: string): Promise<Doc[]> {
  await requireUser();
  const rows = await db
    .select({
      id: t.documents.id,
      name: t.documents.name,
      contentType: t.documents.contentType,
      sizeBytes: t.documents.sizeBytes,
      folderId: t.documents.folderId,
      uploadedAt: t.documents.uploadedAt,
      ...subjectJoinCols,
    })
    .from(t.documents)
    .leftJoin(t.subjects, eq(t.documents.subjectId, t.subjects.id))
    .where(subjectId ? eq(t.documents.subjectId, subjectId) : undefined)
    .orderBy(desc(t.documents.uploadedAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    contentType: r.contentType,
    sizeBytes: r.sizeBytes,
    folderId: r.folderId,
    uploaded: berlinDate(r.uploadedAt),
    subject: ref(r),
  }));
}

/** Alles, was die Startseite braucht, in einem Rutsch */
export async function getToday(today: string) {
  await requireUser();
  const [todos, events, slots] = await Promise.all([
    getTodos({ openOnly: true }),
    getEvents({ from: today }),
    getTimetable(),
  ]);
  return { todos, events, slots, horizon: addDays(today, 30) };
}
