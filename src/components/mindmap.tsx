"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { formatShort } from "@/lib/dates";
import type { Achievement } from "@/lib/types";

/*
  Mindmap: in der Mitte du, außen herum die Gruppen, ganz außen die einzelnen Erfolge.
  Jede Gruppe bekommt so viel Winkel, wie ihre Blasen Platz brauchen. Reicht ein
  Kreis nicht, wächst der Radius, die Karte zoomt sich dann passend.
*/

export type MapGroup = { name: string; color: string; items: Achievement[] };
export type Selection = { type: "leaf"; id: string } | { type: "group"; name: string } | null;

const CENTER_R = 64;
const GAP = 16;
const leafR = { 1: 30, 2: 38, 3: 48 } as const;
const groupR = (n: number) => 34 + Math.min(18, n * 2);

type Placed = { x: number; y: number; r: number; angle: number };
type Layout = {
  groups: (MapGroup & Placed & { leaves: (Placed & { item: Achievement })[] })[];
  extent: number;
  r1: number; // Ring der Gruppen
  r2: number; // Ring der Blasen
};

// Gerundet, sonst weichen Server und Browser in der letzten Nachkommastelle ab (Hydration-Fehler)
const round = (n: number) => Math.round(n * 100) / 100;
const polar = (a: number, r: number) => ({ x: round(Math.cos(a) * r), y: round(Math.sin(a) * r) });

function layout(groups: MapGroup[]): Layout {
  if (!groups.length) return { groups: [], extent: 300, r1: 0, r2: 0 };
  const maxLeaf = Math.max(...groups.flatMap((g) => g.items.map((i) => leafR[i.gewicht])));
  const maxGroup = Math.max(...groups.map((g) => groupR(g.items.length)));

  // Außenring so groß wählen, dass alle Gruppen und Blasen nebeneinander passen
  let r2 = 300;
  let spans: number[] = [];
  for (let i = 0; i < 30; i++) {
    const r1 = Math.max(CENTER_R + maxGroup + 70, r2 * 0.48);
    spans = groups.map((g) => {
      const arc = g.items.reduce((s, it) => s + 2 * leafR[it.gewicht] + GAP, 0);
      return Math.max(arc / r2, (2 * groupR(g.items.length) + GAP * 2) / r1);
    });
    const sum = spans.reduce((a, b) => a + b, 0);
    if (sum <= Math.PI * 2) break;
    r2 *= (sum / (Math.PI * 2)) * 1.03;
  }
  // Mindestens so weit raus, dass Gruppe und Blasen sich nicht berühren
  const r1 = Math.max(CENTER_R + maxGroup + 70, r2 * 0.48);
  r2 = Math.max(r2, r1 + maxGroup + maxLeaf + 60);

  // Übrigen Winkel gleichmäßig verteilen, damit es rund aussieht
  const sum = spans.reduce((a, b) => a + b, 0);
  const extra = (Math.PI * 2 - sum) / groups.length;
  let start = -Math.PI / 2 - (spans[0] + extra) / 2;

  const placed = groups.map((g, gi) => {
    const span = spans[gi] + extra;
    const angle = start + span / 2;
    const r = groupR(g.items.length);
    // Blasen innerhalb des Gruppenwinkels mittig auffädeln
    const arc = g.items.reduce((s, it) => s + 2 * leafR[it.gewicht] + GAP, 0);
    let cursor = angle - arc / r2 / 2;
    const leaves = g.items.map((item) => {
      const lr = leafR[item.gewicht];
      const a = cursor + (lr + GAP / 2) / r2;
      cursor += (2 * lr + GAP) / r2;
      return { item, r: lr, angle: a, ...polar(a, r2) };
    });
    start += span;
    return { ...g, r, angle, ...polar(angle, r1), leaves };
  });

  return { groups: placed, extent: Math.ceil(r2 + maxLeaf + 30), r1: round(r1), r2: round(r2) };
}

