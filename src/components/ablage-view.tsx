"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, File, FileImage, FileSpreadsheet, FileText, Search, Upload } from "lucide-react";
import { diffDays, formatShort } from "@/lib/dates";
import { formatSize, subjectMap, subjects, type Doc, type Folder } from "@/lib/sample-data";
import { DOC_DRAG_TYPE, FolderGlyph, FolderTile, NewFolderTile } from "./folder";
import { SectionTitle, SubjectTag } from "./ui";

const plural = (n: number) => `${n} ${n === 1 ? "Datei" : "Dateien"}`;

function slug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "ordner"}-${Math.random().toString(36).slice(2, 6)}`;
}

export function AblageView({
  initial,
  initialFolders,
  today,
}: {
  initial: Doc[];
  initialFolders: Folder[];
  today: string;
}) {
  const [docs, setDocs] = useState(initial);
  const [folders, setFolders] = useState(initialFolders);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const searchId = useId();

  // Der offene Ordner steht in der URL (?ordner=…), damit Zurück und Links funktionieren
  const openId = useSearchParams().get("ordner");
  const open = folders.find((f) => f.id === openId) ?? null;
  const go = (id: string | null) =>
    window.history.pushState(null, "", id ? `/ablage?ordner=${encodeURIComponent(id)}` : "/ablage");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const folderName = (id?: string) => folders.find((f) => f.id === id)?.name;

  const moveDoc = (docId: string, folderId?: string) => {
    const doc = docs.find((d) => d.id === docId);
    if (!doc || doc.folder === folderId) return;
    setDocs((ds) => ds.map((d) => (d.id === docId ? { ...d, folder: folderId } : d)));
    setToast(folderId ? `${doc.name} liegt jetzt in ${folderName(folderId)}` : `${doc.name} aus dem Ordner genommen`);
  };

  // Probe: Dateien landen nur lokal in der Liste, noch nicht in R2
  const addFiles = (files: FileList | null, folderId?: string) => {
    if (!files?.length) return;
    const added: Doc[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      subject: subject ?? folders.find((x) => x.id === folderId)?.subject,
      folder: folderId,
      tags: ["Neu"],
      sizeBytes: f.size,
      uploaded: today,
    }));
    setDocs((d) => [...added, ...d]);
    setToast(
      `${plural(added.length)} hochgeladen${folderId ? ` in ${folderName(folderId)}` : ""}`,
    );
  };

  const createFolder = (name: string) => {
    setFolders((fs) => [...fs, { id: slug(name), name }]);
    setToast(`Ordner ${name} angelegt`);
  };

  const q = query.trim().toLowerCase();
  const matches = (d: Doc) =>
    !q ||
    d.name.toLowerCase().includes(q) ||
    d.tags.some((t) => t.toLowerCase().includes(q)) ||
    !!d.subject?.toLowerCase().includes(q) ||
    !!folderName(d.folder)?.toLowerCase().includes(q);

  const total = docs.reduce((s, d) => s + d.sizeBytes, 0);
  const rowProps = { today, folders, onMove: moveDoc };

  const searchBar = (
    <div className="mb-8 flex items-center gap-3 rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface px-5 focus-within:border-accent/40">
      <Search size={16} className="shrink-0 text-faint" aria-hidden />
      <label htmlFor={searchId} className="sr-only">
        Dokumente durchsuchen
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={open ? `In ${open.name} suchen` : "Dateien durchsuchen"}
        className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink placeholder:text-faint focus:outline-none"
      />
    </div>
  );

  /* ---------- Ein Ordner ist offen ---------- */
  if (open) {
    const inside = docs.filter((d) => d.folder === open.id);
    const visible = inside.filter(matches);
    const color = open.subject ? subjectMap.get(open.subject)?.farbe : undefined;
    return (
      <>
        <button
          type="button"
          onClick={() => go(null)}
          className="mb-8 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
        >
          <ChevronLeft size={15} aria-hidden /> Ablage
        </button>
        <header className="mb-10">
          <h1 className="flex items-center gap-3 text-[28px] font-semibold leading-tight tracking-tight text-ink">
            <FolderGlyph color={color} size={30} />
            {open.name}
          </h1>
          <p className="mt-2 text-muted">
            {plural(inside.length)}
            {inside.length ? `, zusammen ${formatSize(inside.reduce((s, d) => s + d.sizeBytes, 0))}` : null}.
            Alles hier taucht auch in der Übersicht auf.
          </p>
        </header>

        {searchBar}
        <DropZone onFiles={(f) => addFiles(f, open.id)} hint={`Landen direkt in ${open.name}`} />

        <div className="rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface p-5 sm:p-6">
        {inside.length === 0 ? (
          <p className="py-2 text-muted">
            Noch leer. Dateien oben reinziehen oder in der Übersicht über die Spalte Ordner hierher verschieben.
          </p>
        ) : (
          <DocTable>
            {visible.map((d) => (
              <AblageRow key={d.id} doc={d} {...rowProps} />
            ))}
          </DocTable>
        )}
        </div>
        <Toast message={toast} />
      </>
    );
  }

  /* ---------- Übersicht ---------- */
  const withDocs = subjects.filter((s) => docs.some((d) => d.subject === s.kuerzel));
  const visible = docs.filter((d) => (!subject || d.subject === subject) && matches(d));

  return (
    <>
      <header className="mb-10">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">Ablage</h1>
        <p className="mt-2 text-muted">
          {plural(docs.length)} in {folders.length} Ordnern, zusammen {formatSize(total)}. Noch
          Beispieldaten, Uploads werden nicht gespeichert.
        </p>
      </header>

      {searchBar}

      <section className="mb-14" aria-labelledby="ordner">
        <SectionTitle count={folders.length}>
          <span id="ordner">Ordner</span>
        </SectionTitle>
        <p className="-mt-1 mb-5 text-[13px] text-faint">
          <span className="hidden sm:inline">Dateien aus der Liste auf einen Ordner ziehen, um sie dort abzulegen.</span>
          <span className="sm:hidden">In der Liste unten bei jeder Datei den Ordner auswählen.</span>
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {folders.map((f) => (
            <FolderTile
              key={f.id}
              name={f.name}
              count={docs.filter((d) => d.folder === f.id).length}
              color={f.subject ? subjectMap.get(f.subject)?.farbe : undefined}
              onOpen={() => go(f.id)}
              onDropDoc={(id) => moveDoc(id, f.id)}
              onDropFiles={(files) => addFiles(files, f.id)}
            />
          ))}
          <NewFolderTile onCreate={createFolder} />
        </div>
      </section>

      <section aria-labelledby="alle" className="rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface p-5 sm:p-6">
        <SectionTitle count={docs.length}>
          <span id="alle">Alle Dokumente</span>
        </SectionTitle>

        <div className="mb-5 mt-4 flex flex-wrap gap-1.5" aria-label="Nach Fach filtern">
          <Chip active={subject === null} onClick={() => setSubject(null)}>
            Alle
          </Chip>
          {withDocs.map((s) => (
            <Chip key={s.kuerzel} active={subject === s.kuerzel} onClick={() => setSubject(s.kuerzel)}>
              <span className="size-2 rounded-full" style={{ backgroundColor: s.farbe }} aria-hidden />
              {s.kuerzel}
            </Chip>
          ))}
        </div>

        <DropZone
          onFiles={(f) => addFiles(f)}
          hint={subject ? `Landen in ${subject}, ohne Ordner` : "Landen in der Übersicht, ohne Ordner"}
        />

        {visible.length ? (
          <DocTable>
            {visible.map((d) => (
              <AblageRow key={d.id} doc={d} {...rowProps} />
            ))}
          </DocTable>
        ) : (
          <p className="py-6 text-muted">
            Nichts gefunden für „{query}“. Anderen Begriff versuchen oder Filter auf Alle stellen.
          </p>
        )}
      </section>
      <Toast message={toast} />
    </>
  );
}

/* ---------- Bausteine ---------- */

const COLS = "sm:grid-cols-[auto_minmax(0,1fr)_4rem_8.5rem_4.5rem_5.5rem]";

function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        className={`hidden gap-x-4 border-b border-line pb-2 text-[12px] text-faint sm:grid ${COLS}`}
        aria-hidden
      >
        <span className="w-[17px]" />
        <span>Name</span>
        <span>Fach</span>
        <span>Ordner</span>
        <span className="text-right">Größe</span>
        <span className="text-right">Hinzugefügt</span>
      </div>
      <ul>{children}</ul>
    </>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const props = { size: 17, strokeWidth: 1.6, className: "text-faint", "aria-hidden": true } as const;
  if (["pdf", "doc", "docx"].includes(ext)) return <FileText {...props} />;
  if (["jpg", "jpeg", "png", "heic"].includes(ext)) return <FileImage {...props} />;
  if (["xlsx", "csv"].includes(ext)) return <FileSpreadsheet {...props} />;
  return <File {...props} />;
}

function AblageRow({
  doc,
  today,
  folders,
  onMove,
}: {
  doc: Doc;
  today: string;
  folders: Folder[];
  onMove: (docId: string, folderId?: string) => void;
}) {
  const age = diffDays(doc.uploaded, today);
  const uploaded = age === 0 ? "Heute" : age === 1 ? "Gestern" : formatShort(doc.uploaded);

  const select = (
    <select
      value={doc.folder ?? ""}
      onChange={(e) => onMove(doc.id, e.target.value || undefined)}
      aria-label={`Ordner für ${doc.name}`}
      className="w-full max-w-[8.5rem] cursor-pointer truncate rounded-md bg-transparent py-1 pr-1 text-[13px] text-muted hover:bg-raised hover:text-ink focus:bg-raised focus:text-ink"
    >
      <option value="">Kein Ordner</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );

  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DOC_DRAG_TYPE, doc.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`grid cursor-grab grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 border-b border-line py-2.5 last:border-b-0 hover:bg-surface active:cursor-grabbing sm:gap-x-4 ${COLS}`}
    >
      <FileIcon name={doc.name} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] text-ink">{doc.name}</span>
        {/* Handy: Meta-Zeile + Ordner-Auswahl */}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-faint sm:hidden">
          {doc.subject ? <SubjectTag kuerzel={doc.subject} /> : null}
          <span>{formatSize(doc.sizeBytes)}</span>
          <span>{uploaded}</span>
        </span>
      </span>
      <span className="hidden sm:block">
        {doc.subject ? <SubjectTag kuerzel={doc.subject} /> : <span className="text-[13px] text-faint">ohne</span>}
      </span>
      {/* Eine Auswahl für beide Layouts: auf dem Handy rutscht sie unter den Namen */}
      <span className="col-start-2 flex items-center gap-1.5 sm:col-start-auto">
        <span className="sm:hidden">
          <FolderGlyph size={14} />
        </span>
        {select}
      </span>
      <span className="hidden text-right text-[13px] text-faint sm:block">{formatSize(doc.sizeBytes)}</span>
      <span className="hidden text-right text-[13px] text-faint sm:block">{uploaded}</span>
    </li>
  );
}

function DropZone({ onFiles, hint }: { onFiles: (files: FileList) => void; hint: string }) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={`mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-dashed px-5 py-4 transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-line-strong"
      }`}
    >
      <Upload size={18} strokeWidth={1.6} className="text-faint" aria-hidden />
      <p className="text-[15px] text-ink">
        Dateien hierher ziehen oder{" "}
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          auswählen
        </button>
      </p>
      <p className="text-[13px] text-faint sm:ml-auto">{hint}</p>
      <input
        ref={input}
        type="file"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors ${
        active
          ? "border-line-strong bg-raised text-ink"
          : "border-line text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-5 transition-all duration-200 md:bottom-8 md:left-56 ${
        message ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message ? (
        <span className="max-w-md truncate rounded-lg border border-line-strong bg-raised px-4 py-2.5 text-[14px] text-ink shadow-lg shadow-black/30">
          {message}
        </span>
      ) : null}
    </div>
  );
}
