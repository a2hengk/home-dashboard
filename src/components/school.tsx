"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { createGrade, createSlot, createSubject, deleteGrade, deleteSlot, deleteSubject, updateSubject } from "@/app/actions";
import { formatShort } from "@/lib/dates";
import { formatGrade, gradeTypeLabel, weekdayNames, type Grade, type GradeType, type Slot, type Subject } from "@/lib/types";
import { Empty, buttonClass, fieldClass, labelClass } from "./hud";

const PALETTE = ["#5ce1ff", "#7dd3c0", "#f2c46d", "#b39dff", "#ff8f8f", "#a3e36b", "#ff9fd6", "#6ea8ff", "#ffb36b", "#67e8a5", "#e3a3ff", "#ffd86b"];

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: true } | { error: string }>, onOk?: () => void) =>
    start(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else {
        setError(null);
        onOk?.();
      }
    });
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="mt-2 text-[13px] text-alert">{error}</p> : null;
}

/* ---------- Fächer ---------- */

export type SubjectStats = Subject & { open: number; exam: number | null; docs: number; avg: number | null };

function SubjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  pending,
}: {
  initial: { kuerzel: string; name: string; farbe: string };
  submitLabel: string;
  onSubmit: (v: { kuerzel: string; name: string; farbe: string }) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  const [v, setV] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="grid items-end gap-3 sm:grid-cols-[6rem_1fr_auto_auto]"
    >
      <div>
        <label className={labelClass} htmlFor={`k-${initial.kuerzel || "neu"}`}>Kürzel</label>
        <input id={`k-${initial.kuerzel || "neu"}`} value={v.kuerzel} onChange={(e) => setV({ ...v, kuerzel: e.target.value })} placeholder="LF13" className={fieldClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`n-${initial.kuerzel || "neu"}`}>Name</label>
        <input id={`n-${initial.kuerzel || "neu"}`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Name des Fachs" className={fieldClass} />
      </div>
      <div>
        <span className={labelClass}>Farbe</span>
        <div className="flex gap-1">
          {PALETTE.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Farbe ${c}`}
              aria-pressed={v.farbe === c}
              onClick={() => setV({ ...v, farbe: c })}
              className="size-6 rotate-45 scale-75 transition"
              style={{ backgroundColor: c, boxShadow: v.farbe === c ? `0 0 0 2px #02060b, 0 0 0 3px ${c}, 0 0 10px ${c}` : "none" }}
            />
          ))}
          <input type="color" value={v.farbe} onChange={(e) => setV({ ...v, farbe: e.target.value })} aria-label="Eigene Farbe" title="Eigene Farbe" className="ml-1 h-[15px] w-[15px] rotate-45 cursor-pointer appearance-none border border-dashed border-hud/60 bg-transparent p-0 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0" />
        </div>
      </div>
      <div className="flex gap-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className={buttonClass("ghost")}>Abbrechen</button>
        ) : null}
        <button type="submit" disabled={pending || !v.kuerzel.trim() || !v.name.trim()} className={buttonClass("primary")}>
          {pending ? "…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SubjectRow({ s }: { s: SubjectStats }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");
  const { pending, error, run } = useAction();

  if (mode === "edit") {
    return (
      <li className="border-b border-line/70 py-3 last:border-b-0">
        <SubjectForm
          initial={{ kuerzel: s.kuerzel, name: s.name, farbe: s.farbe }}
          submitLabel="Sichern"
          pending={pending}
          onCancel={() => setMode("view")}
          onSubmit={(v) => run(() => updateSubject(s.id, v), () => setMode("view"))}
        />
        <ErrorLine error={error} />
      </li>
    );
  }

  return (
    <li className="group relative grid items-center gap-x-4 gap-y-1 border-b border-line/70 py-3 pl-4 last:border-b-0 md:grid-cols-[1fr_5rem_7rem_5rem_4rem_4.5rem]">
      <span className="absolute bottom-3 left-0 top-3 w-[2px]" style={{ backgroundColor: s.farbe, boxShadow: `0 0 6px ${s.farbe}` }} aria-hidden />
      <Link href={`/schule/${s.kuerzel.toLowerCase()}`} className="min-w-0 leading-snug hover:text-hud-strong">
        <span className="font-display font-bold tracking-wider" style={{ color: s.farbe }}>{s.kuerzel}</span>{" "}
        <span className="text-ink">{s.name}</span>
      </Link>
      <span className="flex flex-wrap gap-x-4 text-[13px] text-faint md:contents">
        <span className="md:text-right md:font-display md:text-[15px] md:font-semibold md:text-muted">
          <span className="md:hidden">Offen </span>{s.open || "–"}
        </span>
        <span className={`md:text-right md:font-display md:text-[15px] md:font-semibold ${s.exam !== null ? "text-exam" : "md:text-faint"}`}>
          {s.exam !== null ? `Prüfung ${s.exam === 0 ? "heute" : `in ${s.exam} T`}` : <span className="hidden md:inline">–</span>}
        </span>
        <span className="md:text-right md:font-display md:text-[15px] md:font-semibold md:text-muted">
          <span className="md:hidden">Dateien </span>{s.docs || "–"}
        </span>
        <span className="md:text-right md:font-display md:text-[15px] md:font-semibold md:text-ink">
          <span className="md:hidden">Schnitt </span>{s.avg !== null ? formatGrade(s.avg) : "–"}
        </span>
      </span>
      <span className="flex justify-end gap-2">
        {mode === "confirm" ? (
          <>
            <button type="button" onClick={() => setMode("view")} className="hud-label text-[10px] text-faint hover:text-ink">Nein</button>
            <button type="button" disabled={pending} onClick={() => run(() => deleteSubject(s.id))} className="hud-label text-[10px] text-alert">
              Löschen
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setMode("edit")} aria-label={`${s.kuerzel} bearbeiten`} className="text-faint hover:text-hud md:opacity-0 md:group-hover:opacity-100">
              <Pencil size={14} aria-hidden />
            </button>
            <button type="button" onClick={() => setMode("confirm")} aria-label={`${s.kuerzel} löschen`} className="text-faint hover:text-alert md:opacity-0 md:group-hover:opacity-100">
              <Trash2 size={14} aria-hidden />
            </button>
          </>
        )}
      </span>
      {mode === "confirm" ? (
        <p className="text-[12px] text-alert md:col-span-6">Stundenplan und Noten von {s.kuerzel} werden mitgelöscht, Todos, Termine und Dateien bleiben.</p>
      ) : null}
      <ErrorLine error={error} />
    </li>
  );
}

