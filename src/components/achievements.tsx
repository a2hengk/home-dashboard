"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { hierarchy, pack } from "d3-hierarchy";
import { BookOpenCheck, CheckCheck, Trash2, X } from "lucide-react";
import { createAchievement, deleteAchievement } from "@/app/actions";
import { addDays, formatShort } from "@/lib/dates";
import type { Achievement, AchievementKind } from "@/lib/types";
import { Toast, useToast } from "./files";
import { Empty, HudPanel, Readout, buttonClass, fieldClass, labelClass } from "./hud";

/* ---------- Farben ---------- */

// Kühle HUD-Töne zuerst, dann wärmere, damit viele Gruppen unterscheidbar bleiben
const palette = ["#5ce1ff", "#b39dff", "#4cf0a6", "#ffb547", "#ff8fc8", "#6ea8ff", "#ffd86b", "#7dd3c0", "#ff8f6b", "#c9e36b"];
const fixed: Record<string, string> = { Privat: "#a6f1ff", Arbeit: "#ffb547", Schule: "#b39dff" };

/**
 * Jede Gruppe bekommt eine eigene Farbe: feste für die Bereiche, Fachfarbe für Schul-Todos,
 * der Rest der Reihe nach (alphabetisch, damit sich Farben beim Filtern nicht verschieben).
 */
function buildColors(items: Achievement[]) {
  const map = new Map<string, string>();
  for (const a of items) if (a.color && !map.has(a.gruppe)) map.set(a.gruppe, a.color);
  for (const [name, c] of Object.entries(fixed)) if (!map.has(name)) map.set(name, c);
  const used = new Set(map.values());
  const free = palette.filter((c) => !used.has(c));
  const rest = [...new Set(items.map((a) => a.gruppe))].filter((g) => !map.has(g)).sort((a, b) => a.localeCompare(b, "de"));
  rest.forEach((g, i) => map.set(g, free[i % free.length] ?? palette[i % palette.length]));
  return (name: string) => map.get(name) ?? palette[0];
}

/** Fläche statt Radius skalieren, sonst wirkt "groß" viel zu groß */
const area = { 1: 1, 2: 2.4, 3: 5 } as const;
const sizeLabel = { 1: "Klein", 2: "Mittel", 3: "Groß" } as const;

type Range = "alles" | "jahr" | "30";
type KindFilter = "alle" | AchievementKind;

type Leaf = { kind: "leaf"; item: Achievement; value: number };
type Group = { kind: "group"; name: string; color: string; children: Leaf[] };
type Root = { kind: "root"; children: Group[] };
type Datum = Root | Group | Leaf;

const SIZE = 760;

/* ---------- Ansicht ---------- */

