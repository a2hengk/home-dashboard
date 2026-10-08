"use client";

import { Check, Flag } from "lucide-react";
import { diffDays, dueLabel } from "@/lib/dates";
import type { Todo } from "@/lib/sample-data";
import { SubjectTag } from "./ui";

export function TodoRow({
  todo,
  today,
  onToggle,
  showSubject = true,
}: {
  todo: Todo;
  today: string;
  onToggle: (id: string) => void;
  showSubject?: boolean;
}) {
  const overdue = !todo.done && todo.due !== undefined && diffDays(today, todo.due) < 0;

  return (
    <li className="group flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={!!todo.done}
        aria-label={todo.done ? `${todo.title} wieder öffnen` : `${todo.title} erledigen`}
        onClick={() => onToggle(todo.id)}
        className={`mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
          todo.done
            ? "border-accent bg-accent text-accent-ink"
            : "border-line-strong hover:border-accent"
        }`}
      >
        {todo.done ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
      </button>

      <span
        className={`min-w-0 flex-1 text-[15px] leading-snug ${
          todo.done ? "text-faint line-through decoration-faint" : "text-ink"
        }`}
      >
        {todo.title}
      </span>

      <span className="flex shrink-0 items-center gap-3 pt-px">
        {todo.important && !todo.done ? (
          <Flag size={13} strokeWidth={2} className="text-danger" aria-label="Wichtig" />
        ) : null}
        {showSubject ? <SubjectTag kuerzel={todo.subject} /> : null}
        {todo.due ? (
          <span className={`w-16 text-right text-[13px] ${overdue ? "text-danger" : "text-faint"}`}>
            {dueLabel(todo.due, today)}
          </span>
        ) : (
          <span className="w-16" aria-hidden />
        )}
      </span>
    </li>
  );
}
