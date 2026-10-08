"use client";

import { useId, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { diffDays } from "@/lib/dates";
import { subjects, type Todo } from "@/lib/sample-data";
import { TodoRow } from "./todo-row";
import { SectionTitle } from "./ui";

type Filter = "alle" | "schule" | "privat";

const filters: { value: Filter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "schule", label: "Schule" },
  { value: "privat", label: "Privat" },
];

function groupOf(t: Todo, today: string) {
  if (!t.due) return "Ohne Datum";
  const d = diffDays(today, t.due);
  if (d < 0) return "Überfällig";
  if (d === 0) return "Heute";
  if (d === 1) return "Morgen";
  if (d < 7) return "Diese Woche";
  return "Später";
}

const order = ["Überfällig", "Heute", "Morgen", "Diese Woche", "Später", "Ohne Datum"];

export function TodoBoard({ initial, today }: { initial: Todo[]; today: string }) {
  const [todos, setTodos] = useState(initial);
  const [filter, setFilter] = useState<Filter>("alle");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [due, setDue] = useState(today);
  const inputId = useId();

  const toggle = (id: string) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setTodos((ts) => [
      {
        id: crypto.randomUUID(),
        title: clean,
        area: subject ? "schule" : "privat",
        subject: subject && subject !== "schule" ? subject : undefined,
        due: due || undefined,
      },
      ...ts,
    ]);
    setTitle("");
  };

  const visible = todos.filter((t) => filter === "alle" || t.area === filter);
  const open = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);

  const byDue = (a: Todo, b: Todo) => (a.due ?? "").localeCompare(b.due ?? "");
  const groups = order
    .map((name) => [name, open.filter((t) => groupOf(t, today) === name).sort(byDue)] as const)
    .filter(([, list]) => list.length > 0);

  return (
    <>
      <form
        onSubmit={add}
        className="mb-8 rounded-lg border border-line bg-surface focus-within:border-line-strong"
      >
        <label htmlFor={inputId} className="sr-only">
          Neues Todo
        </label>
        <div className="flex items-center gap-3 px-4">
          <Plus size={16} className="shrink-0 text-faint" aria-hidden />
          <input
            id={inputId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Neues Todo, Enter zum Speichern"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-ink placeholder:text-faint focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            aria-label="Zuordnung"
            className="rounded-md bg-raised px-2.5 py-1.5 text-[13px] text-muted focus:text-ink"
          >
            <option value="">Privat</option>
            <option value="schule">Schule allgemein</option>
            {subjects.map((s) => (
              <option key={s.kuerzel} value={s.kuerzel}>
                {s.kuerzel}
                {s.kuerzel.startsWith("LF") ? "" : ` ${s.name}`}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label="Fällig am"
            className="rounded-md bg-raised px-2.5 py-1.5 text-[13px] text-muted [color-scheme:dark] focus:text-ink"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="ml-auto rounded-md bg-accent px-3.5 py-1.5 text-[13px] font-medium text-accent-ink transition-opacity disabled:opacity-40"
          >
            Hinzufügen
          </button>
        </div>
      </form>

      <div role="tablist" aria-label="Filter" className="mb-8 inline-flex rounded-lg bg-surface p-1">
        {filters.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3.5 py-1.5 text-[13px] transition-colors ${
              filter === f.value ? "bg-raised text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-10">
        {groups.length === 0 ? (
          <p className="text-muted">Keine offenen Todos. Neue oben eintragen.</p>
        ) : (
          groups.map(([name, list]) => (
            <section key={name}>
              <SectionTitle count={list.length}>
                <span className={name === "Überfällig" ? "text-danger" : undefined}>{name}</span>
              </SectionTitle>
              <ul>
                {list.map((t) => (
                  <TodoRow key={t.id} todo={t} today={today} onToggle={toggle} />
                ))}
              </ul>
            </section>
          ))
        )}

        {done.length ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-muted hover:text-ink">
              <ChevronDown
                size={16}
                className="-rotate-90 transition-transform group-open:rotate-0"
                aria-hidden
              />
              Erledigt <span className="font-normal text-faint">{done.length}</span>
            </summary>
            <ul className="mt-3">
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} today={today} onToggle={toggle} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </>
  );
}
