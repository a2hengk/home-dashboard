// Gemeinsame Typen für Server und Client. Nur Daten, keine Funktionen.

export type Subject = { id: string; kuerzel: string; name: string; farbe: string };

export type SubjectRef = Pick<Subject, "id" | "kuerzel" | "name" | "farbe">;

export type Todo = {
  id: string;
  title: string;
  area: "schule" | "privat";
  subject: SubjectRef | null;
  due: string | null; // YYYY-MM-DD
  important: boolean;
  done: boolean;
};

export type EventType = "pruefung" | "abgabe" | "privat";

export type EventItem = {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string | null;
  important: boolean;
  subject: SubjectRef | null;
};

export type Slot = {
  id: string;
  weekday: number; // 1 = Montag
  start: string;
  end: string;
  room: string | null;
  subject: SubjectRef;
};

export type GradeType = "klassenarbeit" | "test" | "muendlich";

export type Grade = {
  id: string;
  value: number;
  weight: number;
  type: GradeType;
  date: string;
  subjectId: string;
};

export type Folder = { id: string; name: string; subject: SubjectRef | null };

export type Doc = {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  subject: SubjectRef | null;
  folderId: string | null;
  uploaded: string; // YYYY-MM-DD
};

export const gradeTypeLabel: Record<GradeType, string> = {
  klassenarbeit: "Klassenarbeit",
  test: "Test",
  muendlich: "Mündlich",
};

export const weekdayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"] as const;

export function average(grades: Pick<Grade, "value" | "weight">[]): number | null {
  const w = grades.reduce((s, g) => s + g.weight, 0);
  if (!w) return null;
  return grades.reduce((s, g) => s + g.value * g.weight, 0) / w;
}

export const formatGrade = (n: number) => n.toFixed(1).replace(".", ",");

export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
