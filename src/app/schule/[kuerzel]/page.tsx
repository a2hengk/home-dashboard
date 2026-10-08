import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
import { EmptyLine, PageSkeleton, SectionTitle } from "@/components/ui";

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
  await connection();
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

      <header className="mb-12 border-l-2 pl-5" style={{ borderColor: subject.farbe }}>
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

      <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <section>
          <SectionTitle
            count={docs.length}
            action={
              <Link
                href="/ablage"
                className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
              >
                <Upload size={14} aria-hidden /> Hochladen
              </Link>
            }
          >
            Dokumente
          </SectionTitle>
          {docs.length ? (
            <ul>
              {docs.map((d) => (
                <DocRow key={d.id} doc={d} today={today} showSubject={false} />
              ))}
            </ul>
          ) : (
            <EmptyLine>Noch nichts abgelegt. Skripte und Mitschriften über die Ablage hochladen.</EmptyLine>
          )}
        </section>

        <div className="flex flex-col gap-10">
          <section>
            <SectionTitle count={todos.length}>Todos</SectionTitle>
            <TodoList initial={todos} today={today} showSubject={false} empty="Nichts offen." />
          </section>

          <section>
            <SectionTitle>Termine</SectionTitle>
            {events.length ? (
              <ul>
                {events.map((e) => (
                  <li key={e.id} className="flex gap-4 border-b border-line py-2.5 last:border-b-0">
                    <span className="w-20 shrink-0 text-[13px] text-muted">{formatShort(e.date)}</span>
                    <span className={e.type === "pruefung" ? "font-medium text-ink" : "text-ink"}>
                      {e.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Keine Termine.</EmptyLine>
            )}
          </section>

          <section>
            <SectionTitle>Noten</SectionTitle>
            {grades.length ? (
              <ul>
                {grades.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-baseline gap-4 border-b border-line py-2.5 last:border-b-0"
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
          </section>
        </div>
      </div>
    </>
  );
}