export function AchievementsView({ items, today }: { items: Achievement[]; today: string }) {
  const toast = useToast();
  const [range, setRange] = useState<Range>("alles");
  const [kind, setKind] = useState<KindFilter>("alle");
  const [withTodos, setWithTodos] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const colorOf = useMemo(() => buildColors(items), [items]);

  const visible = useMemo(() => {
    const from = range === "30" ? addDays(today, -30) : range === "jahr" ? `${today.slice(0, 4)}-01-01` : "";
    return items.filter(
      (a) => (!from || a.date >= from) && (kind === "alle" || a.kind === kind) && (withTodos || a.source === "eintrag"),
    );
  }, [items, range, kind, withTodos, today]);

  const groups = useMemo(() => {
    const map = new Map<string, Achievement[]>();
    for (const a of visible) map.set(a.gruppe, [...(map.get(a.gruppe) ?? []), a]);
    return [...map.entries()]
      .map(([name, list]) => ({ name, list, color: colorOf(name) }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [visible, colorOf]);

  const layout = useMemo(() => {
    if (!visible.length) return null;
    const root = hierarchy<Datum>(
      {
        kind: "root",
        children: groups.map((g) => ({
          kind: "group",
          name: g.name,
          color: g.color,
          children: g.list.map((item) => ({ kind: "leaf", item, value: area[item.gewicht] })),
        })),
      },
      (d) => (d.kind === "leaf" ? undefined : (d.children as Datum[])),
    )
      .sum((d) => (d.kind === "leaf" ? d.value : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    // Abstand zwischen den Gruppen größer als innerhalb, damit die Cluster lesbar bleiben
    return pack<Datum>().size([SIZE, SIZE]).padding((n) => (n.depth === 0 ? 18 : 7))(root);
  }, [groups, visible.length]);

  const current = visible.find((a) => a.id === selected) ?? null;
  const allGroups = useMemo(() => [...new Set(items.map((a) => a.gruppe))].sort(), [items]);
  const learned = visible.filter((a) => a.kind === "gelernt").length;
  const month = visible.filter((a) => a.date.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <HudPanel label="Blasen" code={`OBJ-${String(visible.length).padStart(3, "0")}`} className="!p-3 sm:!p-5">
          <Filters
            range={range}
            setRange={setRange}
            kind={kind}
            setKind={setKind}
            withTodos={withTodos}
            setWithTodos={setWithTodos}
          />
          {layout ? (
            <BubbleMap layout={layout} selected={selected} onSelect={setSelected} />
          ) : (
            <Empty>Hier ist noch nichts. Trag rechts ein, was du geschafft oder gelernt hast, oder hak ein paar Todos ab.</Empty>
          )}
          {groups.length ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Gruppen">
              {groups.map((g) => (
                <li key={g.name} className="flex items-center gap-1.5 font-display text-[13px] font-semibold tracking-wider" style={{ color: g.color }}>
                  <span aria-hidden className="size-2 rounded-full" style={{ background: g.color, boxShadow: `0 0 6px ${g.color}` }} />
                  {g.name}
                  <span className="text-faint">{g.list.length}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </HudPanel>

        <div className="flex flex-col gap-6">
          {current ? (
            <Detail item={current} color={colorOf(current.gruppe)} onClose={() => setSelected(null)} onMessage={toast.show} />
          ) : (
            <HudPanel label="Status" code="SYS">
              <div className="space-y-3">
                <Readout label="Erfolge" value={visible.length} tone="var(--color-hud-strong)" />
                <Readout label="Davon gelernt" value={learned} />
                <Readout label="Gruppen" value={groups.length} />
                <Readout label="Diesen Monat" value={month} tone="var(--color-ok)" />
              </div>
              <p className="mt-4 text-[13px] text-muted">Tipp auf eine Blase für Details.</p>
            </HudPanel>
          )}
          <AddForm today={today} groups={allGroups} onMessage={toast.show} />
        </div>
      </div>

      <Chronik items={visible} colorOf={colorOf} onSelect={setSelected} />
      <Toast message={toast.message} />
    </>
  );
}

/* ---------- Blasen ---------- */

function BubbleMap({
  layout,
  selected,
  onSelect,
}: {
  layout: ReturnType<ReturnType<typeof pack<Datum>>>;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const glowId = useId().replace(/:/g, "");
  const groups = layout.children ?? [];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[720px]" role="group" aria-label="Erfolge als Blasen, gruppiert">
      <defs>
        <filter id={`${glowId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {groups.map((g, gi) => {
        const data = g.data as Group;
        const c = data.color;
        // Name oben in der Gruppenblase, nur wenn genug Platz ist
        const labelSize = Math.max(11, Math.min(18, g.r / 5));
        return (
          <g key={data.name}>
            <circle cx={g.x} cy={g.y} r={g.r} fill={c} fillOpacity={0.05} stroke={c} strokeOpacity={0.45} strokeWidth={1} />
            <circle cx={g.x} cy={g.y} r={g.r + 5} fill="none" stroke={c} strokeOpacity={0.18} strokeDasharray="2 7" />
            {(g.children ?? []).map((n, i) => {
              const a = (n.data as Leaf).item;
              const active = a.id === selected;
              const learned = a.kind === "gelernt";
              const seed = (gi * 7 + i * 13) % 10;
              const fontSize = Math.min(15, Math.max(9, n.r / 3.4));
              const maxChars = Math.floor((n.r * 1.7) / (fontSize * 0.55));
              const words = wrap(a.title, maxChars, n.r > 34 ? 3 : 2);
              return (
                <g
                  key={a.id}
                  className="bubble-float cursor-pointer outline-none"
                  style={
                    {
                      "--fx": `${(seed % 3) - 1}px`,
                      "--fy": `${-2 - (seed % 4)}px`,
                      "--fd": `${5 + seed * 0.6}s`,
                      "--fdelay": `${-seed * 0.7}s`,
                    } as React.CSSProperties
                  }
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  aria-label={`${a.title}, ${a.gruppe}, ${learned ? "gelernt" : "geschafft"} am ${formatShort(a.date)}`}
                  onClick={() => onSelect(active ? null : a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(active ? null : a.id);
                    }
                  }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={c}
                    fillOpacity={learned ? 0.08 : active ? 0.42 : 0.22}
                    stroke={c}
                    strokeOpacity={active ? 1 : 0.8}
                    strokeWidth={active ? 2.5 : 1.25}
                    strokeDasharray={learned ? "4 3" : undefined}
                    filter={active ? `url(#${glowId}-glow)` : undefined}
                    className="transition-[fill-opacity] duration-200 hover:[fill-opacity:0.4]"
                  />
                  {/* Kleiner Glanzpunkt, damit es nach Blase aussieht */}
                  <circle cx={n.x - n.r * 0.38} cy={n.y - n.r * 0.42} r={Math.max(1.5, n.r * 0.12)} fill="#ffffff" fillOpacity={0.18} pointerEvents="none" />
                  {n.r > 16 ? (
                    <text x={n.x} y={n.y} textAnchor="middle" fill="#e8fbff" fontSize={fontSize} fontFamily="var(--font-display)" fontWeight={600} pointerEvents="none">
                      {words.map((w, k) => (
                        <tspan key={k} x={n.x} dy={k === 0 ? `${-(words.length - 1) * 0.55 + 0.35}em` : "1.1em"}>
                          {w}
                        </tspan>
                      ))}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {g.r > 40 ? (
              <text
                x={g.x}
                y={g.y - g.r + labelSize + 4}
                textAnchor="middle"
                fill={c}
                fontSize={labelSize}
                fontFamily="var(--font-display)"
                fontWeight={700}
                letterSpacing="0.16em"
                pointerEvents="none"
                style={{ textTransform: "uppercase", paintOrder: "stroke", stroke: "#02060b", strokeWidth: 4 }}
              >
                {data.name}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Text in ein paar Zeilen umbrechen, Rest mit … abschneiden */
function wrap(text: string, max: number, lines: number): string[] {
  if (max < 3) return [];
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= max) line = next;
    else {
      if (line) out.push(line);
      line = word.length > max ? `${word.slice(0, max - 1)}…` : word;
    }
    if (out.length === lines) break;
  }
  if (out.length < lines && line) out.push(line);
  if (out.length === lines && out.join(" ").length < text.length) {
    const last = out[lines - 1];
    out[lines - 1] = last.length >= max ? `${last.slice(0, max - 1)}…` : `${last}…`;
  }
  return out;
}

/* ---------- Filter ---------- */

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 font-display text-[12px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset transition-colors ${
            value === v ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-muted ring-line hover:text-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Filters(p: {
  range: Range;
  setRange: (r: Range) => void;
  kind: KindFilter;
  setKind: (k: KindFilter) => void;
  withTodos: boolean;
  setWithTodos: (v: boolean) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Seg label="Zeitraum" value={p.range} onChange={p.setRange} options={[["alles", "Alles"], ["jahr", "Jahr"], ["30", "30 Tage"]]} />
      <Seg label="Art" value={p.kind} onChange={p.setKind} options={[["alle", "Alle"], ["geschafft", "Geschafft"], ["gelernt", "Gelernt"]]} />
      <label className="hud-label ml-auto flex cursor-pointer items-center gap-2 text-[10px] text-muted">
        <input type="checkbox" checked={p.withTodos} onChange={(e) => p.setWithTodos(e.target.checked)} className="accent-[#5ce1ff]" />
        Erledigte Todos
      </label>
    </div>
  );
}

/* ---------- Details ---------- */

function Detail({ item, color: c, onClose, onMessage }: { item: Achievement; color: string; onClose: () => void; onMessage: (m: string) => void }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Auf dem Handy stehen die Details unter den Blasen, also hinscrollen
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [item.id]);
  return (
    <div ref={box} className="scroll-mt-20 scroll-mb-24">
    <HudPanel
      label={item.kind === "gelernt" ? "Gelernt" : "Geschafft"}
      tone={c}
      action={
        <button type="button" onClick={onClose} aria-label="Details schließen" className="text-faint hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      }
    >
      <h2 className="font-display text-[24px] font-bold leading-tight text-ink">{item.title}</h2>
      <p className="mt-2 flex flex-wrap gap-x-3 font-display text-[13px] font-semibold tracking-wider">
        <span style={{ color: c }}>{item.gruppe}</span>
        <span className="text-muted">{formatShort(item.date)}</span>
        <span className="text-faint">{item.source === "todo" ? "Aus deinen Todos" : sizeLabel[item.gewicht]}</span>
      </p>
      {item.note ? <p className="mt-3 whitespace-pre-line text-[14px] text-muted">{item.note}</p> : null}
      {item.source === "eintrag" ? (
        <div className="mt-5 flex justify-end gap-3">
          {confirm ? (
            <>
              <button type="button" onClick={() => setConfirm(false)} className="hud-label text-[10px] text-faint hover:text-ink">Nein</button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteAchievement(item.id);
                    if ("error" in res) onMessage(res.error);
                    else {
                      onMessage("Eintrag gelöscht");
                      onClose();
                    }
                  })
                }
                className="hud-label text-[10px] text-alert"
              >
                Löschen
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="hud-label inline-flex items-center gap-1.5 text-[10px] text-faint hover:text-alert">
              <Trash2 size={13} aria-hidden /> Eintrag löschen
            </button>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-faint">Kommt vom erledigten Todo. Wenn du es dort wieder öffnest, verschwindet die Blase.</p>
      )}
    </HudPanel>
    </div>
  );
}

/* ---------- Eintragen ---------- */

function AddForm({ today, groups, onMessage }: { today: string; groups: string[]; onMessage: (m: string) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<AchievementKind>("geschafft");
  const [gruppe, setGruppe] = useState("");
  const [gewicht, setGewicht] = useState<1 | 2 | 3>(2);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ids = useId();

  return (
    <HudPanel label="Erfolg eintragen" code="ADD">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createAchievement({ title, kind, gruppe, gewicht, date, note });
            if ("error" in res) setError(res.error);
            else {
              setError(null);
              setTitle("");
              setNote("");
              onMessage(kind === "gelernt" ? "Neue Blase: gelernt" : "Neue Blase: geschafft");
            }
          });
        }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["geschafft", "Geschafft", CheckCheck],
              ["gelernt", "Gelernt", BookOpenCheck],
            ] as const
          ).map(([v, text, Icon]) => (
            <button
              key={v}
              type="button"
              aria-pressed={kind === v}
              onClick={() => setKind(v)}
              className={`hud-cut inline-flex items-center justify-center gap-1.5 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${
                kind === v ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-muted ring-line hover:text-ink"
              }`}
            >
              <Icon size={14} aria-hidden /> {text}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={`${ids}-t`} className={labelClass}>Was?</label>
          <input
            id={`${ids}-t`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "gelernt" ? "z.b. Drizzle Migrationen verstanden" : "z.b. Lunair live gestellt"}
            className={fieldClass}
            maxLength={160}
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div>
            <label htmlFor={`${ids}-g`} className={labelClass}>Gruppe</label>
            <input
              id={`${ids}-g`}
              value={gruppe}
              onChange={(e) => setGruppe(e.target.value)}
              list={`${ids}-gl`}
              placeholder="z.b. Lunair, Next.js"
              className={fieldClass}
              maxLength={40}
            />
            <datalist id={`${ids}-gl`}>
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor={`${ids}-d`} className={labelClass}>Datum</label>
            <input id={`${ids}-d`} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <div>
          <span className={labelClass}>Größe der Blase</span>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gewicht === g}
                onClick={() => setGewicht(g)}
                className={`hud-cut flex items-center justify-center gap-1.5 py-1.5 font-display text-[12px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ${
                  gewicht === g ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-muted ring-line hover:text-ink"
                }`}
              >
                <span aria-hidden className="rounded-full border border-current" style={{ width: 4 + g * 3, height: 4 + g * 3 }} />
                {sizeLabel[g]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor={`${ids}-n`} className={labelClass}>Notiz (optional)</label>
          <textarea id={`${ids}-n`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} className={`${fieldClass} resize-y`} />
        </div>
        {error ? <p role="alert" className="text-[13px] text-alert">{error}</p> : null}
        <button type="submit" disabled={pending} className={`${buttonClass("primary")} w-full`}>
          Blase hinzufügen
        </button>
      </form>
    </HudPanel>
  );
}

/* ---------- Chronik ---------- */

const monthFmt = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });

function Chronik({ items, colorOf, onSelect }: { items: Achievement[]; colorOf: (g: string) => string; onSelect: (id: string) => void }) {
  const months = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, Achievement[]>();
    for (const a of sorted) map.set(a.date.slice(0, 7), [...(map.get(a.date.slice(0, 7)) ?? []), a]);
    return [...map.entries()];
  }, [items]);
  if (!items.length) return null;

  return (
    <HudPanel label="Chronik" code="LOG" className="mt-6">
      <div className="space-y-5">
        {months.map(([m, list]) => (
          <section key={m}>
            <h3 className="hud-label mb-2 text-[11px] text-hud-dim">{monthFmt.format(new Date(`${m}-15T12:00:00Z`))}</h3>
            <ul>
              {list.map((a) => {
                const c = colorOf(a.gruppe);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(a.id);
                      }}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-line/60 py-2 text-left last:border-b-0 hover:bg-hud/5"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={a.kind === "gelernt" ? { border: `1.5px dashed ${c}` } : { background: c, boxShadow: `0 0 6px ${c}` }}
                      />
                      <span className="truncate text-ink">{a.title}</span>
                      <span className="flex gap-3 font-display text-[12px] font-semibold tracking-wider">
                        <span style={{ color: c }}>{a.gruppe}</span>
                        <span className="w-[4.5rem] text-right text-faint">{formatShort(a.date)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </HudPanel>
  );
}
