"use client";

import { useState } from "react";
import type { Todo } from "@/lib/sample-data";
import { TodoRow } from "./todo-row";
import { EmptyLine } from "./ui";

/** Einfache Liste mit Abhaken, z.b. für die Heute-Seite und Lernfeld-Seiten */
export function TodoList({
  initial,
  today,
  showSubject = true,
  empty = "Nichts offen.",
}: {
  initial: Todo[];
  today: string;
  showSubject?: boolean;
  empty?: string;
}) {
  const [todos, setTodos] = useState(initial);
  const toggle = (id: string) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  if (todos.length === 0) return <EmptyLine>{empty}</EmptyLine>;

  return (
    <ul>
      {todos.map((t) => (
        <TodoRow key={t.id} todo={t} today={today} onToggle={toggle} showSubject={showSubject} />
      ))}
    </ul>
  );
}
