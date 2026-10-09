import { addDays, diffDays, weekday } from "./dates";
import type { Slot, WeekRhythm } from "./types";

const EPOCH_MONDAY = "2024-01-01";

/** Woche A oder B, fortlaufend gezählt (unabhängig von Kalenderwochen und Jahreswechseln) */
export function weekParity(iso: string): "a" | "b" {
  return Math.floor(diffDays(EPOCH_MONDAY, iso) / 7) % 2 === 0 ? "a" : "b";
}

type SlotLike = Pick<Slot, "weekday" | "rhythm">;

/** Findet die Stunde an diesem Tag statt? Berücksichtigt den 2-Wochen-Rhythmus. */
export function slotOn(slot: SlotLike, iso: string): boolean {
  if (slot.weekday !== weekday(iso)) return false;
  return slot.rhythm === "jede" || slot.rhythm === weekParity(iso);
}

export const slotsOn = <T extends SlotLike>(slots: T[], iso: string) => slots.filter((s) => slotOn(s, iso));

/** Nächster Tag ab `from` (inklusive), an dem diese Stunde stattfindet */
export function nextDateOf(slot: SlotLike, from: string): string {
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    if (slotOn(slot, d)) return d;
  }
  return from;
}

/** Nächster Tag ab `from` (inklusive) mit Unterricht, höchstens 14 Tage voraus */
export function nextSchoolDay(slots: SlotLike[], from: string): string | null {
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    if (slotsOn(slots, d).length) return d;
  }
  return null;
}

/** Rhythmus für "ab dieser/nächster Woche" aus Sicht von heute */
export const rhythmFor = (choice: "jede" | "diese" | "naechste", today: string): WeekRhythm =>
  choice === "jede" ? "jede" : weekParity(choice === "diese" ? today : addDays(today, 7));
