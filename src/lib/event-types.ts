import type { EventType } from "./types";

/** Farbe und Name je Termintyp. Farben kommen aus globals.css. */
export const eventMeta: Record<EventType, { label: string; color: string }> = {
  pruefung: { label: "Prüfung", color: "var(--color-exam)" },
  abgabe: { label: "Abgabe", color: "var(--color-deadline)" },
  privat: { label: "Termin", color: "var(--color-private)" },
};
