import type { EventItem } from "./sample-data";

/** Farbe und Name je Termintyp. Farben kommen aus globals.css (--color-exam usw.). */
export const eventMeta: Record<EventItem["type"], { label: string; color: string }> = {
  pruefung: { label: "Prüfung", color: "var(--color-exam)" },
  abgabe: { label: "Abgabe", color: "var(--color-deadline)" },
  privat: { label: "Termin", color: "var(--color-private)" },
};
