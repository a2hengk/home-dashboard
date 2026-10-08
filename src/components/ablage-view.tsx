"use client";

import { useId, useRef, useState } from "react";
import { Search, Upload } from "lucide-react";
import { subjects, type Doc } from "@/lib/sample-data";
import { DocRow } from "./doc-row";

export function AblageView({ initial, today }: { initial: Doc[]; today: string }) {
  const [docs, setDocs] = useState(initial);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchId = useId();

  // Probe: Dateien landen nur lokal in der Liste, noch nicht in R2
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const added: Doc[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      subject: subject ?? undefined,
      tags: ["Neu"],
      sizeBytes: f.size,
      uploaded: today,
    }));
    setDocs((d) => [...added, ...d]);
  };

  const withDocs = subjects.filter((s) => docs.some((d) => d.subject === s.kuerzel));
  const q = query.trim().toLowerCase();
  const visible = docs.filter(
    (d) =>
      (!subject || d.subject === subject) &&
      (!q ||
        d.name.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.subject?.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="mb-5 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 focus-within:border-line-strong">
        <Search size={16} className="shrink-0 text-faint" aria-hidden />
        <label htmlFor={searchId} className="sr-only">
          Dokumente durchsuchen
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen nach Name, Fach oder Tag"
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-ink placeholder:text-faint focus:outline-none"
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-1.5" aria-label="Nach Fach filtern">
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

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`mb-10 flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-line-strong"
        }`}
      >
        <Upload size={20} strokeWidth={1.6} className="text-faint" aria-hidden />
        <p className="text-[15px] text-ink">
          Dateien hierher ziehen oder{" "}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            auswählen
          </button>
        </p>
        <p className="text-[13px] text-faint">
          PDF, Bilder und Office-Dateien bis 25 MB
          {subject ? `, landen in ${subject}` : null}
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div
        className="hidden grid-cols-[auto_1fr_5rem_4.5rem_5.5rem] gap-x-4 border-b border-line pb-2 text-[12px] text-faint sm:grid"
        aria-hidden
      >
        <span className="w-[17px]" />
        <span>Name</span>
        <span>Fach</span>
        <span className="text-right">Größe</span>
        <span className="text-right">Hinzugefügt</span>
      </div>
      {visible.length ? (
        <ul>
          {visible.map((d) => (
            <DocRow key={d.id} doc={d} today={today} />
          ))}
        </ul>
      ) : (
        <p className="py-6 text-muted">
          Nichts gefunden für „{query}“. Anderen Begriff versuchen oder Filter auf Alle stellen.
        </p>
      )}
    </>
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
