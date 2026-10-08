"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export const DOC_DRAG_TYPE = "application/x-dashboard-doc";

/**
 * Ordner als Bauteil: Reiter + Rückwand, dazwischen Blätter (wenn etwas drin liegt),
 * davor die Klappe mit Name und Anzahl. Beim Hover und beim Reinziehen klappt die
 * Klappe leicht nach vorne.
 */
export function FolderTile({
  name,
  count,
  color,
  onOpen,
  onDropDoc,
  onDropFiles,
}: {
  name: string;
  count: number;
  color?: string;
  onOpen: () => void;
  onDropDoc: (docId: string) => void;
  onDropFiles: (files: FileList) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const docId = e.dataTransfer.getData(DOC_DRAG_TYPE);
        if (docId) onDropDoc(docId);
        else if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files);
      }}
      aria-label={`Ordner ${name}, ${count} ${count === 1 ? "Datei" : "Dateien"}`}
      className="group relative block aspect-[5/4] w-full rounded-lg text-left [perspective:700px]"
    >
      {/* Reiter */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-4 w-[44%] rounded-t-lg"
        style={{
          background: color
            ? `color-mix(in srgb, ${color} 55%, var(--color-folder-back))`
            : "var(--color-folder-back)",
          clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)",
        }}
      />
      {/* Rückwand */}
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 top-3.5 rounded-lg rounded-tl-none bg-folder-back ring-1 transition-shadow ${
          over ? "ring-accent" : "ring-transparent"
        }`}
      />
      {/* Blätter, nur wenn etwas drin liegt */}
      {count > 0 ? (
        <>
          <span
            aria-hidden
            className="absolute left-[9%] right-[16%] top-[17%] h-1/3 -rotate-[2.5deg] rounded-sm bg-paper transition-transform duration-200 group-hover:-translate-y-1"
          />
          {count > 1 ? (
            <span
              aria-hidden
              className="absolute left-[15%] right-[9%] top-[21%] h-1/3 rotate-[1.5deg] rounded-sm bg-paper-light transition-transform duration-200 group-hover:-translate-y-0.5"
            />
          ) : null}
        </>
      ) : null}
      {/* Klappe */}
      <span
        className={`absolute inset-x-0 bottom-0 top-[38%] flex origin-bottom flex-col justify-end rounded-lg border-t border-white/[0.06] bg-folder-front px-3.5 pb-3 transition-transform duration-200 ${
          over
            ? "[transform:rotateX(-24deg)]"
            : "group-hover:[transform:rotateX(-10deg)] group-focus-visible:[transform:rotateX(-10deg)]"
        }`}
      >
        <span className="truncate text-[14px] font-medium leading-tight text-ink">{name}</span>
        <span className="text-[12px] text-faint">
          {over ? "Loslassen zum Ablegen" : count === 0 ? "Leer" : `${count} ${count === 1 ? "Datei" : "Dateien"}`}
        </span>
      </span>
    </button>
  );
}

/** Gestrichelte Ordner-Form zum Anlegen. Wird beim Klick zum Eingabefeld. */
export function NewFolderTile({ onCreate }: { onCreate: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    const clean = name.trim();
    if (clean) onCreate(clean);
    setName("");
    setEditing(false);
  };

  return (
    <div className="relative aspect-[5/4] w-full">
      <span
        aria-hidden
        className="absolute left-0 top-0 h-4 w-[44%] rounded-t-lg border border-b-0 border-dashed border-line-strong"
      />
      <div className="absolute inset-x-0 bottom-0 top-[15px] flex flex-col items-center justify-center rounded-lg rounded-tl-none border border-dashed border-line-strong px-3">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="w-full"
          >
            <label className="sr-only" htmlFor="new-folder">
              Name des neuen Ordners
            </label>
            <input
              id="new-folder"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => e.key === "Escape" && (setName(""), setEditing(false))}
              placeholder="Name"
              className="w-full rounded-md bg-raised px-2.5 py-1.5 text-center text-[14px] text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="mt-1.5 block text-center text-[12px] text-faint">Enter zum Anlegen</span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex size-full flex-col items-center justify-center gap-1.5 rounded-lg text-[14px] text-muted hover:text-ink"
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden />
            Neuer Ordner
          </button>
        )}
      </div>
    </div>
  );
}

/** Kleine Ordner-Form für Überschriften und Listen */
export function FolderGlyph({ color, size = 20 }: { color?: string; size?: number }) {
  const tab = color ? `color-mix(in srgb, ${color} 55%, var(--color-folder-back))` : "var(--color-paper)";
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 20 16" aria-hidden className="shrink-0">
      <path d="M1 3a2 2 0 0 1 2-2h4.2l2 2H17a2 2 0 0 1 2 2v1H1z" fill={tab} />
      <rect x="1" y="5" width="18" height="10" rx="2" fill="var(--color-folder-front)" stroke="var(--color-line-strong)" strokeWidth="0.75" />
    </svg>
  );
}
