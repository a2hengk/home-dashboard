import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { diffDays, formatShort, todayISO } from "@/lib/dates";
import { getDocs, getEvents, getGrades, getSubjectByKuerzel, getSubjects, getTimetable, getTodos } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { average, formatGrade, weekdayNames } from "@/lib/types";
import { EventForm, EventList } from "@/components/events";
import { GradeEditor } from "@/components/school";
import { SubjectFiles } from "@/components/subject-files";
import { TodoList, TodoQuickAdd } from "@/components/todos";
import { HudPanel, PageSkeleton, Readout } from "@/components/hud";

export default function LernfeldPage({ params }: PageProps<"/schule/[kuerzel]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Lernfeld params={params} />
    </Suspense>
  );
}

async function Lernfeld({ params }: { params: Promise<{ kuerzel: string }> }) {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const { kuerzel } = await params;
  const subject = await getSubjectByKuerzel(decodeURIComponent(kuerzel));
  if (!subject) notFound();

  const today = todayISO();
  const [todos, events, docs, grades, slots, subjects] = await Promise.all([
    getTodos({ subjectId: subject.id, openOnly: true }),
    getEvents({ subjectId: subject.id, from: today }),
    getDocs(subject.id),
    getGrades(subject.id),
    getTimetable(),
    getSubjects(),
  ]);
  const avg = average(grades);
  const exam = events.find((e) => e.type === "pruefung");
  const mySlots = slots.filter((s) => s.subject.id === subject.id);

  return (
    <>
      <Link href="/schule" className="hud-label mb-6 inline-flex items-center gap-1 text-[11px] text-hud-dim hover:text-hud">
        <ChevronLeft size={14} aria-hidden /> Schule
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div className="border-l-2 pl-5" style={{ borderColor: subject.farbe, boxShadow: `-8px 0 16px -10px ${subject.farbe}` }}>
          <p className="font-display text-[44px] font-bold leading-none tracking-[0.06em]" style={{ color: subject.farbe, textShadow: `0 0 18px ${subject.farbe}` }}>
            {subject.kuerzel}
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-[24px] font-semibold uppercase leading-tight tracking-wide text-ink">{subject.name}</h1>
          {mySlots.length ? (
            <p className="hud-label mt-2 text-[10px] text-faint">
              {mySlots.map((s) => `${weekdayNames[s.weekday - 1].slice(0, 2)} ${s.start}${s.rhythm === "jede" ? "" : " (alle 2 Wochen)"}`).join(" / ")}
            </p>
          ) : null}
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Readout label="Schnitt" value={avg !== null ? formatGrade(avg) : "--"} tone="var(--color-hud-strong)" />
          <Readout label="Offene Todos" value={String(todos.length).padStart(2, "0")} />
          <Readout
            label="Nächste Prüfung"
            value={exam ? `${diffDays(today, exam.date)} T` : "--"}
            tone={exam ? "var(--color-exam)" : undefined}
          />
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <HudPanel label="Dateien" code={`DOC-${String(docs.length).padStart(2, "0")}`}>
            <SubjectFiles docs={docs} subjectId={subject.id} kuerzel={subject.kuerzel} today={today} storage={storageMode()} />
          </HudPanel>
          <HudPanel label="Termine" code={`EV-${String(events.length).padStart(2, "0")}`}>
            <EventList events={events} today={today} showSubject={false} empty={exam ? "" : "Keine anstehenden Termine."} />
            <div className="mt-5 border-t border-line pt-4">
              <EventForm subjects={subjects} today={today} fixedSubjectId={subject.id} />
            </div>
          </HudPanel>
        </div>
        <div className="space-y-5">
          <HudPanel label="Todos" code={`TD-${String(todos.length).padStart(2, "0")}`}>
            <TodoList todos={todos} today={today} showSubject={false} empty="Nichts offen." />
            <div className="mt-5 border-t border-line pt-4">
              <TodoQuickAdd subjects={subjects} today={today} fixedSubjectId={subject.id} />
            </div>
          </HudPanel>
          <HudPanel label="Noten" code={avg !== null ? `AVG ${formatGrade(avg)}` : "AVG --"}>
            <GradeEditor grades={grades} subjectId={subject.id} today={today} />
          </HudPanel>
          {exam ? (
            <p className="hud-label text-[10px] text-faint">
              Nächste Prüfung: {exam.title}, {formatShort(exam.date)}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
