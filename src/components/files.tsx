"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { upload, uploadPresigned } from "@vercel/blob/client";
import { Download, File, FileImage, FileSpreadsheet, FileText, Trash2, Upload } from "lucide-react";
import { deleteDocument, moveDocument, registerDocument } from "@/app/actions";
import { diffDays, formatShort } from "@/lib/dates";
import { formatSize, type Doc, type Folder } from "@/lib/types";
import { MAX_UPLOAD_MB, type StorageMode } from "@/lib/upload";
import { DOC_DRAG_TYPE, FolderGlyph } from "./folder";
import { Empty, SubjectTag } from "./hud";

/* ---------- Hochladen ---------- */

const safeName = (n: string) => n.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120) || "datei";

export type UploadState = { name: string; pct: number }[];

/**
 * Lädt Dateien direkt aus dem Browser in den privaten Blob-Store (auch große Dateien)
 * und legt danach den Eintrag in der Datenbank an.
 */
export function useUploader(onMessage: (m: string) => void, storage: StorageMode) {
  const [uploads, setUploads] = useState<UploadState>([]);
  const [, start] = useTransition();

  const uploadFiles = (files: FileList | File[], target: { folderId?: string | null; subjectId?: string | null }) => {
    const list = Array.from(files);
    if (!list.length) return;
    if (!storage) {
      onMessage("Dateispeicher ist noch nicht verbunden. Erst in Vercel einen Blob-Store anlegen.");
      return;
    }
    start(async () => {
      let ok = 0;
      for (const file of list) {
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          onMessage(`${file.name} ist größer als ${MAX_UPLOAD_MB} MB`);
          continue;
        }
        setUploads((u) => [...u, { name: file.name, pct: 0 }]);
        try {
          // Zufälliger Präfix, damit gleichnamige Dateien sich nicht überschreiben
          const pathname = `ablage/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`;
          const send = storage === "oidc" ? uploadPresigned : upload;
          const blob = await send(pathname, file, {
            access: "private",
            handleUploadUrl: "/api/files/upload",
            multipart: file.size > 8 * 1024 * 1024,
            onUploadProgress: ({ percentage }) =>
              setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, pct: percentage } : x))),
          });
          const res = await registerDocument({
            name: file.name,
            pathname: blob.pathname,
            contentType: blob.contentType || file.type || "application/octet-stream",
            sizeBytes: file.size,
            folderId: target.folderId ?? null,
            subjectId: target.subjectId ?? null,
          });
          if ("error" in res) onMessage(res.error);
          else ok++;
        } catch (e) {
          const msg = (e as Error).message ?? "";
          // Das SDK meldet nur "Failed to retrieve the client token / presigned URL": Speicher fehlt oder Login abgelaufen
          onMessage(
            /client token|presigned URL/i.test(msg)
              ? `${file.name}: Upload nicht erlaubt. Speicher verbunden und noch eingeloggt?`
              : `${file.name}: ${msg || "Upload fehlgeschlagen"}`,
          );
        } finally {
          setUploads((u) => u.filter((x) => x.name !== file.name));
        }
      }
      if (ok) onMessage(`${ok} ${ok === 1 ? "Datei" : "Dateien"} hochgeladen`);
    });
  };

  return { uploads, uploadFiles };
}

