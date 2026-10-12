"use client";

import { useEffect, useRef } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { Maximize, Minus, Plus } from "lucide-react";
import { formatShort } from "@/lib/dates";
import type { Achievement } from "@/lib/types";

/*
  Graph wie die Graph-Ansicht in Obsidian: Knoten = Erfolge und Gruppen, Linien = Zugehörigkeit.
  Physik mit d3-force, gezeichnet auf Canvas (flüssig auch bei vielen Knoten).
  Hover hebt Knoten + Nachbarn hervor, Knoten lassen sich ziehen, Mausrad zoomt.
*/

export type GraphGroup = { name: string; color: string; items: Achievement[] };
export type Selection = { type: "leaf"; id: string } | { type: "group"; name: string } | null;

export type GraphSettings = {
  nodeSize: number; // Faktor 0.5..3
  linkWidth: number; // Faktor 0.5..3
  labelZoom: number; // ab diesem Zoom erscheinen Titel der Erfolge
  center: number; // 0..1
  repel: number; // 0..20
  linkForce: number; // 0..1
  linkDistance: number; // 20..300
};

export const defaultSettings: GraphSettings = {
  nodeSize: 1,
  linkWidth: 1,
  labelZoom: 1.1,
  center: 0.12,
  repel: 10,
  linkForce: 0.7,
  linkDistance: 70,
};

type Node = SimulationNodeDatum & {
  id: string;
  kind: "group" | "leaf";
  label: string;
  color: string;
  r: number;
  item?: Achievement;
  group: string;
};
type Link = SimulationLinkDatum<Node> & { source: Node | string; target: Node | string };

const leafR = { 1: 4.5, 2: 6, 3: 8 } as const;
const groupR = (n: number) => 9 + Math.min(10, Math.sqrt(n) * 2.4);
const FONT = '"Rajdhani", ui-sans-serif, system-ui, sans-serif';

