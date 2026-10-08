// Beispieldaten für die Probe-UI. Wird später durch Drizzle-Abfragen ersetzt –
// die Typen orientieren sich schon an src/db/schema.ts.
// Alle Daten sind relativ zu "heute", damit die Seiten jeden Tag lebendig aussehen.

import { addDays, weekday } from "./dates";

export type Subject = {
  kuerzel: string;
  name: string;
  farbe: string;
};

export type Todo = {
  id: string;
  title: string;
  area: "schule" | "privat";
  subject?: string; // kuerzel
  due?: string; // YYYY-MM-DD
  important?: boolean;
  done?: boolean;
};

export type EventItem = {
  id: string;
  title: string;
  type: "pruefung" | "abgabe" | "privat";
  date: string;
  time?: string;
  subject?: string;
  important?: boolean; // wird farbig hervorgehoben
};

export type Folder = {
  id: string;
  name: string;
  subject?: string; // kuerzel, färbt den Reiter
};

export type Doc = {
  id: string;
  name: string;
  subject?: string;
  folder?: string; // folder id
  tags: string[];
  sizeBytes: number;
  uploaded: string;
};

export type Slot = {
  weekday: number;
  start: string;
  end: string;
  subject: string;
  room: string;
};

export type Grade = {
  id: string;
  subject: string;
  value: number;
  weight: number;
  type: "Klassenarbeit" | "Test" | "Mündlich";
  date: string;
};

export const subjects: Subject[] = [
  { kuerzel: "LF1", name: "Das Unternehmen und die eigene Rolle im Betrieb beschreiben", farbe: "#8db6a4" },
  { kuerzel: "LF2", name: "Arbeitsplätze nach Kundenwunsch ausstatten", farbe: "#c8a76b" },
  { kuerzel: "LF3", name: "Clients in Netzwerke einbinden", farbe: "#a397d8" },
  { kuerzel: "LF4", name: "Schutzbedarfsanalyse im eigenen Arbeitsbereich durchführen", farbe: "#d58e8e" },
  { kuerzel: "LF5", name: "Software zur Verwaltung von Daten anpassen", farbe: "#6fb7c9" },
  { kuerzel: "LF6", name: "Serviceanfragen bearbeiten", farbe: "#9db46f" },
  { kuerzel: "EN", name: "Englisch", farbe: "#8fa3c2" },
  { kuerzel: "DE", name: "Deutsch", farbe: "#b8b0a3" },
];

export const subjectMap = new Map(subjects.map((s) => [s.kuerzel, s]));

// Beispiel: Berufsschule donnerstags und freitags
export const schoolDays = [4, 5];

export const timetable: Slot[] = [
  { weekday: 4, start: "07:45", end: "09:15", subject: "LF5", room: "B204" },
  { weekday: 4, start: "09:30", end: "11:00", subject: "LF3", room: "C011" },
  { weekday: 4, start: "11:15", end: "12:45", subject: "EN", room: "A103" },
  { weekday: 4, start: "13:30", end: "15:00", subject: "LF1", room: "A103" },
  { weekday: 5, start: "07:45", end: "09:15", subject: "LF2", room: "C011" },
  { weekday: 5, start: "09:30", end: "11:00", subject: "LF4", room: "B204" },
  { weekday: 5, start: "11:15", end: "12:45", subject: "DE", room: "A103" },
  { weekday: 5, start: "13:30", end: "14:15", subject: "LF6", room: "B110" },
];

export function slotsFor(iso: string): Slot[] {
  return timetable.filter((s) => s.weekday === weekday(iso));
}

export function getTodos(today: string): Todo[] {
  const d = (n: number) => addDays(today, n);
  return [
    { id: "t1", title: "Berichtsheft für letzte Woche nachtragen", area: "schule", due: d(-1), important: true },
    { id: "t2", title: "ER-Modell Übung 3 fertig machen", area: "schule", subject: "LF5", due: d(0) },
    { id: "t3", title: "Text zum Job Interview lesen", area: "schule", subject: "EN", due: d(0) },
    { id: "t4", title: "Paket bei der Post abholen", area: "privat", due: d(0) },
    { id: "t5", title: "Subnetting-Aufgaben 1 bis 8", area: "schule", subject: "LF3", due: d(1) },
    { id: "t6", title: "Vokabeln Unit 2 lernen", area: "schule", subject: "EN", due: d(3) },
    { id: "t7", title: "Altklausur SQL durchrechnen", area: "schule", subject: "LF5", due: d(5), important: true },
    { id: "t8", title: "Handyvertrag kündigen", area: "privat", due: d(9) },
    { id: "t9", title: "Python-Kurs weitermachen", area: "privat" },
    { id: "t10", title: "Organigramm vom Ausbildungsbetrieb zeichnen", area: "schule", subject: "LF1", due: d(-3), done: true },
    { id: "t11", title: "Angebotsvergleich als Tabelle abgeben", area: "schule", subject: "LF2", due: d(-6), done: true },
  ];
}

/** Erster Tag ab heute + minDays, an dem das Fach Unterricht hat (inkl. Uhrzeit) */
function nextLesson(today: string, subject: string, minDays: number) {
  for (let i = minDays; i < minDays + 7; i++) {
    const date = addDays(today, i);
    const slot = timetable.find((s) => s.subject === subject && s.weekday === weekday(date));
    if (slot) return { date, time: slot.start };
  }
  return { date: addDays(today, minDays), time: undefined };
}

