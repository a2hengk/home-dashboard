import type { SubjectRef } from "@/lib/types";

/* ---------- Rahmen ---------- */

function Corners({ tone = "var(--color-hud)" }: { tone?: string }) {
  const base = "pointer-events-none absolute size-3 border-[color:var(--c)]";
  return (
    <span aria-hidden style={{ ["--c" as string]: tone }}>
      <span className={`${base} -left-px -top-px border-l-2 border-t-2`} />
      <span className={`${base} -right-px -top-px border-r-2 border-t-2`} />
      <span className={`${base} -bottom-px -left-px border-b-2 border-l-2`} />
      <span className={`${base} -bottom-px -right-px border-b-2 border-r-2`} />
    </span>
  );
}

/**
 * HUD-Modul: dünner Rahmen, Eckklammern, Kopfzeile "▸ LABEL ─── CODE".
 * tone färbt Klammern und Label, z.b. Alarm-Orange für die Prüfung.
 */
export function HudPanel({
  label,
  code,
  action,
  children,
  className = "",
  tone,
  id,
}: {
  label?: string;
  code?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={label && id ? id : undefined}
      className={`relative border border-line bg-panel p-5 backdrop-blur-[6px] sm:p-6 ${className}`}
      style={{
        boxShadow: "inset 0 0 40px rgba(92,225,255,0.04), 0 0 0 1px rgba(2,6,11,0.6)",
      }}
    >
      <Corners tone={tone} />
      {label ? (
        <header className="mb-4 flex items-center gap-3">
          <h2 id={id} className="hud-label shrink-0" style={{ color: tone ?? "var(--color-hud)" }}>
            <span aria-hidden className="mr-1.5">▸</span>
            {label}
          </h2>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
          {code ? (
            <span aria-hidden className="hud-label text-[10px] text-faint">
              {code}
            </span>
          ) : null}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* ---------- Reaktor-Ring ---------- */

/**
 * Konzentrische Ringe wie ein Reaktor. Der äußere dreht langsam, der mittlere
 * gegenläufig, der Bogen zeigt den Fortschritt (0..1). In der Mitte der Wert.
 */
export function Reactor({
  value,
  unit,
  progress,
  tone = "var(--color-hud)",
  size = 220,
}: {
  value: React.ReactNode;
  unit?: string;
  progress: number;
  tone?: string;
  size?: number;
}) {
  const r = 78;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" aria-hidden>
        <defs>
          <radialGradient id="reactor-core">
            <stop offset="0%" stopColor={tone} stopOpacity="0.28" />
            <stop offset="70%" stopColor={tone} stopOpacity="0.04" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#reactor-core)" />
        {/* Außenring, gestrichelt, dreht */}
        <g className="origin-center animate-spin-slow" style={{ transformBox: "fill-box" }}>
          <circle cx="100" cy="100" r="96" fill="none" stroke={tone} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="100" cy="100" r="92" fill="none" stroke={tone} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="40 22 8 22" />
        </g>
        {/* Mittelring, Segmente, gegenläufig */}
        <g className="origin-center animate-spin-rev" style={{ transformBox: "fill-box" }}>
          <circle cx="100" cy="100" r="86" fill="none" stroke={tone} strokeOpacity="0.22" strokeWidth="5" strokeDasharray="1.5 4" />
        </g>
        {/* Fortschritt */}
        <circle cx="100" cy="100" r={r} fill="none" stroke={tone} strokeOpacity="0.12" strokeWidth="3" />
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circ * p} ${circ}`}
          transform="rotate(-90 100 100)"
          style={{ filter: `drop-shadow(0 0 6px ${tone})` }}
        />
        {/* Innenkreis */}
        <circle cx="100" cy="100" r="62" fill="rgba(2,6,11,0.7)" stroke={tone} strokeOpacity="0.4" strokeWidth="1" />
        {[0, 90, 180, 270].map((a) => (
          <line
            key={a}
            x1="100"
            y1="34"
            x2="100"
            y2="40"
            stroke={tone}
            strokeOpacity="0.8"
            strokeWidth="1.5"
            transform={`rotate(${a} 100 100)`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-[64px] font-bold leading-none"
          style={{ color: tone, textShadow: `0 0 18px ${tone}` }}
        >
          {value}
        </span>
        {unit ? (
          <span className="hud-label mt-1 text-[11px]" style={{ color: tone }}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Kleinteile ---------- */

/** Statuszeile: LABEL ........ WERT */
export function Readout({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="hud-label text-[11px] text-muted">{label}</span>
      <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-line-strong" />
      <span className="font-display text-[22px] font-semibold leading-none" style={{ color: tone ?? "var(--color-ink)" }}>
        {value}
      </span>
    </div>
  );
}

export function SubjectTag({ subject, className = "" }: { subject?: SubjectRef | null; className?: string }) {
  if (!subject) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-[13px] font-semibold tracking-wider ${className}`}
      style={{ color: subject.farbe }}
      title={subject.name}
    >
      <span className="size-1.5 rotate-45" style={{ backgroundColor: subject.farbe, boxShadow: `0 0 6px ${subject.farbe}` }} aria-hidden />
      {subject.kuerzel}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-line px-4 py-4 text-[14px] text-muted">
      <span className="hud-label mr-2 text-[10px] text-faint">[ leer ]</span>
      {children}
    </p>
  );
}

export function PageTitle({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <p className="hud-label text-[11px] text-hud-dim">{kicker}</p>
      <h1 className="glow mt-1 font-display text-[40px] font-bold uppercase leading-none tracking-[0.06em] text-hud-strong sm:text-[48px]">
        {title}
      </h1>
      {children ? <p className="mt-3 max-w-2xl text-muted">{children}</p> : null}
    </header>
  );
}

/* ---------- Formular-Stile ---------- */

export const fieldClass =
  "hud-cut w-full border border-line bg-[rgba(2,10,16,0.7)] px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:border-hud focus:outline-none";

/** Wie fieldClass, aber nur so breit wie nötig (für Zeilen mit mehreren Feldern) */
export const fieldInlineClass = fieldClass.replace("w-full", "w-auto");

export const labelClass = "hud-label mb-1.5 block text-[10px] text-muted";

export function buttonClass(variant: "primary" | "ghost" | "danger" = "primary") {
  const base =
    "hud-cut inline-flex items-center justify-center gap-2 px-4 py-2 font-display text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  if (variant === "primary")
    return `${base} bg-hud/15 text-hud-strong ring-1 ring-inset ring-hud/60 hover:bg-hud/25`;
  if (variant === "danger") return `${base} text-alert ring-1 ring-inset ring-alert/50 hover:bg-alert/10`;
  return `${base} text-muted ring-1 ring-inset ring-line-strong hover:text-ink hover:ring-hud/50`;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="flex items-center gap-3 py-10">
      <span className="size-3 animate-ping rounded-full bg-hud" />
      <span className="hud-label text-hud-dim">Lade Daten…</span>
    </div>
  );
}
