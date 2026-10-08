import Link from "next/link";
import { Suspense } from "react";
import { addDays, diffDays, formatShort, todayISO, weekday, weekdayLong, dayMonth } from "@/lib/dates";
import { eventMeta } from "@/lib/event-types";
import { getSubjects, getToday } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { Timeline } from "@/components/timeline";
import { TodoList, TodoQuickAdd } from "@/components/todos";
import { Empty, HudPanel, PageSkeleton, Reactor, Readout, SubjectTag } from "@/components/hud";

export default function HeutePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Heute />
    </Suspense>
  );
}

async function Heute() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const today = todayISO();
  const [{ todos, events, slots }, subjects] = await Promise.all([getToday(today), getSubjects()]);

  const schoolDays = [...new Set(slots.map((s) => s.weekday))];
  const todaySlots = slots.filter((s) => s.weekday === weekday(today));
  let slotDay = today;
  if (!todaySlots.length && schoolDays.length) {
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today, i);
      if (schoolDays.includes(weekday(d))) {
        slotDay = d;
        break;
      }
    }
  }
  const shownSlots = slots.filter((s) => s.weekday === weekday(slotDay));

  const due = todos.filter((t) => t.due && t.due <= today);
  const overdue = due.filter((t) => t.due! < today);
  const exams14 = events.filter((e) => e.type === "pruefung" && diffDays(today, e.date) < 14);
  const nextExam = events.find((e) => e.type === "pruefung");
  const examDays = nextExam ? diffDays(today, nextExam.date) : null;
  const examTodos = nextExam?.subject
    ? todos.filter((t) => t.subject?.id === nextExam.subject!.id && t.due && t.due <= nextExam.date)
    : [];

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label text-[11px] text-hud-dim">Lunas OS // Tagesstatus</p>
          <h1 className="glow mt-1 font-display text-[40px] font-bold uppercase leading-[0.95] tracking-[0.05em] text-hud-strong sm:text-[56px]">
            {weekdayLong(today)}
            <span className="block text-[26px] text-hud sm:text-[32px]">{dayMonth(today)}</span>
          </h1>
        </div>
        <p className="hud-label animate-flicker text-[11px] text-ok">
          <span aria-hidden>● </span>Alle Systeme online
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Reaktor: nächste Prüfung */}
        <HudPanel label="Nächste Prüfung" code="EX-01" id="exam" tone={nextExam ? "var(--color-exam)" : undefined}>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <Reactor
              value={examDays === null ? "--" : examDays}
              unit={examDays === null ? "keine geplant" : examDays === 0 ? "heute" : examDays === 1 ? "Tag" : "Tage"}
              progress={examDays === null ? 0 : 1 - Math.min(examDays, 21) / 21}
              tone={nextExam ? "var(--color-exam)" : "var(--color-hud)"}
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              {nextExam ? (
                <>
                  <p className="hud-label text-[10px] text-faint">Ziel erfasst</p>
                  <p className="mt-1 font-display text-[24px] font-bold uppercase leading-tight tracking-wide text-ink">{nextExam.title}</p>
                  <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 font-display text-[14px] font-semibold tracking-wider text-muted sm:justify-start">
                    <span>
                      {formatShort(nextExam.date)}
                      {nextExam.time ? ` / ${nextExam.time}` : null}
                    </span>
                    <SubjectTag subject={nextExam.subject} />
                  </p>
                  {nextExam.subject ? (
                    <Link
                      href={`/schule/${nextExam.subject.kuerzel.toLowerCase()}`}
                      className="hud-cut mt-5 flex items-center justify-between gap-4 bg-exam/10 px-4 py-2.5 ring-1 ring-inset ring-exam/40 transition hover:bg-exam/20"
                    >
                      <span className="text-[14px] text-ink">
                        {examTodos.length ? `${examTodos.length} ${examTodos.length === 1 ? "Todo" : "Todos"} bis dahin offen` : "Keine offenen Todos dafür"}
                      </span>
                      <span className="hud-label text-[10px] text-exam">Zum Fach ▸</span>
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-display text-[22px] font-bold uppercase tracking-wide text-ink">Keine Prüfung erfasst</p>
                  <p className="mt-2 text-muted">Trag Klassenarbeiten und Tests unter Termine ein, dann zählt der Reaktor runter.</p>
                  <Link href="/termine" className="hud-label mt-4 inline-block text-[11px] text-hud hover:text-hud-strong">
                    Termin eintragen ▸
                  </Link>
                </>
              )}
            </div>
          </div>
        </HudPanel>

        {/* Statusanzeigen */}
        <HudPanel label="Systemstatus" code="SYS" id="status">
          <div className="space-y-4">
            <Readout label="Fällig heute" value={String(due.length).padStart(2, "0")} tone={due.length ? "var(--color-hud-strong)" : undefined} />
            <Readout label="Überfällig" value={String(overdue.length).padStart(2, "0")} tone={overdue.length ? "var(--color-alert)" : "var(--color-ok)"} />
            <Readout label="Prüfungen / 14 T" value={String(exams14.length).padStart(2, "0")} tone={exams14.length ? eventMeta.pruefung.color : undefined} />
            <Readout label="Stunden heute" value={String(todaySlots.length).padStart(2, "0")} />
            <Readout label="Termine offen" value={String(events.length).padStart(2, "0")} />
          </div>
        </HudPanel>

        <div className="lg:col-span-2">
          <Timeline today={today} events={events} schoolDays={schoolDays} />
        </div>

        <HudPanel
          label="Fällig"
          code={`TD-${String(due.length).padStart(2, "0")}`}
          id="due"
          action={
            <Link href="/todos" className="hud-label text-[10px] text-faint hover:text-hud">
              Alle ▸
            </Link>
          }
        >
          <TodoList todos={due} today={today} empty="Nichts fällig. Stark." />
          <div className="mt-5 border-t border-line pt-4">
            <TodoQuickAdd subjects={subjects} today={today} />
          </div>
        </HudPanel>

        <HudPanel
          label={todaySlots.length ? "Stundenplan // heute" : schoolDays.length ? `Nächster Schultag // ${formatShort(slotDay)}` : "Stundenplan"}
          code="TT"
          id="timetable"
        >
          {shownSlots.length === 0 ? (
            <Empty>
              Noch kein Stundenplan.{" "}
              <Link href="/schule#stundenplan" className="text-hud underline decoration-hud/40 underline-offset-4">
                Unter Schule eintragen
              </Link>
            </Empty>
          ) : (
            <ol>
              {shownSlots.map((s) => (
                <li key={s.id} className="flex gap-3.5 border-b border-line/70 py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-12 shrink-0 font-display text-[15px] font-semibold text-hud-dim">{s.start}</span>
                  <span className="w-[2px] shrink-0 self-stretch" style={{ backgroundColor: s.subject.farbe, boxShadow: `0 0 6px ${s.subject.farbe}` }} aria-hidden />
                  <span className="min-w-0">
                    <Link href={`/schule/${s.subject.kuerzel.toLowerCase()}`} className="block leading-snug text-ink hover:text-hud-strong">
                      <span className="font-display font-bold tracking-wider" style={{ color: s.subject.farbe }}>
                        {s.subject.kuerzel}
                      </span>{" "}
                      {s.subject.name}
                    </Link>
                    <span className="text-[13px] text-faint">
                      bis {s.end}
                      {s.room ? `, Raum ${s.room}` : null}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </HudPanel>
      </div>
    </>
  );
}
