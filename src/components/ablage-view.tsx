"use client";

import { useId, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Pencil, Search, Trash2 } from "lucide-react";
import { createFolder, deleteFolder, renameFolder } from "@/app/actions";
import { formatSize, type Doc, type Folder, type Subject } from "@/lib/types";
import type { StorageMode } from "@/lib/upload";
import { FolderGlyph, FolderTile, NewFolderTile } from "./folder";
import { DocList, DropZone, Toast, useDocs, useToast, useUploader } from "./files";
import { HudPanel, buttonClass, fieldClass } from "./hud";

const plural = (n: number) => `${n} ${n === 1 ? "Datei" : "Dateien"}`;

export function AblageView({
  docs: initialDocs,
  folders,
  subjects,
  today,
  storage,
}: {
  docs: Doc[];
  folders: Folder[];
  subjects: Subject[];
  today: string;
  storage: StorageMode;
}) {
  const toast = useToast();
  const { docs, run } = useDocs(initialDocs, toast.show);
  const { uploads, uploadFiles } = useUploader(toast.show, storage);
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [, start] = useTransition();
  const searchId = useId();

  // Der offene Ordner steht in der URL (?ordner=…), damit Zurück und Links funktionieren
  const openId = useSearchParams().get("ordner");
  const open = folders.find((f) => f.id === openId) ?? null;
  const go = (id: string | null) => window.history.pushState(null, "", id ? `/ablage?ordner=${encodeURIComponent(id)}` : "/ablage");

  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;
  const move = (id: string, folderId: string | null) =>
    run({ kind: "move", id, folderId }, folderId ? `Liegt jetzt in ${folderName(folderId)}` : "Aus dem Ordner genommen");
  const remove = (id: string) => run({ kind: "delete", id }, "Datei gelöscht");

  const q = query.trim().toLowerCase();
  const matches = (d: Doc) =>
    !q ||
    d.name.toLowerCase().includes(q) ||
    !!d.subject?.kuerzel.toLowerCase().includes(q) ||
    !!folderName(d.folderId)?.toLowerCase().includes(q);

  const searchBar = (
    <div className="mb-6 flex items-center gap-3 border border-line bg-panel px-4 backdrop-blur focus-within:border-hud">
      <Search size={16} className="shrink-0 text-hud-dim" aria-hidden />
      <label htmlFor={searchId} className="sr-only">
        Dateien durchsuchen
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={open ? `In ${open.name} suchen` : "Dateien durchsuchen"}
        className="min-w-0 flex-1 bg-transparent py-3 text-ink placeholder:text-faint focus:outline-none"
      />
    </div>
  );

  /* ---------- Ein Ordner ist offen ---------- */
  if (open) {
    const inside = docs.filter((d) => d.folderId === open.id);
    return (
      <>
        <button type="button" onClick={() => go(null)} className="hud-label mb-6 inline-flex items-center gap-1 text-[11px] text-hud-dim hover:text-hud">
          <ChevronLeft size={14} aria-hidden /> Ablage
        </button>
        <FolderHeader folder={open} count={inside.length} size={inside.reduce((s, d) => s + d.sizeBytes, 0)} onDeleted={() => go(null)} />
        {searchBar}
        <HudPanel label="Inhalt" code={`DIR-${String(inside.length).padStart(2, "0")}`}>
          <DropZone
            disabled={!storage}
            uploads={uploads}
            onFiles={(f) => uploadFiles(f, { folderId: open.id, subjectId: open.subject?.id })}
            hint={`Landen direkt in ${open.name}`}
          />
          <DocList
            docs={inside.filter(matches)}
            folders={folders}
            today={today}
            onMove={move}
            onDelete={remove}
            empty="Noch leer. Dateien oben reinziehen oder in der Übersicht in diesen Ordner verschieben."
          />
        </HudPanel>
        <Toast message={toast.message} />
      </>
    );
  }

  /* ---------- Übersicht ---------- */
  const withDocs = subjects.filter((s) => docs.some((d) => d.subject?.id === s.id));
  const visible = docs.filter((d) => (!subjectFilter || d.subject?.id === subjectFilter) && matches(d));

  return (
    <>
      {searchBar}

      <section className="mb-8" aria-labelledby="ordner">
        <div className="mb-4 flex items-center gap-3">
          <h2 id="ordner" className="hud-label text-[12px] text-hud">
            ▸ Ordner <span className="text-faint">[{String(folders.length).padStart(2, "0")}]</span>
          </h2>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
          <span className="hud-label hidden text-[9px] text-faint sm:inline">Dateien auf einen Ordner ziehen zum Ablegen</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {folders.map((f) => (
            <FolderTile
              key={f.id}
              name={f.name}
              count={docs.filter((d) => d.folderId === f.id).length}
              color={f.subject?.farbe}
              onOpen={() => go(f.id)}
              onDropDoc={(id) => move(id, f.id)}
              onDropFiles={(files) => uploadFiles(files, { folderId: f.id, subjectId: f.subject?.id })}
            />
          ))}
          <NewFolderTile
            onCreate={(name) =>
              start(async () => {
                const res = await createFolder({ name });
                toast.show("error" in res ? res.error : `Ordner ${name} angelegt`);
              })
            }
          />
        </div>
      </section>

      <HudPanel label="Alle Dateien" code={`DOC-${String(docs.length).padStart(2, "0")}`}>
        {withDocs.length ? (
          <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Nach Fach filtern">
            <Chip active={subjectFilter === null} onClick={() => setSubjectFilter(null)}>Alle</Chip>
            {withDocs.map((s) => (
              <Chip key={s.id} active={subjectFilter === s.id} onClick={() => setSubjectFilter(s.id)} color={s.farbe}>
                {s.kuerzel}
              </Chip>
            ))}
          </div>
        ) : null}
        <DropZone disabled={!storage} uploads={uploads} onFiles={(f) => uploadFiles(f, { subjectId: subjectFilter })} hint="Landen in der Übersicht, ohne Ordner" />
        <DocList
          docs={visible}
          folders={folders}
          today={today}
          onMove={move}
          onDelete={remove}
          empty={q ? `Nichts gefunden für „${query}“.` : "Noch keine Dateien. Zieh deine erste Datei oben rein."}
        />
      </HudPanel>
      <Toast message={toast.message} />
    </>
  );
}

