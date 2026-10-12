"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

export const DOC_DRAG_TYPE = "application/x-dashboard-doc";

/**
 * Ordner als Hologramm: Reiter + Rückwand als Drahtgitter, dazwischen leuchtende
 * Blätter (wenn etwas drin liegt), davor eine halbdurchsichtige Klappe.
 * Beim Hover und beim Reinziehen klappt sie nach vorne und leuchtet auf.
 */
export function FolderTile({
  name,
  count,
  color = "#5ce1ff",
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
  const c = (a: number) => `color-mix(in srgb, ${color} ${a}%, transparent)`;

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
      className="group relative block aspect-[5/4] w-full text-left [perspective:700px]"
      style={{ filter: over ? `drop-shadow(0 0 14px ${color})` : undefined }}
    >
      {/* Reiter */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-4 w-[44%]"
        style={{ background: c(35), clipPath: "polygon(0 0, 82% 0, 100% 100%, 0 100%)" }}
      />
      {/* Rückwand */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 top-3.5 transition-colors" style={{ background: c(over ? 16 : 8), boxShadow: `inset 0 0 0 1px ${c(40)}` }} />
      {/* Blätter als Lichtlinien */}
      {count > 0 ? (
        <>
          <span aria-hidden className="absolute left-[9%] right-[16%] top-[17%] h-1/3 -rotate-[2.5deg] transition-transform duration-200 group-hover:-translate-y-1" style={{ background: c(18), boxShadow: `inset 0 0 0 1px ${c(55)}` }} />
          {count > 1 ? (
            <span aria-hidden className="absolute left-[15%] right-[9%] top-[21%] h-1/3 rotate-[1.5deg] transition-transform duration-200 group-hover:-translate-y-0.5" style={{ background: c(26), boxShadow: `inset 0 0 0 1px ${c(70)}` }} />
          ) : null}
        </>
      ) : null}
      {/* Klappe */}
      <span
        className={`absolute inset-x-0 bottom-0 top-[38%] flex origin-bottom flex-col justify-end px-3.5 pb-3 backdrop-blur-[3px] transition-transform duration-200 ${
          over ? "[transform:rotateX(-26deg)]" : "group-hover:[transform:rotateX(-12deg)] group-focus-visible:[transform:rotateX(-12deg)]"
        }`}
        style={{ background: "rgba(4,14,22,0.82)", boxShadow: `inset 0 1px 0 ${color}, inset 0 0 0 1px ${c(45)}` }}
      >
        <span className="truncate font-display text-[15px] font-bold uppercase leading-tight tracking-wider text-ink">{name}</span>
        <span className="hud-label text-[9px]" style={{ color }}>
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
      <span aria-hidden className="absolute left-0 top-0 h-4 w-[44%] border border-b-0 border-dashed border-line-strong" />
      <div className="absolute inset-x-0 bottom-0 top-[15px] flex flex-col items-center justify-center border border-dashed border-line-strong px-3">
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
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setName("");
                  setEditing(false);
                }
              }}
              placeholder="Name"
              className="w-full border border-line bg-void/70 px-2.5 py-1.5 text-center text-[14px] text-ink placeholder:text-faint focus:border-hud focus:outline-none"
            />
            <span className="hud-label mt-1.5 block text-center text-[9px] text-faint">Enter zum Anlegen</span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="hud-label flex size-full flex-col items-center justify-center gap-1.5 text-[10px] text-faint hover:text-hud"
          >
            <Plus size={18} strokeWidth={1.5} aria-hidden />
            Neuer Ordner
          </button>
        )}
      </div>
    </div>
  );
}

/** Kleine Ordner-Form für Überschriften */
export function FolderGlyph({ color = "#5ce1ff", size = 20 }: { color?: string; size?: number }) {
  return (
    <svg viewBox="0 0 20 16" width={size} height={size * 0.8} aria-hidden className="shrink-0" style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
      <path d="M1 3a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v1H1z" fill={color} fillOpacity="0.4" />
      <rect x="1" y="5" width="18" height="10" fill="rgba(4,14,22,0.9)" stroke={color} strokeWidth="1" />
    </svg>
  );
}
