"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { BookOpenCheck, CheckCheck, Trash2, X } from "lucide-react";
import { createAchievement, deleteAchievement } from "@/app/actions";
import { addDays, formatShort } from "@/lib/dates";
import type { Achievement, AchievementKind } from "@/lib/types";
import { Toast, useToast } from "./files";
import { Empty, HudPanel, Readout, buttonClass, fieldClass, labelClass } from "./hud";
import { MindMap, type MapGroup, type Selection } from "./mindmap";

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

const sizeLabel = { 1: "Klein", 2: "Mittel", 3: "Groß" } as const;

type Range = "alles" | "jahr" | "30";
type KindFilter = "alle" | AchievementKind;

/* ---------- Ansicht ---------- */

export function AchievementsView({ items, today }: { items: Achievement[]; today: string }) {
  const toast = useToast();
  const [range, setRange] = useState<Range>("alles");
  const [kind, setKind] = useState<KindFilter>("alle");
  const [withTodos, setWithTodos] = useState(true);
  const [selection, setSelection] = useState<Selection>(null);
  const colorOf = useMemo(() => buildColors(items), [items]);

  const visible = useMemo(() => {
    const from = range === "30" ? addDays(today, -30) : range === "jahr" ? `${today.slice(0, 4)}-01-01` : "";
    return items.filter(
      (a) => (!from || a.date >= from) && (kind === "alle" || a.kind === kind) && (withTodos || a.source === "eintrag"),
    );
  }, [items, range, kind, withTodos, today]);

  const groups = useMemo<MapGroup[]>(() => {
    const map = new Map<string, Achievement[]>();
    for (const a of visible) map.set(a.gruppe, [...(map.get(a.gruppe) ?? []), a]);
    return [...map.entries()]
      .map(([name, list]) => ({ name, color: colorOf(name), items: [...list].sort((x, y) => y.date.localeCompare(x.date)) }))
      .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "de"));
  }, [visible, colorOf]);

  const leaf = selection?.type === "leaf" ? (visible.find((a) => a.id === selection.id) ?? null) : null;
  const group = selection?.type === "group" ? (groups.find((g) => g.name === selection.name) ?? null) : null;
  const allGroups = useMemo(() => [...new Set(items.map((a) => a.gruppe))].sort((a, b) => a.localeCompare(b, "de")), [items]);
  const learned = visible.filter((a) => a.kind === "gelernt").length;
  const month = visible.filter((a) => a.date.slice(0, 7) === today.slice(0, 7)).length;

  const title = (
    <header>
      <p className="hud-label text-[11px] text-hud-dim">Modul // Logbuch</p>
      <h1 className="glow mt-1 font-display text-[40px] font-bold uppercase leading-none tracking-[0.06em] text-hud-strong">Erfolge</h1>
    </header>
  );

  return (
    <>
      <div className="mb-5 lg:hidden">{title}</div>
      {/* Auf großen Bildschirmen die ganze Fläche neben der Navigation: Karte links, Einstellungen rechts */}
      <div className="lg:fixed lg:inset-y-0 lg:left-[88px] lg:right-0 lg:z-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[minmax(0,1fr)]">
        <section aria-label="Mindmap" className="relative aspect-square border border-line bg-[rgba(2,8,14,0.35)] lg:aspect-auto lg:h-full lg:border-0">
          {groups.length ? (
            <MindMap groups={groups} total={visible.length} selection={selection} onSelect={setSelection} />
          ) : (
            <div className="grid size-full place-items-center p-6">
              <Empty>Hier ist noch nichts. Trag ein, was du geschafft oder gelernt hast, oder hak ein paar Todos ab.</Empty>
            </div>
          )}
        </section>

        <aside className="mt-6 flex flex-col gap-6 lg:mt-0 lg:h-full lg:overflow-y-auto lg:border-l lg:border-line lg:bg-[rgba(2,8,14,0.82)] lg:p-6 lg:backdrop-blur">
          <div className="hidden lg:block">{title}</div>

          <div className="space-y-2.5">
            <Readout label="Erfolge" value={visible.length} tone="var(--color-hud-strong)" />
            <Readout label="Davon gelernt" value={learned} />
            <Readout label="Gruppen" value={groups.length} />
            <Readout label="Diesen Monat" value={month} tone="var(--color-ok)" />
          </div>

          <Filters range={range} setRange={setRange} kind={kind} setKind={setKind} withTodos={withTodos} setWithTodos={setWithTodos} />

          {leaf ? (
            <Detail item={leaf} color={colorOf(leaf.gruppe)} onClose={() => setSelection(null)} onMessage={toast.show} />
          ) : group ? (
            <GroupDetail group={group} onSelect={setSelection} onClose={() => setSelection(null)} />
          ) : (
            <p className="text-[13px] text-muted">Tipp auf eine Gruppe oder Blase für Details.</p>
          )}

          <AddForm today={today} groups={allGroups} onMessage={toast.show} />
        </aside>
      </div>
      <Toast message={toast.message} />
    </>
  );
}

/* ---------- Filter ---------- */

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col">
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
    <section aria-label="Einstellungen" className="space-y-2.5 border-t border-line pt-5">
      <h2 className="hud-label text-[11px] text-hud">▸ Einstellungen</h2>
      <Seg label="Zeitraum" value={p.range} onChange={p.setRange} options={[["alles", "Alles"], ["jahr", "Jahr"], ["30", "30 Tage"]]} />
      <Seg label="Art" value={p.kind} onChange={p.setKind} options={[["alle", "Alle"], ["geschafft", "Geschafft"], ["gelernt", "Gelernt"]]} />
      <label className="hud-label flex cursor-pointer items-center gap-2 text-[10px] text-muted">
        <input type="checkbox" checked={p.withTodos} onChange={(e) => p.setWithTodos(e.target.checked)} className="accent-[#5ce1ff]" />
        Erledigte Todos zeigen
      </label>
    </section>
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

/* ---------- Gruppe ---------- */

function GroupDetail({ group, onSelect, onClose }: { group: MapGroup; onSelect: (s: Selection) => void; onClose: () => void }) {
  const learned = group.items.filter((a) => a.kind === "gelernt").length;
  return (
    <HudPanel
      label="Gruppe"
      tone={group.color}
      action={
        <button type="button" onClick={onClose} aria-label="Details schließen" className="text-faint hover:text-ink">
          <X size={16} aria-hidden />
        </button>
      }
    >
      <h2 className="font-display text-[26px] font-bold uppercase leading-none tracking-wider" style={{ color: group.color }}>
        {group.name}
      </h2>
      <p className="mt-1.5 font-display text-[13px] font-semibold tracking-wider text-muted">
        {group.items.length} Erfolge{learned ? `, davon ${learned} gelernt` : ""}
      </p>
      <ul className="mt-3">
        {group.items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect({ type: "leaf", id: a.id })}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-line/60 py-1.5 text-left last:border-b-0 hover:bg-hud/5"
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={a.kind === "gelernt" ? { border: `1.5px dashed ${group.color}` } : { background: group.color, boxShadow: `0 0 5px ${group.color}` }}
              />
              <span className="truncate text-[14px] text-ink">{a.title}</span>
              <span className="font-display text-[12px] font-semibold tracking-wider text-faint">{formatShort(a.date)}</span>
            </button>
          </li>
        ))}
      </ul>
    </HudPanel>
  );
}
