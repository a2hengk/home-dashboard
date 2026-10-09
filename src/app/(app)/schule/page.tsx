import type { Metadata } from "next";
import { Suspense } from "react";
import { diffDays, todayISO } from "@/lib/dates";
import { getDocs, getEvents, getGrades, getSubjects, getTimetable, getTodos } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { average, formatGrade } from "@/lib/types";
import { SubjectManager, TimetableEditor } from "@/components/school";
import { HudPanel, PageSkeleton, PageTitle } from "@/components/hud";

export const metadata: Metadata = { title: "Schule" };

export default function SchulePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Schule />
    </Suspense>
  );
}

async function Schule() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const today = todayISO();
  const [subjects, todos, events, docs, grades, slots] = await Promise.all([
    getSubjects(),
    getTodos({ openOnly: true }),
    getEvents({ from: today }),
    getDocs(),
    getGrades(),
    getTimetable(),
  ]);

  const rows = subjects.map((s) => {
    const exam = events.find((e) => e.subject?.id === s.id && e.type === "pruefung");
    return {
      ...s,
      open: todos.filter((t) => t.subject?.id === s.id).length,
      exam: exam ? diffDays(today, exam.date) : null,
      docs: docs.filter((d) => d.subject?.id === s.id).length,
      avg: average(grades.filter((g) => g.subjectId === s.id)),
    };
  });
  const total = average(grades);

  return (
    <>
      <PageTitle kicker="Modul // Berufsschule" title="Schule">
        {subjects.length} Fächer.{total !== null ? ` Schnitt über alle Noten ${formatGrade(total)}.` : " Noch keine Noten eingetragen."}
      </PageTitle>
      <div className="space-y-5">
        <HudPanel label="Fächer & Lernfelder" code={`SUB-${String(subjects.length).padStart(2, "0")}`} id="faecher">
          <SubjectManager subjects={rows} />
        </HudPanel>
        <div id="stundenplan" className="scroll-mt-20">
          <HudPanel label="Stundenplan" code="TT-WK">
            <TimetableEditor slots={slots} subjects={subjects} today={today} />
          </HudPanel>
        </div>
      </div>
    </>
  );
}
