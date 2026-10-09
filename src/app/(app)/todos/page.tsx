import type { Metadata } from "next";
import { Suspense } from "react";
import { todayISO } from "@/lib/dates";
import { getSubjects, getTodos } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { TodoBoard, TodoQuickAdd } from "@/components/todos";
import { HudPanel, PageSkeleton, PageTitle } from "@/components/hud";

export const metadata: Metadata = { title: "Todos" };

export default function TodosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Todos />
    </Suspense>
  );
}

async function Todos() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const today = todayISO();
  const [todos, subjects] = await Promise.all([getTodos(), getSubjects()]);
  const open = todos.filter((t) => !t.done);

  return (
    <div className="max-w-3xl">
      <PageTitle kicker="Modul // Aufgaben" title="Todos">
        {open.length} offen: {open.filter((t) => t.area === "schule").length} Schule, {open.filter((t) => t.area === "arbeit").length} Arbeit,{" "}
        {open.filter((t) => t.area === "privat").length} privat.
      </PageTitle>
      <HudPanel label="Neu erfassen" code="IN" className="mb-5">
        <TodoQuickAdd subjects={subjects} today={today} />
      </HudPanel>
      <HudPanel label="Aufgaben" code={`TD-${String(open.length).padStart(2, "0")}`}>
        <TodoBoard todos={todos} today={today} />
      </HudPanel>
    </div>
  );
}
