"use client";

import { useOptimistic, useState, useTransition } from "react";
import { X } from "lucide-react";
import { createEvent, deleteEvent, setEventImportant } from "@/app/actions";
import { formatShort, relativeDay, weekdayShort } from "@/lib/dates";
import { eventMeta } from "@/lib/event-types";
import type { EventItem, EventType, Subject } from "@/lib/types";
import { Empty, SubjectTag, buttonClass, fieldClass, labelClass } from "./hud";

export function EventForm({ subjects, today, fixedSubjectId }: { subjects: Subject[]; today: string; fixedSubjectId?: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("pruefung");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [subjectId, setSubjectId] = useState(fixedSubjectId ?? "");
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createEvent({ title, type, date, time, subjectId: subjectId || null, important });
      if ("error" in res) setError(res.error);
      else {
        setError(null);
        setTitle("");
        setTime("");
        setImportant(false);
      }
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <label htmlFor="ev-title" className={labelClass}>Titel</label>
        <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.b. Klassenarbeit SQL" className={fieldClass} autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="ev-type" className={labelClass}>Art</label>
        <select id="ev-type" value={type} onChange={(e) => setType(e.target.value as EventType)} className={fieldClass}>
          <option value="pruefung">Prüfung</option>
          <option value="abgabe">Abgabe</option>
          <option value="privat">Termin (privat)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="ev-date" className={labelClass}>Datum</label>
        <input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="ev-time" className={labelClass}>Uhrzeit (optional)</label>
        <input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
      </div>
      {fixedSubjectId ? null : (
        <div className="sm:col-span-3">
          <label htmlFor="ev-subject" className={labelClass}>Fach</label>
          <select id="ev-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={fieldClass}>
            <option value="">Kein Fach</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.kuerzel} {s.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className={`flex items-end justify-between gap-3 ${fixedSubjectId ? "sm:col-span-6" : "sm:col-span-3"}`}>
        <label className="hud-label flex cursor-pointer items-center gap-2 pb-2 text-[10px] text-muted">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-[#ff6a3d]" />
          Wichtig, farbig hervorheben
        </label>
        <button type="submit" disabled={!title.trim() || pending} className={buttonClass("primary")}>
          {pending ? "…" : "Eintragen"}
        </button>
      </div>
      {error ? <p role="alert" className="text-[13px] text-alert sm:col-span-6">{error}</p> : null}
    </form>
  );
}

type Op = { kind: "delete"; id: string } | { kind: "important"; id: string; value: boolean };

export function EventList({ events: initial, today, showSubject = true, empty }: { events: EventItem[]; today: string; showSubject?: boolean; empty: React.ReactNode }) {
  const [events, apply] = useOptimistic(initial, (state: EventItem[], op: Op) =>
    op.kind === "delete" ? state.filter((e) => e.id !== op.id) : state.map((e) => (e.id === op.id ? { ...e, important: op.value } : e)),
  );
  const [, start] = useTransition();
  const run = (op: Op) =>
    start(async () => {
      apply(op);
      if (op.kind === "delete") await deleteEvent(op.id);
      else await setEventImportant(op.id, op.value);
    });

  if (events.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul>
      {events.map((e) => {
        const meta = eventMeta[e.type];
        const past = e.date < today;
        return (
          <li key={e.id} className={`group grid grid-cols-[3px_4.5rem_1fr_auto] items-center gap-3 border-b border-line/70 py-2.5 last:border-b-0 sm:grid-cols-[3px_7rem_1fr_auto] ${past ? "opacity-50" : ""}`}>
            <span className="h-6" style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}` }} aria-hidden />
            <span className="font-display text-[13px] font-semibold uppercase leading-tight tracking-wider text-muted">
              {weekdayShort(e.date)} {formatShort(e.date).split(", ")[1] ?? formatShort(e.date)}
              <span className="block text-[11px] text-faint">{e.time ?? relativeDay(e.date, today)}</span>
            </span>
            <span className="min-w-0">
              <span className={e.important ? "font-semibold text-ink" : "text-ink"}>{e.title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3">
                <span className="hud-label text-[9px]" style={{ color: meta.color }}>{meta.label}</span>
                {showSubject ? <SubjectTag subject={e.subject} /> : null}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => run({ kind: "important", id: e.id, value: !e.important })}
                aria-pressed={e.important}
                aria-label={e.important ? "Nicht mehr wichtig" : "Als wichtig markieren"}
                className="hud-label px-1.5 py-0.5 text-[9px] transition"
                style={e.important ? { color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}` } : { color: "var(--color-faint)", boxShadow: "inset 0 0 0 1px var(--color-line)" }}
              >
                Wichtig
              </button>
              <button type="button" onClick={() => run({ kind: "delete", id: e.id })} aria-label={`${e.title} löschen`} className="text-faint opacity-60 transition hover:text-alert group-hover:opacity-100 md:opacity-0">
                <X size={15} aria-hidden />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