/** Letzter Unterrichtstag des Fachs, der mindestens minDays zurückliegt */
function lastLesson(today: string, subject: string, minDays: number) {
  for (let i = minDays; i < minDays + 7; i++) {
    const date = addDays(today, -i);
    if (timetable.some((s) => s.subject === subject && s.weekday === weekday(date))) return date;
  }
  return addDays(today, -minDays);
}

export function getEvents(today: string): EventItem[] {
  // Prüfungen und Abgaben liegen immer auf einem Unterrichtstag des Fachs
  const exam = (subject: string, minDays: number) => nextLesson(today, subject, minDays);
  const due = (subject: string, minDays: number) => ({ date: nextLesson(today, subject, minDays).date });
  return [
    { id: "e1", title: "Abgabe Arbeitsplatz-Konzept", type: "abgabe", subject: "LF2", ...due("LF2", 1) },
    { id: "e2", title: "Auto zum TÜV", type: "privat", important: true, date: addDays(today, 4), time: "16:30" },
    { id: "e3", title: "Klassenarbeit SQL und ER-Modell", type: "pruefung", important: true, subject: "LF5", ...exam("LF5", 5) },
    { id: "e6", title: "Abgabe Schutzbedarfsanalyse", type: "abgabe", subject: "LF4", ...due("LF4", 6) },
    { id: "e4", title: "Test Subnetting", type: "pruefung", subject: "LF3", ...exam("LF3", 12) },
    { id: "e5", title: "Vokabeltest Unit 2", type: "pruefung", subject: "EN", ...exam("EN", 19) },
  ];
}

export function getDocs(today: string): Doc[] {
  const d = (n: number) => addDays(today, n);
  const mb = (n: number) => Math.round(n * 1024 * 1024);
  return [
    { id: "d1", name: "SQL_Grundlagen_Skript.pdf", subject: "LF5", folder: "klassenarbeit-sql", tags: ["Skript"], sizeBytes: mb(2.4), uploaded: d(0) },
    { id: "d2", name: "ER-Modell_Uebungen.pdf", subject: "LF5", folder: "klassenarbeit-sql", tags: ["Übung"], sizeBytes: mb(0.8), uploaded: d(-1) },
    { id: "d3", name: "ER-Modell_Loesungen.pdf", subject: "LF5", folder: "klassenarbeit-sql", tags: ["Lösung"], sizeBytes: mb(0.6), uploaded: d(-1) },
    { id: "d4", name: "Subnetting_Spickzettel.pdf", subject: "LF3", folder: "spickzettel", tags: ["Spickzettel"], sizeBytes: mb(0.2), uploaded: d(-2) },
    { id: "d5", name: "OSI-Modell_Tafelbild.jpg", subject: "LF3", folder: "mitschriften", tags: ["Mitschrift"], sizeBytes: mb(3.1), uploaded: d(-7) },
    { id: "d6", name: "Unit2_Vocabulary.pdf", subject: "EN", tags: ["Übung"], sizeBytes: mb(0.4), uploaded: d(-7) },
    { id: "d7", name: "Angebotsvergleich.xlsx", subject: "LF2", folder: "abgaben", tags: ["Abgabe"], sizeBytes: mb(0.1), uploaded: d(-8) },
    { id: "d8", name: "Unternehmensformen.docx", subject: "LF1", folder: "mitschriften", tags: ["Mitschrift"], sizeBytes: mb(0.3), uploaded: d(-14) },
    { id: "d9", name: "Schutzbedarf_Arbeitsblatt.pdf", subject: "LF4", tags: ["Übung"], sizeBytes: mb(1.2), uploaded: d(-15) },
    { id: "d10", name: "Ticketsystem_Fallbeispiel.pdf", subject: "LF6", tags: ["Skript"], sizeBytes: mb(1.7), uploaded: d(-21) },
    { id: "d11", name: "Eroerterung_Aufbau.pdf", subject: "DE", tags: ["Skript"], sizeBytes: mb(0.5), uploaded: d(-22) },
    { id: "d12", name: "Stundenplan_Schuljahr.pdf", folder: "orga", tags: ["Orga"], sizeBytes: mb(0.2), uploaded: d(-30) },
  ];
}

export const folders: Folder[] = [
  { id: "klassenarbeit-sql", name: "Klassenarbeit SQL", subject: "LF5" },
  { id: "spickzettel", name: "Spickzettel" },
  { id: "mitschriften", name: "Mitschriften" },
  { id: "abgaben", name: "Abgaben" },
  { id: "orga", name: "Orga" },
];

export function getGrades(today: string): Grade[] {
  const on = (subject: string, minDays: number) => lastLesson(today, subject, minDays);
  return [
    { id: "g1", subject: "LF5", value: 2.0, weight: 1, type: "Test", date: on("LF5", 14) },
    { id: "g2", subject: "LF5", value: 1.7, weight: 0.5, type: "Mündlich", date: on("LF5", 7) },
    { id: "g3", subject: "LF3", value: 2.3, weight: 1, type: "Test", date: on("LF3", 7) },
    { id: "g4", subject: "EN", value: 1.3, weight: 1, type: "Test", date: on("EN", 14) },
    { id: "g5", subject: "LF1", value: 2.7, weight: 2, type: "Klassenarbeit", date: on("LF1", 21) },
  ];
}

export function average(grades: Grade[]): number | null {
  const w = grades.reduce((s, g) => s + g.weight, 0);
  if (!w) return null;
  return grades.reduce((s, g) => s + g.value * g.weight, 0) / w;
}

export const formatGrade = (n: number) => n.toFixed(1).replace(".", ",");

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