/** Text in ein paar Zeilen umbrechen, Rest mit … abschneiden */
export function wrap(text: string, max: number, lines: number): string[] {
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

/* ---------- Zoomen & Verschieben ---------- */

type View = { k: number; x: number; y: number };
const clampK = (k: number) => Math.min(4, Math.max(0.6, k));

/** Bildschirmpunkt in Karten-Koordinaten (vor Zoom) */
function screenToMap(el: SVGSVGElement | null, cx: number, cy: number) {
  const m = el?.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

function usePanZoom(svg: React.RefObject<SVGSVGElement | null>) {
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; cx: number; cy: number; x: number; y: number; moved: boolean } | null>(null);
  const moved = useRef(false);

  const toSvg = (cx: number, cy: number) => screenToMap(svg.current, cx, cy);

  const zoomAt = useCallback((factor: number, p: { x: number; y: number }) => {
    setView((v) => {
      const k = clampK(v.k * factor);
      const f = k / v.k;
      return { k, x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f };
    });
  }, []);

  // Wheel muss non-passive sein, sonst scrollt die Seite mit
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), screenToMap(el, e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svg, zoomAt]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      drag.current = { id: e.pointerId, cx: e.clientX, cy: e.clientY, x: view.x, y: view.y, moved: false };
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) < 5) return;
      if (!d.moved) {
        d.moved = true;
        moved.current = true;
        // Erst ab echter Bewegung festhalten, sonst kommen Klicks auf Blasen nicht an
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      const a = toSvg(d.cx, d.cy);
      const b = toSvg(e.clientX, e.clientY);
      setView((v) => ({ ...v, x: d.x + (b.x - a.x), y: d.y + (b.y - a.y) }));
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
  };

  return {
    view,
    handlers,
    /** true, wenn der letzte Druck ein Verschieben war (dann kein Klick auslösen) */
    wasDrag: () => moved.current,
    zoomIn: () => zoomAt(1.3, { x: 0, y: 0 }),
    zoomOut: () => zoomAt(1 / 1.3, { x: 0, y: 0 }),
    reset: () => setView({ k: 1, x: 0, y: 0 }),
  };
}

/* ---------- Karte ---------- */

