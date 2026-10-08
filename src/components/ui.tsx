import { subjectMap } from "@/lib/sample-data";

export function PageHeader({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      {children ? <p className="mt-2 max-w-prose text-muted">{children}</p> : null}
    </header>
  );
}

export function SectionTitle({
  children,
  count,
  action,
}: {
  children: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-[15px] font-semibold text-ink">
        {children}
        {count !== undefined ? (
          <span className="ml-2 font-normal text-faint">{count}</span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}

/** Kleines Lernfeld-Kennzeichen: Farbpunkt + Kürzel */
export function SubjectTag({ kuerzel, className = "" }: { kuerzel?: string; className?: string }) {
  if (!kuerzel) return null;
  const s = subjectMap.get(kuerzel);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] text-muted ${className}`}>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: s?.farbe ?? "var(--color-faint)" }}
        aria-hidden
      />
      {kuerzel}
    </span>
  );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-[14px] text-faint">{children}</p>;
}

/** Ruhiger Platzhalter, solange eine Seite lädt */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="animate-pulse">
      <div className="h-9 w-64 rounded-md bg-surface" />
      <div className="mt-4 h-4 w-80 max-w-full rounded bg-surface" />
      <div className="mt-12 h-24 rounded-md bg-surface" />
    </div>
  );
}

/**
 * Fläche für ein Modul. Große Rundung außen, Listen innen bleiben flach.
 * Titel optional, mit Zähler und Aktion rechts.
 */
export function Panel({
  title,
  count,
  action,
  children,
  className = "",
  id,
}: {
  title?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={title && id ? id : undefined}
      className={`rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-6 ${className}`}
    >
      {title ? (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id={id} className="text-[15px] font-semibold text-ink">
            {title}
            {count !== undefined ? <span className="ml-2 font-normal text-faint">{count}</span> : null}
          </h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