const nodeId = (s: Selection) => (s?.type === "leaf" ? `i:${s.id}` : s?.type === "group" ? `g:${s.name}` : null);
const toSelection = (n: Node): Selection => (n.kind === "group" ? { type: "group", name: n.group } : { type: "leaf", id: n.item!.id });

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function GraphView({
  groups,
  selection,
  onSelect,
  settings,
  search,
  replayKey,
}: {
  groups: GraphGroup[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  settings: GraphSettings;
  search: string;
  /** Hochzählen startet die Zeitraffer-Animation (Knoten erscheinen nach Datum) */
  replayKey: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Simulation<Node, Link> | null>(null);
  const nodes = useRef<Node[]>([]);
  const links = useRef<Link[]>([]);
  const neighbors = useRef(new Map<string, Set<string>>());
  const view = useRef({ k: 1, x: 0, y: 0 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const hover = useRef<string | null>(null);
  const selected = useRef<string | null>(nodeId(selection));
  const settingsRef = useRef(settings);
  const searchRef = useRef(search.trim().toLowerCase());
  const shown = useRef<Set<string> | null>(null); // null = alle sichtbar (keine Animation)
  const dirty = useRef(true);
  const onSelectRef = useRef(onSelect);
  const fitted = useRef(false); // einmal automatisch einpassen, sobald die Physik ruhig ist
  const touched = useRef(false); // nicht mehr automatisch, sobald du selbst gezoomt/verschoben hast

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  /* ---------- Daten -> Knoten (Positionen bestehender Knoten bleiben erhalten) ---------- */
  useEffect(() => {
    const old = new Map(nodes.current.map((n) => [n.id, n]));
    const next: Node[] = [];
    const nextLinks: Link[] = [];
    const nb = new Map<string, Set<string>>();
    const add = (a: string, b: string) => {
      if (!nb.has(a)) nb.set(a, new Set());
      if (!nb.has(b)) nb.set(b, new Set());
      nb.get(a)!.add(b);
      nb.get(b)!.add(a);
    };
    groups.forEach((g, gi) => {
      const gid = `g:${g.name}`;
      const angle = (gi / Math.max(1, groups.length)) * Math.PI * 2;
      const prev = old.get(gid);
      const gx = prev?.x ?? Math.cos(angle) * 160;
      const gy = prev?.y ?? Math.sin(angle) * 160;
      next.push({ ...(prev ?? {}), id: gid, kind: "group", label: g.name, color: g.color, r: groupR(g.items.length), group: g.name, x: gx, y: gy });
      for (const item of g.items) {
        const id = `i:${item.id}`;
        const p = old.get(id);
        next.push({
          ...(p ?? {}),
          id,
          kind: "leaf",
          label: item.title,
          color: g.color,
          r: leafR[item.gewicht],
          item,
          group: g.name,
          x: p?.x ?? gx + (Math.random() - 0.5) * 60,
          y: p?.y ?? gy + (Math.random() - 0.5) * 60,
        });
        nextLinks.push({ source: id, target: gid });
        add(id, gid);
      }
    });
    nodes.current = next;
    links.current = nextLinks;
    neighbors.current = nb;

    if (!sim.current) {
      sim.current = forceSimulation<Node, Link>().alphaDecay(0.025).velocityDecay(0.35);
      sim.current.on("tick", () => {
        dirty.current = true;
        if (!fitted.current && !touched.current && sim.current!.alpha() < 0.12) {
          fitted.current = true;
          fitView();
        }
      });
    }
    applyForces();
    sim.current.nodes(next);
    (sim.current.force("link") as ReturnType<typeof forceLink<Node, Link>>).links(nextLinks);
    sim.current.alpha(old.size ? 0.4 : 1).restart();
    dirty.current = true;
  }, [groups]);

  function applyForces() {
    const s = sim.current;
    if (!s) return;
    const st = settingsRef.current;
    s.force(
      "link",
      ((s.force("link") as ReturnType<typeof forceLink<Node, Link>>) ?? forceLink<Node, Link>().id((d) => d.id))
        .distance((l) => st.linkDistance + ((l.target as Node).r ?? 0))
        .strength(st.linkForce),
    );
    s.force("charge", forceManyBody<Node>().strength((d) => -st.repel * (d.kind === "group" ? 28 : 9)).distanceMax(600));
    s.force("x", forceX<Node>(0).strength(st.center * 0.5));
    s.force("y", forceY<Node>(0).strength(st.center * 0.5));
    s.force("collide", forceCollide<Node>((d) => d.r * st.nodeSize + 3));
  }

  /* ---------- Einstellungen, Auswahl, Suche ---------- */
  useEffect(() => {
    const prev = settingsRef.current;
    settingsRef.current = settings;
    const physics =
      prev.center !== settings.center ||
      prev.repel !== settings.repel ||
      prev.linkForce !== settings.linkForce ||
      prev.linkDistance !== settings.linkDistance ||
      prev.nodeSize !== settings.nodeSize;
    if (physics) {
      applyForces();
      sim.current?.alpha(0.5).restart();
    }
    dirty.current = true;
  }, [settings]);

  useEffect(() => {
    selected.current = nodeId(selection);
    dirty.current = true;
  }, [selection]);

  useEffect(() => {
    searchRef.current = search.trim().toLowerCase();
    dirty.current = true;
  }, [search]);

  /* ---------- Zeitraffer ---------- */
  useEffect(() => {
    if (!replayKey) return;
    const order = [...nodes.current].filter((n) => n.kind === "leaf").sort((a, b) => a.item!.date.localeCompare(b.item!.date));
    const set = new Set<string>();
    shown.current = set;
    const step = Math.max(40, Math.min(220, 5000 / Math.max(1, order.length)));
    let i = 0;
    const timer = setInterval(() => {
      const n = order[i++];
      if (!n) {
        clearInterval(timer);
        shown.current = null;
        dirty.current = true;
        return;
      }
      set.add(n.id);
      set.add(`g:${n.group}`);
      // Neuer Knoten startet bei seiner Gruppe, das sieht wie Wachsen aus
      const g = nodes.current.find((x) => x.id === `g:${n.group}`);
      if (g) {
        n.x = (g.x ?? 0) + (Math.random() - 0.5) * 6;
        n.y = (g.y ?? 0) + (Math.random() - 0.5) * 6;
      }
      sim.current?.alpha(0.3).restart();
      dirty.current = true;
    }, step);
    return () => {
      clearInterval(timer);
      shown.current = null;
    };
  }, [replayKey]);

  /* ---------- Größe ---------- */
  useEffect(() => {
    const el = wrap.current;
    const c = canvas.current;
    if (!el || !c) return;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = el.getBoundingClientRect();
      size.current = { w: width, h: height, dpr };
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      dirty.current = true;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- Zeichnen ---------- */
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!dirty.current) return;
      dirty.current = false;
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const { w, h, dpr } = size.current;
      const { k, x, y } = view.current;
      const st = settingsRef.current;
      const q = searchRef.current;
      const vis = shown.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2 + x, h / 2 + y);
      ctx.scale(k, k);

      const focus = hover.current ?? selected.current;
      const near = focus ? neighbors.current.get(focus) : undefined;
      const isLit = (id: string) => !focus || id === focus || !!near?.has(id);
      const matches = (n: Node) => !q || n.label.toLowerCase().includes(q) || n.group.toLowerCase().includes(q);
      const visible = (n: Node) => !vis || vis.has(n.id);

      // Linien
      for (const l of links.current) {
        const s = l.source as Node;
        const t = l.target as Node;
        if (!visible(s) || !visible(t)) continue;
        const lit = focus && (s.id === focus || t.id === focus);
        ctx.strokeStyle = lit ? hexA(s.color, 0.85) : focus ? "rgba(132,174,190,0.07)" : "rgba(132,174,190,0.22)";
        ctx.lineWidth = ((lit ? 1.6 : 1) * st.linkWidth) / Math.sqrt(k);
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(t.x!, t.y!);
        ctx.stroke();
      }

      // Knoten
      for (const n of nodes.current) {
        if (!visible(n)) continue;
        const lit = isLit(n.id);
        const hit = matches(n);
        const alpha = (lit ? 1 : 0.16) * (hit ? 1 : 0.18);
        const r = n.r * st.nodeSize;
        const learned = n.item?.kind === "gelernt";
        ctx.globalAlpha = alpha;
        if (n.id === focus || n.id === selected.current) {
          ctx.shadowColor = n.color;
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, r, 0, Math.PI * 2);
        if (n.kind === "group") {
          ctx.fillStyle = hexA(n.color, 0.9);
          ctx.fill();
        } else if (learned) {
          ctx.fillStyle = "rgba(2,8,14,0.9)";
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = n.color;
          ctx.stroke();
        } else {
          ctx.fillStyle = hexA(n.color, 0.75);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        if (n.id === selected.current) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, r + 4, 0, Math.PI * 2);
          ctx.lineWidth = 1.5 / k;
          ctx.strokeStyle = n.color;
          ctx.stroke();
        }
      }

      // Beschriftung: Gruppen immer, Erfolge ab Zoom-Schwelle oder bei Hover/Nachbarn/Suche
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const fade = Math.max(0, Math.min(1, (k - st.labelZoom) / 0.35 + 1));
      for (const n of nodes.current) {
        if (!visible(n)) continue;
        const lit = isLit(n.id);
        const hit = matches(n);
        const forced = (focus && lit) || (q && hit);
        let a = n.kind === "group" ? 1 : forced ? 1 : fade;
        if (!lit) a *= 0.15;
        if (!hit) a *= 0.2;
        if (a <= 0.02) continue;
        const r = n.r * st.nodeSize;
        const fs = (n.kind === "group" ? 13 : 11) / Math.sqrt(k);
        ctx.globalAlpha = a;
        ctx.font = `${n.kind === "group" ? 700 : 600} ${fs}px ${FONT}`;
        const text = n.kind === "group" ? n.label.toUpperCase() : n.label.length > 34 ? `${n.label.slice(0, 33)}…` : n.label;
        // Dunkler Rand, damit Text über Linien lesbar bleibt
        ctx.lineWidth = 3 / k;
        ctx.strokeStyle = "rgba(2,6,11,0.9)";
        ctx.strokeText(text, n.x!, n.y! + r + 3);
        ctx.fillStyle = n.kind === "group" ? n.color : "#cfeef8";
        ctx.fillText(text, n.x!, n.y! + r + 3);
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---------- Maus & Touch ---------- */
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const toWorld = (cx: number, cy: number) => {
      const rect = c.getBoundingClientRect();
      const { k, x, y } = view.current;
      return { x: (cx - rect.left - rect.width / 2 - x) / k, y: (cy - rect.top - rect.height / 2 - y) / k };
    };
    const pickNode = (cx: number, cy: number) => {
      const p = toWorld(cx, cy);
      const st = settingsRef.current;
      let best: Node | null = null;
      let bestD = Infinity;
      for (const n of nodes.current) {
        if (shown.current && !shown.current.has(n.id)) continue;
        const d = Math.hypot(n.x! - p.x, n.y! - p.y);
        const reach = n.r * st.nodeSize + 6 / view.current.k;
        if (d < reach && d < bestD) {
          best = n;
          bestD = d;
        }
      }
      return best;
    };

    let mode: null | { type: "node"; node: Node } | { type: "pan"; sx: number; sy: number; vx: number; vy: number } = null;
    let start = { x: 0, y: 0 };
    let moved = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; k: number } | null = null;

    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.current.k };
        mode = null;
        return;
      }
      start = { x: e.clientX, y: e.clientY };
      moved = false;
      const n = pickNode(e.clientX, e.clientY);
      if (n) {
        mode = { type: "node", node: n };
        n.fx = n.x;
        n.fy = n.y;
      } else {
        mode = { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.current.x, vy: view.current.y };
      }
      c.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        touched.current = true;
        view.current.k = Math.min(5, Math.max(0.2, (pinch.k * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d));
        dirty.current = true;
        return;
      }
      if (!mode) {
        const n = pickNode(e.clientX, e.clientY);
        const id = n?.id ?? null;
        if (id !== hover.current) {
          hover.current = id;
          c.style.cursor = n ? "pointer" : "grab";
          dirty.current = true;
        }
        return;
      }
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) moved = true;
      if (!moved) return;
      if (mode.type === "node") {
        const p = toWorld(e.clientX, e.clientY);
        mode.node.fx = p.x;
        mode.node.fy = p.y;
        hover.current = mode.node.id;
        sim.current?.alphaTarget(0.25).restart();
      } else {
        touched.current = true;
        view.current.x = mode.vx + (e.clientX - mode.sx);
        view.current.y = mode.vy + (e.clientY - mode.sy);
        c.style.cursor = "grabbing";
      }
      dirty.current = true;
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!mode) return;
      if (mode.type === "node") {
        // Wie in Obsidian: nach dem Loslassen schwingt der Knoten zurück ins Netz
        mode.node.fx = null;
        mode.node.fy = null;
        sim.current?.alphaTarget(0);
        if (!moved) onSelectRef.current(selected.current === mode.node.id ? null : toSelection(mode.node));
      } else if (!moved) {
        onSelectRef.current(null);
      }
      c.style.cursor = "grab";
      mode = null;
    };
    const leave = () => {
      if (hover.current && !mode) {
        hover.current = null;
        dirty.current = true;
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      touched.current = true;
      const rect = c.getBoundingClientRect();
      const v = view.current;
      const k = Math.min(5, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.0015)));
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      v.x = px - ((px - v.x) * k) / v.k;
      v.y = py - ((py - v.y) * k) / v.k;
      v.k = k;
      dirty.current = true;
    };

    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    c.addEventListener("pointerleave", leave);
    c.addEventListener("wheel", wheel, { passive: false });
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
      c.removeEventListener("pointerleave", leave);
      c.removeEventListener("wheel", wheel);
    };
  }, []);

  useEffect(() => () => void sim.current?.stop(), []);

  const zoom = (f: number) => {
    touched.current = true;
    view.current.k = Math.min(5, Math.max(0.2, view.current.k * f));
    view.current.x *= f;
    view.current.y *= f;
    dirty.current = true;
  };
  function fitView() {
    const ns = nodes.current;
    const { w: cw, h: ch } = size.current;
    if (!ns.length || !cw) return;
    const xs = ns.map((n) => n.x ?? 0);
    const ys = ns.map((n) => n.y ?? 0);
    const w = Math.max(...xs) - Math.min(...xs) + 160;
    const h = Math.max(...ys) - Math.min(...ys) + 120;
    const k = Math.min(1.8, Math.max(0.2, Math.min(cw / w, ch / h)));
    view.current = { k, x: (-(Math.max(...xs) + Math.min(...xs)) / 2) * k, y: (-(Math.max(...ys) + Math.min(...ys)) / 2) * k };
    dirty.current = true;
  }

  return (
    <div ref={wrap} className="relative size-full overflow-hidden">
      <canvas ref={canvas} className="block cursor-grab touch-none" aria-hidden />

      {/* Für Tastatur und Screenreader: dieselben Knoten als Liste */}
      <ul className="sr-only" aria-label="Erfolge im Graph">
        {groups.map((g) => (
          <li key={g.name}>
            <button type="button" aria-pressed={selection?.type === "group" && selection.name === g.name} onClick={() => onSelect({ type: "group", name: g.name })}>
              Gruppe {g.name}, {g.items.length} Erfolge
            </button>
            <ul>
              {g.items.map((a) => (
                <li key={a.id}>
                  <button type="button" data-node={a.id} aria-pressed={selection?.type === "leaf" && selection.id === a.id} onClick={() => onSelect({ type: "leaf", id: a.id })}>
                    {a.title}, {a.kind}, {formatShort(a.date)}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
        {[
          { label: "Hineinzoomen", icon: Plus, run: () => zoom(1.3) },
          { label: "Herauszoomen", icon: Minus, run: () => zoom(1 / 1.3) },
          { label: "Alles einpassen", icon: Maximize, run: fitView },
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
      <p className="hud-label pointer-events-none absolute bottom-3 right-3 hidden text-[9px] text-faint md:block">
        Scrollen zum Zoomen · Knoten ziehen · Hintergrund ziehen zum Verschieben
      </p>
    </div>
  );
}
