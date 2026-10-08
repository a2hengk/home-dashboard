import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { addDays, dayMonth, diffDays, formatShort, todayISO, weekday, weekdayLong } from "@/lib/dates";
import { getEvents, getTodos, schoolDays, slotsFor, subjectMap } from "@/lib/sample-data";
import { eventMeta } from "@/lib/event-types";
import { TwoWeeks } from "@/components/two-weeks";
import { TodoList } from "@/components/todo-list";
import { PageSkeleton, Panel, SubjectTag } from "@/components/ui";

function nextSchoolDay(today: string) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (schoolDays.includes(weekday(d))) return d;
  }
  return today;
}

const isLernfeld = (k: string) => k.startsWith("LF");

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

  const todos = getTodos(today);
  const events = getEvents(today);
  const slots = slotsFor(today);

  const due = todos
    .filter((t) => !t.done && t.due && t.due <= today)
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const soon = todos.filter(
    (t) => !t.done && t.due && t.due > today && diffDays(today, t.due) <= 2,
  );
  const nextExam = events
    .filter((e) => e.type === "pruefung" && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const dueText =
    due.length === 0
      ? "Nichts fällig"
      : due.length === 1
        ? "1 Todo fällig"
        : `${due.length} Todos fällig`;
  let summary = slots.length ? `Berufsschule bis ${slots.at(-1)!.end} Uhr. ` : "Kein Schultag. ";
  if (nextExam) {
    const n = diffDays(today, nextExam.date);
    summary += `${dueText}, nächste Prüfung ${n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`}.`;
  } else {
    summary += `${dueText}.`;
  }

  const slotDay = slots.length ? today : nextSchoolDay(today);
  const showSlots = slotsFor(slotDay);

  const examDays = nextExam ? diffDays(today, nextExam.date) : null;
  const examTodos = nextExam?.subject
    ? todos.filter((t) => !t.done && t.subject === nextExam.subject && t.due && t.due <= nextExam.date)
    : [];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[46px]">
          <span className="block sm:inline">{weekdayLong(today)},</span> {dayMonth(today)}
        </h1>
        <p className="mt-3 text-[16px] text-muted">{summary}</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Handy: Stapel lösen sich auf, Reihenfolge per order (Prüfung zuerst) */}
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-4">
          <div className="order-2 lg:order-none">
            <TwoWeeks today={today} events={events} />
          </div>
          <Panel
            className="order-3 lg:order-none"
            title="Fällig"
            count={due.length}
            id="due"
            action={
              <Link href="/todos" className="text-[13px] text-muted hover:text-ink">
                Alle Todos
              </Link>
            }
          >
            <TodoList initial={due} today={today} empty="Alles erledigt für heute." />
            {soon.length ? (
              <div className="mt-6">
                <h3 className="mb-1 text-[13px] text-faint">Die nächsten zwei Tage</h3>
                <TodoList initial={soon} today={today} />
              </div>
            ) : null}
          </Panel>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
        <Panel title="Nächste Prüfung" id="exam" className="order-1 lg:order-none">
          {nextExam && examDays !== null ? (
            <>
              <p className="flex items-baseline gap-2">
                <span
                  className="text-[56px] font-semibold leading-none tracking-[-0.03em]"
                  style={{ color: eventMeta.pruefung.color }}
                >
                  {examDays === 0 ? "Heute" : examDays}
                </span>
                {examDays > 0 ? (
                  <span className="text-muted">{examDays === 1 ? "Tag" : "Tage"}</span>
                ) : null}
              </p>
              <p className="mt-4 font-medium leading-snug text-ink">{nextExam.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-faint">
                <span>
                  {formatShort(nextExam.date)}
                  {nextExam.time ? ` um ${nextExam.time}` : null}
                </span>
                <SubjectTag kuerzel={nextExam.subject} />
              </p>
              {nextExam.subject ? (
                <Link
                  href={`/schule/${nextExam.subject.toLowerCase()}`}
                  className="mt-5 flex items-center justify-between rounded-xl bg-raised px-3.5 py-2.5 text-[14px] text-muted transition-colors hover:text-ink"
                >
                  <span>
                    {examTodos.length
                      ? `${examTodos.length} ${examTodos.length === 1 ? "Todo" : "Todos"} bis dahin offen`
                      : "Alles vorbereitet"}
                  </span>
                  <span className="text-faint">Zum Fach</span>
                </Link>
              ) : null}
            </>
          ) : (
            <p className="text-muted">Keine Prüfung geplant.</p>
          )}
        </Panel>

        <Panel
          className="order-4 lg:order-none"
          title={slots.length ? "Stundenplan" : `Nächster Schultag, ${formatShort(slotDay)}`}
          id="timetable"
        >
          <ol>
            {showSlots.map((s) => {
              const subject = subjectMap.get(s.subject);
              return (
                <li key={s.start} className="flex gap-3.5 border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <span className="w-11 shrink-0 pt-px text-[13px] text-faint">{s.start}</span>
                  <span
                    className="w-[3px] shrink-0 self-stretch rounded-full"
                    style={{ backgroundColor: subject?.farbe }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <Link
                      href={`/schule/${s.subject.toLowerCase()}`}
                      className="block text-[15px] leading-snug text-ink hover:text-accent-strong"
                    >
                      {isLernfeld(s.subject) ? `${s.subject} ` : null}
                      <span className={isLernfeld(s.subject) ? "text-muted" : undefined}>
                        {subject?.name}
                      </span>
                    </Link>
                    <span className="text-[13px] text-faint">
                      bis {s.end}, Raum {s.room}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
        </div>
      </div>
    </>
  );
}