export function SubjectManager({ subjects }: { subjects: SubjectStats[] }) {
  const { pending, error, run } = useAction();
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <div className="hud-label hidden grid-cols-[1fr_5rem_7rem_5rem_4rem_4.5rem] gap-4 border-b border-line pb-2 pl-4 text-[9px] text-faint md:grid" aria-hidden>
        <span>Fach</span>
        <span className="text-right">Offen</span>
        <span className="text-right">Prüfung</span>
        <span className="text-right">Dateien</span>
        <span className="text-right">Schnitt</span>
        <span />
      </div>
      {subjects.length ? (
        <ul>
          {subjects.map((s) => (
            <SubjectRow key={s.id} s={s} />
          ))}
        </ul>
      ) : (
        <Empty>Noch keine Fächer. Unten das erste anlegen.</Empty>
      )}
      <div className="mt-5 border-t border-line pt-4">
        <p className="hud-label mb-3 text-[10px] text-hud-dim">Fach hinzufügen</p>
        <SubjectForm
          key={formKey}
          initial={{ kuerzel: "", name: "", farbe: PALETTE[subjects.length % PALETTE.length] }}
          submitLabel="Anlegen"
          pending={pending}
          onSubmit={(v) => run(() => createSubject(v), () => setFormKey((k) => k + 1))}
        />
        <ErrorLine error={error} />
      </div>
    </>
  );
}

/* ---------- Stundenplan ---------- */

