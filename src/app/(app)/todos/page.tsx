import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { todayISO } from "@/lib/dates";
import { getTodos } from "@/lib/sample-data";
import { TodoBoard } from "@/components/todo-board";
import { PageHeader, PageSkeleton } from "@/components/ui";

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
  const todos = getTodos(today);
  const open = todos.filter((t) => !t.done).length;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Todos">
        {open} offen, davon {todos.filter((t) => !t.done && t.area === "schule").length} für die Schule.
      </PageHeader>
      <TodoBoard initial={todos} today={today} />
    </div>
  );
}
