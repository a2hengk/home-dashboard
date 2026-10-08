// Alle Tage als "YYYY-MM-DD" in deutscher Zeit. Gerechnet wird in UTC-Mittag,
// damit Sommer-/Winterzeit und die UTC-Uhr auf Vercel keinen Tag verschieben.

const TZ = "Europe/Berlin";

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

function toUTC(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** 1 = Montag … 7 = Sonntag */
export function weekday(iso: string): number {
  return toUTC(iso).getUTCDay() || 7;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("de-DE", { ...opts, timeZone: "UTC" });

const longFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const shortFmt = fmt({ weekday: "short", day: "2-digit", month: "2-digit" });
const wdLongFmt = fmt({ weekday: "long" });
const dayMonthFmt = fmt({ day: "numeric", month: "long" });
const dayNumFmt = fmt({ day: "numeric" });
const wdLetterFmt = fmt({ weekday: "short" });

/** "Donnerstag, 8. Oktober" */
export const formatLong = (iso: string) => longFmt.format(toUTC(iso));

/** "Mo., 12.10." */
export const formatShort = (iso: string) => shortFmt.format(toUTC(iso));

export const weekdayLong = (iso: string) => wdLongFmt.format(toUTC(iso));

/** "8. Oktober" */
export const dayMonth = (iso: string) => dayMonthFmt.format(toUTC(iso));

export const dayNumber = (iso: string) => dayNumFmt.format(toUTC(iso));

/** "Mo", "Di", … ohne Punkt */
export const weekdayShort = (iso: string) => wdLetterFmt.format(toUTC(iso)).replace(".", "");

/** Heute, Morgen, in 6 Tagen, vor 2 Tagen */
export function relativeDay(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d === 0) return "Heute";
  if (d === 1) return "Morgen";
  if (d === -1) return "Gestern";
  if (d < 0) return `vor ${-d} Tagen`;
  return `in ${d} Tagen`;
}

/** Kurzes Fälligkeitslabel für Listen */
export function dueLabel(iso: string, today: string): string {
  const d = diffDays(today, iso);
  if (d >= -1 && d <= 1) return relativeDay(iso, today);
  if (d > 1 && d < 7) return weekdayShort(iso);
  return formatShort(iso);
}
