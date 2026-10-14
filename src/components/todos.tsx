"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, ListPlus, Pencil, Plus, X } from "lucide-react";
import { addTodoStep, createTodo, deleteTodo, deleteTodoStep, setTodoDone, setTodoStepDone, updateTodo } from "@/app/actions";
import { diffDays, dueLabel } from "@/lib/dates";
import type { Subject, Todo, TodoArea, TodoStep } from "@/lib/types";
import { Empty, SubjectTag, buttonClass, fieldClass, fieldInlineClass } from "./hud";

type TodoFields = { title: string; zuordnung: string; due: string; important: boolean };

type Op =
  | { kind: "toggle"; id: string; done: boolean }
  | { kind: "delete"; id: string }
  | { kind: "edit"; id: string; fields: TodoFields; subjects: Subject[] }
  | StepOp;

/** Änderungen an Unterpunkten, todoId zeigt auf das Todo, in dem der Punkt hängt */
type StepOp =
  | { kind: "step-add"; todoId: string; tempId: string; title: string }
  | { kind: "step-toggle"; todoId: string; id: string; done: boolean }
  | { kind: "step-delete"; todoId: string; id: string };

/* Zuordnung im Formular: "" = privat, "schule"/"arbeit" = Bereich ohne Fach, sonst eine Fach-ID */
function zuordnungOf(todo: Todo) {
  return todo.subject?.id ?? (todo.area === "privat" ? "" : todo.area);
}

function toInput(f: TodoFields) {
  const bereich = f.zuordnung === "schule" || f.zuordnung === "arbeit";
  return {
    title: f.title,
    subjectId: bereich ? null : f.zuordnung || null,
    area: (bereich ? f.zuordnung : "privat") as TodoArea,
    due: f.due || null,
    important: f.important,
  };
}

function reduceSteps(todo: Todo, op: StepOp): Todo {
  if (op.kind === "step-add") return { ...todo, steps: [...todo.steps, { id: op.tempId, title: op.title.trim(), done: false }] };
  if (op.kind === "step-delete") return { ...todo, steps: todo.steps.filter((s) => s.id !== op.id) };
  return { ...todo, steps: todo.steps.map((s) => (s.id === op.id ? { ...s, done: op.done } : s)) };
}

function reduce(state: Todo[], op: Op): Todo[] {
  if (op.kind.startsWith("step-")) {
    const stepOp = op as StepOp;
    return state.map((t) => (t.id === stepOp.todoId ? reduceSteps(t, stepOp) : t));
  }
  if (op.kind === "delete") return state.filter((t) => t.id !== op.id);
  if (op.kind === "edit") {
    const v = toInput(op.fields);
    const s = op.subjects.find((x) => x.id === v.subjectId);
    const subject = s ? { id: s.id, kuerzel: s.kuerzel, name: s.name, farbe: s.farbe } : null;
    return state.map((t) =>
      t.id === op.id
        ? { ...t, title: v.title.trim(), area: subject ? "schule" : v.area, subject, due: v.due, important: v.important }
        : t,
    );
  }
  if (op.kind === "toggle") return state.map((t) => (t.id === op.id ? { ...t, done: op.done } : t));
  return state;
}

function send(op: Op) {
  switch (op.kind) {
    case "delete":
      return deleteTodo(op.id);
    case "edit":
      return updateTodo(op.id, toInput(op.fields));
    case "toggle":
      return setTodoDone(op.id, op.done);
    case "step-add":
      return addTodoStep(op.todoId, op.title);
    case "step-toggle":
      return setTodoStepDone(op.id, op.done);
    case "step-delete":
      return deleteTodoStep(op.id);
  }
}

/** Gemeinsamer Zustand: Server-Daten + sofort sichtbare Änderungen bis zur Bestätigung */
function useTodos(todos: Todo[]) {
  const [optimistic, apply] = useOptimistic(todos, reduce);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (op: Op) =>
    start(async () => {
      apply(op);
      const res = await send(op);
      setError("error" in res ? res.error : null);
    });
  return { todos: optimistic, run, error };
}

/* ---------- Eine Zeile ---------- */

