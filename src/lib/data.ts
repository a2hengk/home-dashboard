import "server-only";
import { asc, desc, eq, gte, isNull, isNotNull, and, sql } from "drizzle-orm";
import { db } from "@/db";
import * as t from "@/db/schema";
import { requireUser } from "./session";
import { addDays } from "./dates";
import type { Achievement, Doc, EventItem, Folder, Grade, Note, NoteMeta, Slot, Subject, SubjectRef, Todo } from "./types";

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

/** Markdown grob zu Klartext, reicht für Vorschau und Suche */
function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getNotes(): Promise<NoteMeta[]> {
  await requireUser();
  const rows = await db
    .select({
      id: t.notes.id,
      title: t.notes.title,
      // Nur der Anfang, damit die Ablage nicht alle Texte komplett lädt
      head: sql<string>`left(${t.notes.body}, 600)`,
      folderId: t.notes.folderId,
      updatedAt: t.notes.updatedAt,
      ...subjectJoinCols,
    })
    .from(t.notes)
    .leftJoin(t.subjects, eq(t.notes.subjectId, t.subjects.id))
    .orderBy(desc(t.notes.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    folderId: r.folderId,
    subject: ref(r),
    updated: berlinDate(r.updatedAt),
    excerpt: plain(r.head).slice(0, 240),
  }));
}

export async function getNote(id: string): Promise<Note | null> {
  await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db
    .select({
      id: t.notes.id,
      title: t.notes.title,
      body: t.notes.body,
      folderId: t.notes.folderId,
      updatedAt: t.notes.updatedAt,
      ...subjectJoinCols,
    })
    .from(t.notes)
    .leftJoin(t.subjects, eq(t.notes.subjectId, t.subjects.id))
    .where(eq(t.notes.id, id))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    folderId: r.folderId,
    subject: ref(r),
    updated: berlinDate(r.updatedAt),
    excerpt: plain(r.body).slice(0, 240),
  };
}

/** Notizen, die per [[Titel]] auf diese Notiz zeigen (wie Backlinks in Obsidian) */
export async function getBacklinks(note: { id: string; title: string }): Promise<{ id: string; title: string }[]> {
  await requireUser();
  // [[Titel]] oder [[Titel|Text]], Groß/klein egal
  const esc = note.title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `\\[\\[\\s*${esc}\\s*(\\||\\]\\])`;
  return db
    .select({ id: t.notes.id, title: t.notes.title })
    .from(t.notes)
    .where(and(sql`${t.notes.body} ~* ${pattern}`, sql`${t.notes.id} <> ${note.id}`))
    .orderBy(asc(t.notes.title));
}

/** Nur Titel, für [[Links]] zwischen Notizen */
export async function getNoteTitles(): Promise<{ id: string; title: string }[]> {
  await requireUser();
  return db.select({ id: t.notes.id, title: t.notes.title }).from(t.notes).orderBy(asc(t.notes.title));
}

const areaGroup = { privat: "Privat", arbeit: "Arbeit", schule: "Schule" } as const;

/** Eigene Einträge plus erledigte Todos, alles was in die Blasen soll */
export async function getAchievements(): Promise<Achievement[]> {
  await requireUser();
  const [own, done] = await Promise.all([
    db.select().from(t.achievements).orderBy(desc(t.achievements.date)),
    db
      .select({
        id: t.todos.id,
        title: t.todos.title,
        area: t.todos.area,
        important: t.todos.important,
        doneAt: t.todos.doneAt,
        ...subjectJoinCols,
      })
      .from(t.todos)
      .leftJoin(t.subjects, eq(t.todos.subjectId, t.subjects.id))
      .where(isNotNull(t.todos.doneAt))
      .orderBy(desc(t.todos.doneAt)),
  ]);
  return [
    ...own.map((a): Achievement => ({
      id: a.id,
      source: "eintrag",
      title: a.title,
      kind: a.kind,
      gruppe: a.gruppe,
      gewicht: Math.min(3, Math.max(1, a.gewicht)) as 1 | 2 | 3,
      note: a.note,
      date: a.date,
    })),
    ...done.map((d): Achievement => ({
      id: d.id,
      source: "todo",
      title: d.title,
      kind: "geschafft",
      // Schul-Todos landen beim Fach, der Rest beim Bereich
      gruppe: d.sK ?? areaGroup[d.area],
      gewicht: d.important ? 2 : 1,
      note: null,
      date: berlinDate(d.doneAt!),
      color: d.sF ?? undefined,
    })),
  ];
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
