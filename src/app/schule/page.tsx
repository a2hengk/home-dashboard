import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { diffDays, todayISO } from "@/lib/dates";
import {
  average,
  formatGrade,
  getDocs,
  getEvents,
  getGrades,
  getTodos,
  subjects,
} from "@/lib/sample-data";
import { PageHeader, PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Schule" };

export default function SchulePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Schule />
    </Suspense>
  );
}

async function Schule() {
  await connection();
  const today = todayISO();
  const todos = getTodos(today);
  const events = getEvents(today);
  const docs = getDocs(today);
  const grades = getGrades(today);

  const total = average(grades);
  const rows = subjects.map((s) => {
    const exam = events
      .filter((e) => e.subject === s.kuerzel && e.type === "pruefung" && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    return {
      ...s,
      open: todos.filter((t) => t.subject === s.kuerzel && !t.done).length,
      exam: exam ? diffDays(today, exam.date) : null,
      docs: docs.filter((d) => d.subject === s.kuerzel).length,
      avg: average(grades.filter((g) => g.subject === s.kuerzel)),
    };
  });

  return (
    <>
      <PageHeader title="Schule">
        {subjects.length} Fächer im ersten Ausbildungsjahr.
        {total !== null ? ` Schnitt über alle Noten ${formatGrade(total)}.` : null}
      </PageHeader>

      <div
        className="hidden grid-cols-[1fr_6rem_8rem_6rem_4rem] gap-4 border-b border-line pb-2 pl-5 text-[12px] text-faint md:grid"
        aria-hidden
      >
        <span>Fach</span>
        <span className="text-right">Offene Todos</span>
        <span className="text-right">Nächste Prüfung</span>
        <span className="text-right">Dokumente</span>
        <span className="text-right">Schnitt</span>
      </div>

      <ul>
        {rows.map((r) => (
          <li key={r.kuerzel} className="border-b border-line">
            <Link
              href={`/schule/${r.kuerzel.toLowerCase()}`}
              className="group relative grid gap-1 py-4 pl-5 md:grid-cols-[1fr_6rem_8rem_6rem_4rem] md:items-center md:gap-4"
            >
              <span
                className="absolute bottom-4 left-0 top-4 w-0.5 rounded-full"
                style={{ backgroundColor: r.farbe }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-[15px] text-ink group-hover:text-accent-strong">
                  {r.kuerzel.startsWith("LF") ? (
                    <>
                      {r.kuerzel} <span className="text-muted group-hover:text-accent-strong">{r.name}</span>
                    </>
                  ) : (
                    r.name
                  )}
                </span>
              </span>

              {/* Handy: eine Meta-Zeile statt Spalten */}
              <span className="flex flex-wrap gap-x-4 text-[13px] text-faint md:hidden">
                {r.open ? <span>{r.open} offen</span> : null}
                {r.exam !== null ? <span className="text-accent">Prüfung in {r.exam} Tagen</span> : null}
                <span>{r.docs} Dokumente</span>
                {r.avg !== null ? <span>Schnitt {formatGrade(r.avg)}</span> : null}
              </span>

              <span className="hidden text-right text-[14px] text-muted md:block">
                {r.open || <span className="text-faint">–</span>}
              </span>
              <span className="hidden text-right text-[14px] md:block">
                {r.exam !== null ? (
                  <span className="text-accent">in {r.exam} Tagen</span>
                ) : (
                  <span className="text-faint">–</span>
                )}
              </span>
              <span className="hidden text-right text-[14px] text-muted md:block">{r.docs}</span>
              <span className="hidden text-right text-[14px] text-ink md:block">
                {r.avg !== null ? formatGrade(r.avg) : <span className="text-faint">–</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