export function DropZone({
  onFiles,
  hint,
  uploads,
  disabled = false,
}: {
  onFiles: (files: FileList) => void;
  hint: string;
  uploads: UploadState;
  disabled?: boolean;
}) {
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
      aria-disabled={disabled || undefined}
      className={`mb-5 border border-dashed px-5 py-4 transition-colors ${disabled ? "opacity-60" : ""} ${dragging ? "border-hud bg-hud/10 shadow-[inset_0_0_30px_rgba(92,225,255,0.15)]" : "border-line-strong"}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Upload size={18} strokeWidth={1.5} className="text-hud" aria-hidden />
        <p className="text-ink">
          Dateien hierher ziehen oder{" "}
          <button type="button" onClick={() => input.current?.click()} className="text-hud underline decoration-hud/40 underline-offset-4 hover:text-hud-strong">
            auswählen
          </button>
        </p>
        <p className={`hud-label text-[9px] sm:ml-auto ${disabled ? "text-warn" : "text-faint"}`}>
          {disabled ? "Speicher nicht verbunden" : hint}
        </p>
      </div>
      {uploads.length ? (
        <ul className="mt-3 space-y-1.5">
          {uploads.map((u) => (
            <li key={u.name} className="text-[13px]">
              <span className="flex justify-between text-muted">
                <span className="truncate">{u.name}</span>
                <span className="font-display font-semibold text-hud">{Math.round(u.pct)}%</span>
              </span>
              <span className="mt-1 block h-[2px] bg-line">
                <span className="block h-full bg-hud shadow-[0_0_8px_#5ce1ff] transition-[width]" style={{ width: `${u.pct}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
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

/* ---------- Liste ---------- */

function FileIcon({ type }: { type: string }) {
  const props = { size: 17, strokeWidth: 1.5, className: "shrink-0 text-hud-dim", "aria-hidden": true } as const;
  if (type.startsWith("image/")) return <FileImage {...props} />;
  if (type.includes("sheet") || type.includes("excel") || type === "text/csv") return <FileSpreadsheet {...props} />;
  if (type === "application/pdf" || type.includes("word") || type.startsWith("text/")) return <FileText {...props} />;
  return <File {...props} />;
}

type Op = { kind: "move"; id: string; folderId: string | null } | { kind: "delete"; id: string };

export function useDocs(initial: Doc[], onMessage: (m: string) => void) {
  const [docs, apply] = useOptimistic(initial, (state: Doc[], op: Op) =>
    op.kind === "delete" ? state.filter((d) => d.id !== op.id) : state.map((d) => (d.id === op.id ? { ...d, folderId: op.folderId } : d)),
  );
  const [, start] = useTransition();
  const run = (op: Op, success?: string) =>
    start(async () => {
      apply(op);
      const res = op.kind === "delete" ? await deleteDocument(op.id) : await moveDocument(op.id, op.folderId);
      if ("error" in res) onMessage(res.error);
      else if (success) onMessage(success);
    });
  return { docs, run };
}

export function DocList({
  docs,
  folders,
  today,
  showSubject = true,
  onMove,
  onDelete,
  empty,
}: {
  docs: Doc[];
  folders?: Folder[];
  today: string;
  showSubject?: boolean;
  onMove?: (id: string, folderId: string | null) => void;
  onDelete: (id: string) => void;
  empty: React.ReactNode;
}) {
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!docs.length) return <Empty>{empty}</Empty>;

  return (
    <ul>
      {docs.map((d) => {
        const age = diffDays(d.uploaded, today);
        const when = age === 0 ? "Heute" : age === 1 ? "Gestern" : formatShort(d.uploaded);
        return (
          <li
            key={d.id}
            draggable={!!onMove}
            onDragStart={(e) => {
              e.dataTransfer.setData(DOC_DRAG_TYPE, d.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line/70 py-2.5 last:border-b-0 ${onMove ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <FileIcon type={d.contentType} />
            <span className="min-w-0">
              <a href={`/api/files/${d.id}`} target="_blank" rel="noopener" className="block truncate text-ink hover:text-hud-strong hover:underline hover:decoration-hud/40 hover:underline-offset-4">
                {d.name}
              </a>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-3 font-display text-[12px] font-semibold tracking-wider text-faint">
                {showSubject ? <SubjectTag subject={d.subject} /> : null}
                <span>{formatSize(d.sizeBytes)}</span>
                <span>{when}</span>
                {onMove && folders ? (
                  <span className="flex items-center gap-1.5">
                    <FolderGlyph size={13} />
                    <select
                      value={d.folderId ?? ""}
                      onChange={(e) => onMove(d.id, e.target.value || null)}
                      aria-label={`Ordner für ${d.name}`}
                      className="max-w-[10rem] cursor-pointer truncate bg-transparent py-0.5 font-display text-[12px] font-semibold tracking-wider text-muted hover:text-hud focus:text-hud"
                    >
                      <option value="">Kein Ordner</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </span>
                ) : null}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {confirm === d.id ? (
                <>
                  <button type="button" onClick={() => setConfirm(null)} className="hud-label text-[10px] text-faint hover:text-ink">Nein</button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirm(null);
                      onDelete(d.id);
                    }}
                    className="hud-label text-[10px] text-alert"
                  >
                    Löschen
                  </button>
                </>
              ) : (
                <>
                  <a href={`/api/files/${d.id}?download=1`} aria-label={`${d.name} herunterladen`} className="text-faint hover:text-hud">
                    <Download size={15} aria-hidden />
                  </a>
                  <button type="button" onClick={() => setConfirm(d.id)} aria-label={`${d.name} löschen`} className="text-faint hover:text-alert md:opacity-0 md:group-hover:opacity-100">
                    <Trash2 size={15} aria-hidden />
                  </button>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Kurze Meldungen ---------- */

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  };
  return { message, show };
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-5 transition-all duration-200 md:bottom-8 md:left-[88px] ${
        message ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      {message ? (
        <span className="hud-cut max-w-md truncate border border-hud/50 bg-void/95 px-4 py-2.5 text-[14px] text-hud-strong shadow-[0_0_24px_rgba(92,225,255,0.25)]">
          {message}
        </span>
      ) : null}
    </div>
  );
}
