"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, X } from "lucide-react";
import { createTodo, deleteTodo, setTodoDone } from "@/app/actions";
import { diffDays, dueLabel } from "@/lib/dates";
import type { Subject, Todo } from "@/lib/types";
import { Empty, SubjectTag, buttonClass, fieldClass, fieldInlineClass } from "./hud";

type Op = { kind: "toggle"; id: string; done: boolean } | { kind: "delete"; id: string };

function reduce(state: Todo[], op: Op): Todo[] {
  if (op.kind === "delete") return state.filter((t) => t.id !== op.id);
  return state.map((t) => (t.id === op.id ? { ...t, done: op.done } : t));
}

/** Gemeinsamer Zustand: Server-Daten + sofort sichtbare Änderungen bis zur Bestätigung */
function useTodos(todos: Todo[]) {
  const [optimistic, apply] = useOptimistic(todos, reduce);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (op: Op) =>
    start(async () => {
      apply(op);
      const res = op.kind === "delete" ? await deleteTodo(op.id) : await setTodoDone(op.id, op.done);
      setError("error" in res ? res.error : null);
    });
  return { todos: optimistic, run, error };
}

/* ---------- Eine Zeile ---------- */

export function TodoRow({
  todo,
  today,
  onToggle,
  onDelete,
  showSubject = true,
}: {
  todo: Todo;
  today: string;
  onToggle: () => void;
  onDelete: () => void;
  showSubject?: boolean;
}) {
  const overdue = !todo.done && !!todo.due && diffDays(today, todo.due) < 0;
  return (
    <li className="group flex items-center gap-3 border-b border-line/70 py-2.5 last:border-b-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.done ? `${todo.title} wieder öffnen` : `${todo.title} erledigen`}
        onClick={onToggle}
        className="grid size-5 shrink-0 place-items-center"
      >
        <span
          className={`size-3 rotate-45 border transition-all ${
            todo.done ? "border-ok bg-ok shadow-[0_0_8px_#4cf0a6]" : "border-hud-dim group-hover:border-hud"
          }`}
        />
      </button>
      <span className={`min-w-0 flex-1 leading-snug ${todo.done ? "text-faint line-through" : "text-ink"}`}>
        {todo.important && !todo.done ? (
          <span className="mr-1.5 font-display font-bold text-alert" aria-label="Wichtig">
            !
          </span>
        ) : null}
        {todo.title}
      </span>
      {showSubject ? <SubjectTag subject={todo.subject} /> : null}
      {todo.due ? (
        <span className={`w-16 shrink-0 text-right font-display text-[13px] font-semibold tracking-wide ${overdue ? "text-alert glow-alert" : "text-muted"}`}>
          {dueLabel(todo.due, today)}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${todo.title} löschen`}
        className="shrink-0 text-faint opacity-60 transition hover:text-alert group-hover:opacity-100 md:opacity-0"
      >
        <X size={15} aria-hidden />
      </button>
    </li>
  );
}

/* ---------- Einfache Liste (Startseite, Lernfeld) ---------- */

export function TodoList({
  todos: initial,
  today,
  showSubject = true,
  empty,
}: {
  todos: Todo[];
  today: string;
  showSubject?: boolean;
  empty: React.ReactNode;
}) {
  const { todos, run, error } = useTodos(initial);
  if (todos.length === 0) return <Empty>{empty}</Empty>;
  return (
    <>
      <ul>
        {todos.map((t) => (
          <TodoRow
            key={t.id}
            todo={t}
            today={today}
            showSubject={showSubject}
            onToggle={() => run({ kind: "toggle", id: t.id, done: !t.done })}
            onDelete={() => run({ kind: "delete", id: t.id })}
          />
        ))}
      </ul>
      {error ? <p role="alert" className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </>
  );
}

/* ---------- Schnellerfassung ---------- */

export function TodoQuickAdd({
  subjects,
  today,
  fixedSubjectId,
}: {
  subjects: Subject[];
  today: string;
  fixedSubjectId?: string;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(fixedSubjectId ?? "");
  const [due, setDue] = useState(today);
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    start(async () => {
      const res = await createTodo({
        title,
        subjectId: subject === "schule" ? null : subject || null,
        school: subject === "schule",
        due: due || null,
        important,
      });
      if ("error" in res) setError(res.error);
      else {
        setError(null);
        setTitle("");
        setImportant(false);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="todo-title" className="sr-only">
          Neues Todo
        </label>
        <input
          id="todo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neues Todo eingeben, Enter speichert"
          className={`${fieldClass} flex-1 py-2.5`}
          autoComplete="off"
        />
        <button type="submit" disabled={!title.trim() || pending} className={buttonClass("primary")}>
          {pending ? "…" : "Speichern"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {fixedSubjectId ? null : (
          <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Zuordnung" className={`${fieldInlineClass} py-1.5 text-[13px]`}>
            <option value="">Privat</option>
            <option value="schule">Schule allgemein</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kuerzel} {s.kuerzel.startsWith("LF") ? "" : s.name}
              </option>
            ))}
          </select>
        )}
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig am" className={`${fieldInlineClass} py-1.5 text-[13px]`} />
        <label className="hud-label flex cursor-pointer items-center gap-2 text-[10px] text-muted">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-[#ff6a3d]" />
          Wichtig
        </label>
      </div>
      {error ? <p role="alert" className="text-[13px] text-alert">{error}</p> : null}
    </form>
  );
}

/* ---------- Ganze Todo-Seite ---------- */

type Filter = "alle" | "schule" | "privat";

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

export function TodoBoard({ todos: initial, today }: { todos: Todo[]; today: string }) {
  const { todos, run, error } = useTodos(initial);
  const [filter, setFilter] = useState<Filter>("alle");

  const visible = todos.filter((t) => filter === "alle" || t.area === filter);
  const open = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);
  const groups = order
    .map((name) => [name, open.filter((t) => groupOf(t, today) === name)] as const)
    .filter(([, list]) => list.length > 0);

  const row = (t: Todo) => (
    <TodoRow
      key={t.id}
      todo={t}
      today={today}
      onToggle={() => run({ kind: "toggle", id: t.id, done: !t.done })}
      onDelete={() => run({ kind: "delete", id: t.id })}
    />
  );

  return (
    <>
      <div role="tablist" aria-label="Filter" className="mb-5 inline-flex gap-1">
        {(["alle", "schule", "privat"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`hud-cut px-3.5 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.16em] ring-1 ring-inset ${
              filter === f ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-faint ring-line hover:text-hud"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <Empty>Keine offenen Todos{filter !== "alle" ? ` in ${filter}` : ""}. Oben eintragen.</Empty>
      ) : (
        <div className="space-y-6">
          {groups.map(([name, list]) => (
            <div key={name}>
              <h3 className={`hud-label mb-1 text-[11px] ${name === "Überfällig" ? "text-alert" : "text-hud-dim"}`}>
                {name} <span className="text-faint">[{String(list.length).padStart(2, "0")}]</span>
              </h3>
              <ul>{list.map(row)}</ul>
            </div>
          ))}
        </div>
      )}

      {done.length ? (
        <details className="group mt-6">
          <summary className="hud-label flex cursor-pointer list-none items-center gap-2 text-[11px] text-faint hover:text-hud">
            <ChevronDown size={14} className="-rotate-90 transition-transform group-open:rotate-0" aria-hidden />
            Erledigt [{String(done.length).padStart(2, "0")}]
          </summary>
          <ul className="mt-2">{done.map(row)}</ul>
        </details>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-[13px] text-alert">{error}</p> : null}
    </>
  );
}
