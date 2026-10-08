import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { addDays, dayMonth, diffDays, formatShort, todayISO, weekday, weekdayLong } from "@/lib/dates";
import { getEvents, getTodos, schoolDays, slotsFor, subjectMap } from "@/lib/sample-data";
import { TwoWeeks } from "@/components/two-weeks";
import { TodoList } from "@/components/todo-list";
import { PageSkeleton, SectionTitle } from "@/components/ui";

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
  await connection();
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

  return (
    <>
      <header className="mb-10">
        <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[46px]">
          <span className="block sm:inline">{weekdayLong(today)},</span> {dayMonth(today)}
        </h1>
        <p className="mt-3 text-[16px] text-muted">{summary}</p>
      </header>

      <TwoWeeks today={today} events={events} />

      <div className="grid gap-12 md:grid-cols-[1.5fr_1fr] md:gap-14">
        <section>
          <SectionTitle
            count={due.length}
            action={
              <Link href="/todos" className="text-[13px] text-muted hover:text-ink">
                Alle Todos
              </Link>
            }
          >
            Fällig
          </SectionTitle>
          <TodoList initial={due} today={today} empty="Alles erledigt für heute." />

          {soon.length ? (
            <div className="mt-10">
              <SectionTitle count={soon.length}>Die nächsten zwei Tage</SectionTitle>
              <TodoList initial={soon} today={today} />
            </div>
          ) : null}
        </section>

        <section>
          <SectionTitle>
            {slots.length ? "Stundenplan" : `Nächster Schultag, ${formatShort(slotDay)}`}
          </SectionTitle>
          <ol>
            {showSlots.map((s) => {
              const subject = subjectMap.get(s.subject);
              return (
                <li key={s.start} className="flex gap-4 border-b border-line py-3 last:border-b-0">
                  <span className="w-11 shrink-0 pt-px text-[13px] text-faint">{s.start}</span>
                  <span
                    className="w-0.5 shrink-0 self-stretch rounded-full"
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
        </section>
      </div>
    </>
  );
}