export function TodoRow({
  todo,
  today,
  subjects,
  onToggle,
  onDelete,
  onEdit,
  onStep,
  showSubject = true,
}: {
  todo: Todo;
  today: string;
  subjects: Subject[];
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (fields: TodoFields) => void;
  onStep: (op: StepOp) => void;
  showSubject?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const overdue = !todo.done && !!todo.due && diffDays(today, todo.due) < 0;
  const stepsDone = todo.steps.filter((s) => s.done).length;

  if (editing)
    return (
      <li className="border-b border-line/70 py-2.5 last:border-b-0">
        <TodoEditForm
          todo={todo}
          subjects={subjects}
          onCancel={() => setEditing(false)}
          onSave={(fields) => {
            setEditing(false);
            onEdit(fields);
          }}
        />
      </li>
    );

  return (
    <li className="border-b border-line/70 py-2.5 last:border-b-0">
      <div className="group flex items-center gap-3">
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
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Bearbeiten"
          className={`min-w-0 flex-1 cursor-text text-left leading-snug ${todo.done ? "text-faint line-through" : "text-ink"}`}
        >
          {todo.important && !todo.done ? (
            <span className="mr-1.5 font-display font-bold text-alert" aria-label="Wichtig">
              !
            </span>
          ) : null}
          {todo.title}
          {todo.steps.length ? (
            <span
              className={`ml-2 font-display text-[12px] font-semibold tracking-wide ${
                stepsDone === todo.steps.length ? "text-ok" : "text-faint"
              }`}
              aria-label={`${stepsDone} von ${todo.steps.length} Unterpunkten erledigt`}
            >
              {stepsDone}/{todo.steps.length}
            </span>
          ) : null}
        </button>
        {showSubject ? (
          todo.area === "arbeit" ? <span className="hud-label shrink-0 text-[10px] text-warn">Arbeit</span> : <SubjectTag subject={todo.subject} />
        ) : null}
        {todo.due ? (
          <span className={`w-16 shrink-0 text-right font-display text-[13px] font-semibold tracking-wide ${overdue ? "text-alert glow-alert" : "text-muted"}`}>
            {dueLabel(todo.due, today)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label={`Unterpunkt zu ${todo.title} hinzufügen`}
          title="Unterpunkt hinzufügen"
          className="shrink-0 text-faint opacity-60 transition hover:text-hud group-hover:opacity-100 md:opacity-0"
        >
          <ListPlus size={15} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`${todo.title} bearbeiten`}
          className="shrink-0 text-faint opacity-60 transition hover:text-hud group-hover:opacity-100 md:opacity-0"
        >
          <Pencil size={14} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`${todo.title} löschen`}
          className="shrink-0 text-faint opacity-60 transition hover:text-alert group-hover:opacity-100 md:opacity-0"
        >
          <X size={15} aria-hidden />
        </button>
      </div>

      {todo.steps.length || adding ? (
        <ul className={`mt-1.5 ml-[9px] space-y-0.5 border-l border-line/70 pl-5 ${todo.done ? "opacity-60" : ""}`}>
          {todo.steps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              onToggle={() => onStep({ kind: "step-toggle", todoId: todo.id, id: s.id, done: !s.done })}
              onDelete={() => onStep({ kind: "step-delete", todoId: todo.id, id: s.id })}
            />
          ))}
          <li>
            {adding ? (
              <StepAddForm
                onCancel={() => setAdding(false)}
                onAdd={(title) => onStep({ kind: "step-add", todoId: todo.id, tempId: `tmp-${crypto.randomUUID()}`, title })}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="hud-label flex items-center gap-1.5 py-1 text-[10px] text-faint transition hover:text-hud"
              >
                <Plus size={12} aria-hidden /> Unterpunkt
              </button>
            )}
          </li>
        </ul>
      ) : null}
    </li>
  );
}

/* ---------- Unterpunkte ---------- */

function StepRow({ step, onToggle, onDelete }: { step: TodoStep; onToggle: () => void; onDelete: () => void }) {
  // Noch nicht gespeicherte Punkte haben nur eine vorläufige ID, die kann der Server nicht kennen
  const pending = step.id.startsWith("tmp-");
  return (
    <li className="group/step flex items-center gap-2.5 py-0.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={step.done}
        aria-label={step.done ? `${step.title} wieder öffnen` : `${step.title} erledigen`}
        onClick={onToggle}
        disabled={pending}
        className="grid size-4 shrink-0 place-items-center disabled:opacity-50"
      >
        <span
          className={`size-2 rotate-45 border transition-all ${
            step.done ? "border-ok bg-ok" : "border-hud-dim group-hover/step:border-hud"
          }`}
        />
      </button>
      <span className={`min-w-0 flex-1 text-[14px] leading-snug ${step.done ? "text-faint line-through" : "text-muted"}`}>{step.title}</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label={`${step.title} löschen`}
        className="shrink-0 text-faint opacity-60 transition hover:text-alert group-hover/step:opacity-100 disabled:hidden md:opacity-0"
      >
        <X size={13} aria-hidden />
      </button>
    </li>
  );
}