function Chip({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`hud-cut px-3 py-1 font-display text-[12px] font-bold tracking-wider ring-1 ring-inset transition-colors ${
        active ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-muted ring-line hover:text-ink"
      }`}
      style={!active && color ? { color } : undefined}
    >
      {children}
    </button>
  );
}

function FolderHeader({ folder, count, size, onDeleted }: { folder: Folder; count: number; size: number; onDeleted: () => void }) {
  const [mode, setMode] = useState<"view" | "rename" | "confirm">("view");
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <header className="mb-6">
      {mode === "rename" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await renameFolder(folder.id, name);
              if ("error" in res) setError(res.error);
              else setMode("view");
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label htmlFor="folder-name" className="sr-only">Ordnername</label>
          <input id="folder-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} className={`${fieldClass} max-w-sm font-display text-[22px] font-bold uppercase`} />
          <button type="button" onClick={() => setMode("view")} className={buttonClass("ghost")}>Abbrechen</button>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>Sichern</button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <FolderGlyph color={folder.subject?.farbe} size={34} />
          <h1 className="glow font-display text-[36px] font-bold uppercase leading-none tracking-[0.05em] text-hud-strong">{folder.name}</h1>
          <span className="ml-auto flex gap-3">
            {mode === "confirm" ? (
              <>
                <button type="button" onClick={() => setMode("view")} className="hud-label text-[10px] text-faint hover:text-ink">Nein</button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteFolder(folder.id);
                      if ("error" in res) setError(res.error);
                      else onDeleted();
                    })
                  }
                  className="hud-label text-[10px] text-alert"
                >
                  Ordner löschen
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setMode("rename")} aria-label="Ordner umbenennen" className="text-faint hover:text-hud">
                  <Pencil size={16} aria-hidden />
                </button>
                <button type="button" onClick={() => setMode("confirm")} aria-label="Ordner löschen" className="text-faint hover:text-alert">
                  <Trash2 size={16} aria-hidden />
                </button>
              </>
            )}
          </span>
        </div>
      )}
      <p className="mt-2 text-muted">
        {plural(count)}
        {count ? `, zusammen ${formatSize(size)}` : null}. {mode === "confirm" ? "Die Dateien bleiben erhalten und landen wieder in der Übersicht." : "Alles hier taucht auch in der Übersicht auf."}
      </p>
      {error ? <p role="alert" className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </header>
  );
}