export function TimetableEditor({ slots, subjects }: { slots: Slot[]; subjects: Subject[] }) {
  const { pending, error, run } = useAction();
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("07:45");
  const [end, setEnd] = useState("09:15");
  const [subjectId, setSubjectId] = useState("");
  const [room, setRoom] = useState("");

  return (
    <>
      <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-5">
        {weekdayNames.map((name, i) => {
          const day = slots.filter((s) => s.weekday === i + 1);
          return (
            <div key={name} className="bg-panel-solid p-3">
              <p className="hud-label mb-2 text-[10px] text-hud-dim">{name}</p>
              {day.length === 0 ? (
                <p className="text-[12px] text-faint">frei</p>
              ) : (
                <ul className="space-y-2">
                  {day.map((s) => (
                    <li key={s.id} className="group relative border-l-2 pl-2" style={{ borderColor: s.subject.farbe }}>
                      <p className="font-display text-[12px] font-semibold text-faint">{s.start}–{s.end}</p>
                      <p className="font-display text-[14px] font-bold tracking-wider" style={{ color: s.subject.farbe }}>{s.subject.kuerzel}</p>
                      {s.room ? <p className="text-[12px] text-faint">Raum {s.room}</p> : null}
                      <button
                        type="button"
                        onClick={() => run(() => deleteSlot(s.id))}
                        aria-label={`${s.subject.kuerzel} ${name} ${s.start} löschen`}
                        className="absolute right-0 top-0 text-faint opacity-60 hover:text-alert group-hover:opacity-100 md:opacity-0"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createSlot({ weekday, start, end, subjectId, room }), () => {
            // Nächste Stunde direkt vorschlagen
            setStart(end);
            setRoom("");
          });
        }}
        className="mt-5 grid items-end gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_6rem_6rem_1.4fr_5rem_auto]"
      >
        <div>
          <label className={labelClass} htmlFor="slot-day">Tag</label>
          <select id="slot-day" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={fieldClass}>
            {weekdayNames.map((n, i) => (
              <option key={n} value={i + 1}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="slot-start">Beginn</label>
          <input id="slot-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="slot-end">Ende</label>
          <input id="slot-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="slot-subject">Fach</label>
          <select id="slot-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={fieldClass}>
            <option value="">Fach wählen</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.kuerzel} {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="slot-room">Raum</label>
          <input id="slot-room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="B204" className={fieldClass} />
        </div>
        <button type="submit" disabled={pending || !subjectId} className={buttonClass("primary")}>
          {pending ? "…" : "Hinzufügen"}
        </button>
      </form>
      <ErrorLine error={error} />
    </>
  );
}

/* ---------- Noten ---------- */

export function GradeEditor({ grades, subjectId, today }: { grades: Grade[]; subjectId: string; today: string }) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState("");
  const [type, setType] = useState<GradeType>("test");
  const [weight, setWeight] = useState("1");
  const [date, setDate] = useState(today);

  return (
    <>
      {grades.length === 0 ? (
        <Empty>Noch keine Noten.</Empty>
      ) : (
        <ul>
          {grades.map((g) => (
            <li key={g.id} className="group flex items-baseline gap-4 border-b border-line/70 py-2.5 first:pt-0 last:border-b-0">
              <span className="glow w-12 font-display text-[24px] font-bold text-hud-strong">{formatGrade(g.value)}</span>
              <span className="flex-1 text-muted">
                {gradeTypeLabel[g.type]}
                {g.weight !== 1 ? <span className="text-faint">, zählt {String(g.weight).replace(".", ",")}-fach</span> : null}
              </span>
              <span className="font-display text-[13px] font-semibold text-faint">{formatShort(g.date)}</span>
              <button type="button" onClick={() => run(() => deleteGrade(g.id))} aria-label="Note löschen" className="text-faint opacity-60 hover:text-alert group-hover:opacity-100 md:opacity-0">
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => createGrade({ subjectId, value: Number(value.replace(",", ".")), weight: Number(weight.replace(",", ".")), type, date }),
            () => setValue(""),
          );
        }}
        className="mt-4 grid grid-cols-2 items-end gap-3 border-t border-line pt-4 sm:grid-cols-[4.5rem_1fr_4.5rem_1fr]"
      >
        <div>
          <label className={labelClass} htmlFor="g-value">Note</label>
          <input id="g-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="2,3" className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="g-type">Art</label>
          <select id="g-type" value={type} onChange={(e) => setType(e.target.value as GradeType)} className={fieldClass}>
            {Object.entries(gradeTypeLabel).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="g-weight">Faktor</label>
          <input id="g-weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="g-date">Datum</label>
          <input id="g-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
        </div>
        <button type="submit" disabled={pending || !value.trim()} className={`${buttonClass("primary")} col-span-2 sm:col-span-4`}>
          {pending ? "…" : "Note eintragen"}
        </button>
      </form>
      <ErrorLine error={error} />
    </>
  );
}