/** Bleibt nach Enter offen, damit man mehrere Punkte am Stück eintippen kann */
function StepAddForm({ onAdd, onCancel }: { onAdd: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title);
        setTitle("");
      }}
      className="flex items-center gap-2 py-1"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        onBlur={() => !title.trim() && onCancel()}
        placeholder="Unterpunkt, Enter speichert"
        aria-label="Neuer Unterpunkt"
        maxLength={200}
        autoFocus
        autoComplete="off"
        className={`${fieldInlineClass} flex-1 py-1 text-[13px]`}
      />
      <button type="submit" disabled={!title.trim()} className={`${buttonClass("ghost")} px-2.5 py-1`}>
        <Plus size={13} aria-hidden />
        <span className="sr-only">Hinzufügen</span>
      </button>
    </form>
  );
}

/* ---------- Bearbeiten ---------- */

function ZuordnungSelect({ value, onChange, subjects }: { value: string; onChange: (v: string) => void; subjects: Subject[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Zuordnung" className={`${fieldInlineClass} py-1.5 text-[13px]`}>
      <option value="">Privat</option>
      <option value="arbeit">Arbeit</option>
      <option value="schule">Schule allgemein</option>
      {subjects.map((s) => (
        <option key={s.id} value={s.id}>
          {s.kuerzel} {s.kuerzel.startsWith("LF") ? "" : s.name}
        </option>
      ))}
    </select>
  );
}

function TodoEditForm({
  todo,
  subjects,
  onSave,
  onCancel,
}: {
  todo: Todo;
  subjects: Subject[];
  onSave: (fields: TodoFields) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<TodoFields>({
    title: todo.title,
    zuordnung: zuordnungOf(todo),
    due: todo.due ?? "",
    important: todo.important,
  });
  const set = (patch: Partial<TodoFields>) => setFields((f) => ({ ...f, ...patch }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fields.title.trim()) return;
    onSave(fields);
  };

  return (
    <form onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onCancel()} className="space-y-2">
      <label htmlFor={`todo-edit-${todo.id}`} className="sr-only">
        Titel
      </label>
      <input
        id={`todo-edit-${todo.id}`}
        value={fields.title}
        onChange={(e) => set({ title: e.target.value })}
        maxLength={200}
        autoFocus
        autoComplete="off"
        className={`${fieldClass} py-2`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <ZuordnungSelect value={fields.zuordnung} onChange={(zuordnung) => set({ zuordnung })} subjects={subjects} />
        <input
          type="date"
          value={fields.due}
          onChange={(e) => set({ due: e.target.value })}
          aria-label="Fällig am"
          className={`${fieldInlineClass} py-1.5 text-[13px]`}
        />
        <label className="hud-label flex cursor-pointer items-center gap-2 text-[10px] text-muted">
          <input type="checkbox" checked={fields.important} onChange={(e) => set({ important: e.target.checked })} className="accent-[#ff6a3d]" />
          Wichtig
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onCancel} className={`${buttonClass("ghost")} px-3 py-1.5`}>
            Abbrechen
          </button>
          <button type="submit" disabled={!fields.title.trim()} className={`${buttonClass("primary")} px-3 py-1.5`}>
            Speichern
          </button>
        </div>
      </div>
    </form>
  );
}

/* ---------- Einfache Liste (Startseite, Lernfeld) ---------- */

export function TodoList({
  todos: initial,
  today,
  subjects,
  showSubject = true,
  empty,
}: {
  todos: Todo[];
  today: string;
  subjects: Subject[];
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
            subjects={subjects}
            showSubject={showSubject}
            onToggle={() => run({ kind: "toggle", id: t.id, done: !t.done })}
            onDelete={() => run({ kind: "delete", id: t.id })}
            onEdit={(fields) => run({ kind: "edit", id: t.id, fields, subjects })}
            onStep={run}
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
      const res = await createTodo(toInput({ title, zuordnung: subject, due, important }));
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
        {fixedSubjectId ? null : <ZuordnungSelect value={subject} onChange={setSubject} subjects={subjects} />}
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

type Filter = "alle" | TodoArea;

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

export function TodoBoard({ todos: initial, today, subjects }: { todos: Todo[]; today: string; subjects: Subject[] }) {
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
      subjects={subjects}
      onToggle={() => run({ kind: "toggle", id: t.id, done: !t.done })}
      onDelete={() => run({ kind: "delete", id: t.id })}
      onEdit={(fields) => run({ kind: "edit", id: t.id, fields, subjects })}
      onStep={run}
    />
  );

  return (
    <>
      <div role="tablist" aria-label="Filter" className="mb-5 inline-flex gap-1">
        {(["alle", "schule", "arbeit", "privat"] as const).map((f) => (
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
