import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { ChevronLeft, Upload } from "lucide-react";
import { formatShort, relativeDay, todayISO } from "@/lib/dates";
import {
  average,
  formatGrade,
  getDocs,
  getEvents,
  getGrades,
  getTodos,
  subjectMap,
} from "@/lib/sample-data";
import { DocRow } from "@/components/doc-row";
import { TodoList } from "@/components/todo-list";
import { EmptyLine, PageSkeleton, Panel } from "@/components/ui";
import { eventMeta } from "@/lib/event-types";

/** "Morgen" → "morgen", "in 6 Tagen" bleibt */
const inSentence = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function LernfeldPage({ params }: PageProps<"/schule/[kuerzel]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lernfeld params={params} />
    </Suspense>
  );
}

async function Lernfeld({ params }: { params: Promise<{ kuerzel: string }> }) {
  const { kuerzel: raw } = await params;
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const subject = subjectMap.get(raw.toUpperCase());
  if (!subject) notFound();

  const today = todayISO();
  const k = subject.kuerzel;
  const todos = getTodos(today).filter((t) => t.subject === k && !t.done);
  const events = getEvents(today)
    .filter((e) => e.subject === k && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const docs = getDocs(today).filter((d) => d.subject === k);
  const grades = getGrades(today).filter((g) => g.subject === k);
  const avg = average(grades);
  const exam = events.find((e) => e.type === "pruefung");
  const isLf = k.startsWith("LF");

  return (
    <>
      <Link
        href="/schule"
        className="mb-8 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
      >
        <ChevronLeft size={15} aria-hidden /> Schule
      </Link>

      <header className="mb-8 border-l-2 pl-5" style={{ borderColor: subject.farbe }}>
        {isLf ? <p className="text-[15px] font-medium text-muted">{k}</p> : null}
        <h1 className="mt-1 max-w-2xl text-[28px] font-semibold leading-tight tracking-tight text-ink">
          {subject.name}
        </h1>
        <p className="mt-3 text-muted">
          {avg !== null
            ? `Schnitt ${formatGrade(avg)} aus ${grades.length} ${grades.length === 1 ? "Note" : "Noten"}.`
            : "Noch keine Noten."}{" "}
          {exam ? (
            <>
              Nächste Prüfung {inSentence(relativeDay(exam.date, today))}:{" "}
              <span className="text-ink">{exam.title}</span>.
            </>
          ) : (
            "Keine Prüfung geplant."
          )}
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Dokumente"
          count={docs.length}
          id="docs"
          action={
            <Link
              href="/ablage"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
            >
              <Upload size={14} aria-hidden /> Hochladen
            </Link>
          }
        >
          {docs.length ? (
            <ul>
              {docs.map((d) => (
                <DocRow key={d.id} doc={d} today={today} showSubject={false} />
              ))}
            </ul>
          ) : (
            <EmptyLine>Noch nichts abgelegt. Skripte und Mitschriften über die Ablage hochladen.</EmptyLine>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Todos" count={todos.length} id="todos">
            <TodoList initial={todos} today={today} showSubject={false} empty="Nichts offen." />
          </Panel>

          <Panel title="Termine" id="termine">
            {events.length ? (
              <ul>
                {events.map((e) => {
                  const meta = eventMeta[e.type];
                  return (
                    <li key={e.id} className="flex items-center gap-3 border-b border-line py-2.5 first:pt-0 last:border-b-0 last:pb-0">
                      <span className="h-4 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                      <span className="w-20 shrink-0 text-[13px] text-muted">{formatShort(e.date)}</span>
                      <span className={`min-w-0 flex-1 ${e.important ? "font-medium text-ink" : "text-ink"}`}>
                        {e.title}
                      </span>
                      <span className="text-[12px]" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyLine>Keine Termine.</EmptyLine>
            )}
          </Panel>

          <Panel
            title="Noten"
            id="noten"
            action={avg !== null ? <span className="text-[13px] text-muted">Schnitt <span className="font-semibold text-ink">{formatGrade(avg)}</span></span> : null}
          >
            {grades.length ? (
              <ul>
                {grades.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-baseline gap-4 border-b border-line py-2.5 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <span className="w-10 text-[17px] font-semibold text-ink">{formatGrade(g.value)}</span>
                    <span className="flex-1 text-muted">
                      {g.type}
                      {g.weight !== 1 ? (
                        <span className="text-faint">, zählt {String(g.weight).replace(".", ",")}-fach</span>
                      ) : null}
                    </span>
                    <span className="text-[13px] text-faint">{formatShort(g.date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Noch keine Noten eingetragen.</EmptyLine>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