export function MindMap({
  groups,
  total,
  selection,
  onSelect,
}: {
  groups: MapGroup[];
  total: number;
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");
  const { groups: placed, extent, r1, r2 } = useMemo(() => layout(groups), [groups]);
  const pz = usePanZoom(svg);

  const activeGroup =
    selection?.type === "group"
      ? selection.name
      : selection?.type === "leaf"
        ? placed.find((g) => g.items.some((i) => i.id === selection.id))?.name
        : undefined;
  const dim = (name: string) => (activeGroup && activeGroup !== name ? 0.28 : 1);

  const pick = (s: Selection) => {
    if (pz.wasDrag()) return;
    onSelect(s);
  };
  const key = (s: Selection) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(s);
    }
  };

  return (
    <div className="relative size-full">
      <svg
        ref={svg}
        viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
        className={`size-full select-none ${pz.view.k > 1.01 ? "touch-none" : "touch-pan-y"} cursor-grab active:cursor-grabbing`}
        role="group"
        aria-label="Erfolge als Mindmap"
        {...pz.handlers}
        onClick={(e) => {
          // Klick ins Leere hebt die Auswahl auf
          if (e.target === e.currentTarget && !pz.wasDrag()) onSelect(null);
        }}
      >
        <defs>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`${uid}-core`}>
            <stop offset="0%" stopColor="#5ce1ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5ce1ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform={`translate(${pz.view.x} ${pz.view.y}) scale(${pz.view.k})`}>
          {/* Orbit-Ringe als Orientierung */}
          {placed.length ? (
            <g pointerEvents="none" fill="none" stroke="#5ce1ff">
              <circle r={r1} strokeOpacity={0.08} strokeDasharray="2 8" />
              <circle r={r2} strokeOpacity={0.06} strokeDasharray="1 10" />
            </g>
          ) : null}

          {/* Äste */}
          {placed.map((g) => {
            const o = dim(g.name);
            const lit = activeGroup === g.name;
            return (
              <g key={`e-${g.name}`} pointerEvents="none" opacity={o} className="transition-opacity duration-300">
                <line x1={0} y1={0} x2={g.x} y2={g.y} stroke={g.color} strokeOpacity={lit ? 0.9 : 0.45} strokeWidth={lit ? 2 : 1.25} strokeDasharray="5 4" />
                {g.leaves.map((l) => {
                  // Bogen über einen Punkt auf dem Gruppenwinkel, wirkt wie ein Ast
                  const c = polar(g.angle, (r1 + r2) / 2);
                  const on = selection?.type === "leaf" && selection.id === l.item.id;
                  return (
                    <path
                      key={l.item.id}
                      d={`M ${g.x} ${g.y} Q ${c.x} ${c.y} ${l.x} ${l.y}`}
                      fill="none"
                      stroke={g.color}
                      strokeOpacity={on ? 1 : lit ? 0.6 : 0.3}
                      strokeWidth={on ? 2.5 : 1.25}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Mitte */}
          <g
            role="button"
            tabIndex={0}
            aria-label={`Alle Gruppen anzeigen, ${total} Erfolge`}
            onClick={() => pick(null)}
            onKeyDown={key(null)}
            className="cursor-pointer outline-none"
          >
            <circle r={CENTER_R * 1.7} fill={`url(#${uid}-core)`} pointerEvents="none" />
            <g className="origin-center animate-spin-slow" style={{ transformBox: "fill-box" }} pointerEvents="none">
              <circle r={CENTER_R + 10} fill="none" stroke="#5ce1ff" strokeOpacity={0.4} strokeDasharray="30 12 6 12" />
            </g>
            <circle r={CENTER_R} fill="rgba(2,8,14,0.9)" stroke="#5ce1ff" strokeWidth={1.5} filter={`url(#${uid}-glow)`} />
            <text y={4} textAnchor="middle" fill="#a6f1ff" fontSize={40} fontFamily="var(--font-display)" fontWeight={700} pointerEvents="none" style={{ textShadow: "0 0 14px #5ce1ff" }}>
              {total}
            </text>
            <text y={26} textAnchor="middle" fill="#5ce1ff" fontSize={11} fontFamily="var(--font-display)" fontWeight={600} letterSpacing="0.2em" pointerEvents="none">
              ERFOLGE
            </text>
          </g>

          {/* Gruppen und Blasen */}
          {placed.map((g, gi) => {
            const groupSel: Selection = { type: "group", name: g.name };
            const lit = activeGroup === g.name;
            return (
              <g key={g.name} opacity={dim(g.name)} className="transition-opacity duration-300">
                {g.leaves.map((l, i) => {
                  const a = l.item;
                  const on = selection?.type === "leaf" && selection.id === a.id;
                  const learned = a.kind === "gelernt";
                  const seed = (gi * 7 + i * 13) % 10;
                  const fontSize = Math.min(14, Math.max(10, l.r / 3.3));
                  const lines = wrap(a.title, Math.floor((l.r * 1.65) / (fontSize * 0.55)), 3);
                  const sel: Selection = { type: "leaf", id: a.id };
                  return (
                    <g
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={on}
                      aria-label={`${a.title}, ${a.gruppe}, ${learned ? "gelernt" : "geschafft"} am ${formatShort(a.date)}`}
                      onClick={() => pick(on ? groupSel : sel)}
                      onKeyDown={key(on ? groupSel : sel)}
                      className="bubble-float cursor-pointer outline-none"
                      style={
                        {
                          "--fx": `${(seed % 3) - 1}px`,
                          "--fy": `${-2 - (seed % 4)}px`,
                          "--fd": `${5 + seed * 0.6}s`,
                          "--fdelay": `${-seed * 0.7}s`,
                        } as React.CSSProperties
                      }
                    >
                      <title>{`${a.title} · ${formatShort(a.date)}`}</title>
                      <circle
                        cx={l.x}
                        cy={l.y}
                        r={l.r}
                        fill={g.color}
                        fillOpacity={learned ? 0.07 : on ? 0.45 : 0.2}
                        stroke={g.color}
                        strokeOpacity={on ? 1 : 0.8}
                        strokeWidth={on ? 2.5 : 1.25}
                        strokeDasharray={learned ? "4 3" : undefined}
                        filter={on ? `url(#${uid}-glow)` : undefined}
                        className="transition-[fill-opacity] duration-200 hover:[fill-opacity:0.38]"
                      />
                      <circle cx={l.x - l.r * 0.38} cy={l.y - l.r * 0.42} r={Math.max(1.5, l.r * 0.12)} fill="#fff" fillOpacity={0.18} pointerEvents="none" />
                      <text x={l.x} y={l.y} textAnchor="middle" fill="#e8fbff" fontSize={fontSize} fontFamily="var(--font-display)" fontWeight={600} pointerEvents="none">
                        {lines.map((w, k) => (
                          <tspan key={k} x={l.x} dy={k === 0 ? `${-(lines.length - 1) * 0.55 + 0.35}em` : "1.1em"}>
                            {w}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}

                <g
                  role="button"
                  tabIndex={0}
                  aria-pressed={selection?.type === "group" && selection.name === g.name}
                  aria-label={`Gruppe ${g.name}, ${g.items.length} Erfolge`}
                  onClick={() => pick(selection?.type === "group" && selection.name === g.name ? null : groupSel)}
                  onKeyDown={key(groupSel)}
                  className="cursor-pointer outline-none"
                >
                  <circle cx={g.x} cy={g.y} r={g.r + 6} fill="none" stroke={g.color} strokeOpacity={0.25} strokeDasharray="2 6" pointerEvents="none" />
                  <circle
                    cx={g.x}
                    cy={g.y}
                    r={g.r}
                    fill="rgba(2,8,14,0.92)"
                    stroke={g.color}
                    strokeWidth={lit ? 2.5 : 1.5}
                    filter={lit ? `url(#${uid}-glow)` : undefined}
                  />
                  <circle cx={g.x} cy={g.y} r={g.r} fill={g.color} fillOpacity={0.12} pointerEvents="none" />
                  <text
                    x={g.x}
                    y={g.y - 2}
                    textAnchor="middle"
                    fill={g.color}
                    fontSize={Math.min(15, Math.max(10, (g.r * 1.7) / Math.max(4, g.name.length) / 0.62))}
                    fontFamily="var(--font-display)"
                    fontWeight={700}
                    letterSpacing="0.12em"
                    pointerEvents="none"
                    style={{ textTransform: "uppercase" }}
                  >
                    {g.name.length > 14 ? `${g.name.slice(0, 13)}…` : g.name}
                  </text>
                  <text x={g.x} y={g.y + 16} textAnchor="middle" fill="#84aebe" fontSize={12} fontFamily="var(--font-display)" fontWeight={600} pointerEvents="none">
                    {g.items.length}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        {[
          { label: "Hineinzoomen", icon: Plus, run: pz.zoomIn },
          { label: "Herauszoomen", icon: Minus, run: pz.zoomOut },
          { label: "Ganze Karte zeigen", icon: Maximize, run: pz.reset },
        ].map(({ label, icon: Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            aria-label={label}
            title={label}
            className="hud-cut grid size-8 place-items-center bg-[rgba(2,8,14,0.85)] text-muted ring-1 ring-inset ring-line-strong hover:text-hud-strong hover:ring-hud/60"
          >
            <Icon size={15} aria-hidden />
          </button>
        ))}
      </div>
      <p className="hud-label pointer-events-none absolute bottom-3 right-3 hidden text-[9px] text-faint md:block">Scrollen zum Zoomen · Ziehen zum Verschieben</p>
    </div>
  );
}
