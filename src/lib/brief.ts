import { diffDays, formatLong } from "./dates";
import type { EventItem, Slot, Todo } from "./types";

/*
 * Tagesbrief als Fließtext zum Vorlesen. Kurze Sätze, keine Zeichen wie "/" oder "!",
 * die Stimmen lesen sonst Sonderzeichen mit oder betonen komisch.
 */

const MAX_TODOS = 8;

/** "LF5" klingt vorgelesen nach Buchstabensalat, die vollen Lernfeld-Namen sind zu lang */
function fach(s: { kuerzel: string; name: string }) {
  const lf = s.kuerzel.match(/^LF\s*(\d+)/i);
  return lf ? `Lernfeld ${lf[1]}` : s.name;
}

/** "07:45" → "7:45 Uhr" */
const uhr = (t: string) => `${t.replace(/^0/, "")} Uhr`;

function zuordnung(t: Todo) {
  if (t.subject) return fach(t.subject);
  if (t.area === "arbeit") return "Arbeit";
  if (t.area === "schule") return "Schule";
  return null;
}

function todoSatz(t: Todo, today: string) {
  const wo = zuordnung(t);
  const offen = t.steps.filter((s) => !s.done).length;
  let s = t.important ? `Wichtig: ${t.title}` : t.title;
  if (wo) s += `, für ${wo}`;
  if (t.due && t.due < today) {
    const tage = diffDays(t.due, today);
    s += tage === 1 ? ", seit gestern überfällig" : `, seit ${tage} Tagen überfällig`;
  }
  if (offen) s += `, ${offen} ${offen === 1 ? "Unterpunkt" : "Unterpunkte"} offen`;
  return `${s}.`;
}

function zahl(n: number, eins: string, viele: string) {
  return `${n === 1 ? "ein" : n} ${n === 1 ? eins : viele}`;
}

export function buildBrief({
  today,
  todos,
  events,
  todaySlots,
}: {
  today: string;
  todos: Todo[];
  events: EventItem[];
  todaySlots: Slot[];
}) {
  const parts: string[] = [`Heute ist ${formatLong(today)}.`];

  // Schule zuerst, das entscheidet wie der Tag läuft
  if (todaySlots.length) {
    const first = todaySlots[0];
    parts.push(`Heute ist Berufsschule, los geht's um ${uhr(first.start)} mit ${fach(first.subject)}.`);
  }

  const heuteTermine = events.filter((e) => e.date === today);
  for (const e of heuteTermine) {
    parts.push(`Termin heute${e.time ? ` um ${uhr(e.time)}` : ""}: ${e.title}.`);
  }

  const due = todos
    .filter((t) => !t.done && t.due && t.due <= today)
    .sort((a, b) => Number(b.important) - Number(a.important) || a.due!.localeCompare(b.due!));
  const overdue = due.filter((t) => t.due! < today).length;

  if (!due.length) {
    parts.push("Heute ist nichts fällig.");
  } else {
    let s = `Du hast ${zahl(due.length, "Todo", "Todos")} fällig`;
    if (overdue) s += overdue === due.length ? ", alle schon überfällig" : `, davon ${overdue} überfällig`;
    parts.push(`${s}.`);
    due.slice(0, MAX_TODOS).forEach((t) => parts.push(todoSatz(t, today)));
    if (due.length > MAX_TODOS) parts.push(`Und ${due.length - MAX_TODOS} weitere.`);
  }

  const ohneDatum = todos.filter((t) => !t.done && !t.due).length;
  if (ohneDatum) parts.push(`Dazu ${zahl(ohneDatum, "offenes Todo", "offene Todos")} ohne Datum.`);

  const exam = events.find((e) => e.type === "pruefung");
  if (exam) {
    const d = diffDays(today, exam.date);
    const wann = d === 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`;
    parts.push(`Nächste Prüfung ${wann}: ${exam.title}.`);
  }

  return parts.join(" ");
}
