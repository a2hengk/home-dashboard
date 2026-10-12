"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { ChevronLeft, Eye, Link2, PenLine, Trash2 } from "lucide-react";
import { deleteNote, moveNote, saveNote } from "@/app/actions";
import { formatShort } from "@/lib/dates";
import type { Folder, Note } from "@/lib/types";
import { FolderGlyph } from "./folder";
import { SubjectTag, fieldClass } from "./hud";
import { Markdown, noteHref, useNewNote } from "./notes";
import { Toast, useToast } from "./files";

type Status = "saved" | "dirty" | "saving" | "error";
const statusText: Record<Status, string> = {
  saved: "Gespeichert",
  dirty: "Ungespeichert",
  saving: "Speichert…",
  error: "Fehler beim Speichern",
};

export function NoteEditor({
  note,
  folders,
  titles,
  backlinks,
  fresh,
}: {
  note: Note;
  folders: Folder[];
  titles: { id: string; title: string }[];
  backlinks: { id: string; title: string }[];
  fresh: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const newNote = useNewNote(toast.show);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [folderId, setFolderId] = useState(note.folderId);
  const [mode, setMode] = useState<"schreiben" | "lesen">(fresh || !note.body.trim() ? "schreiben" : "lesen");
  const [status, setStatus] = useState<Status>("saved");
  const [confirm, setConfirm] = useState(false);
  const [, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  // Eigene ids pro Editor: Next hält die vorige Seite beim Zurückspringen versteckt im DOM
  const uid = useId();

  // Letzter Stand für Speichern beim Verlassen
  const latest = useRef({ title, body, dirty: false });
  useEffect(() => {
    latest.current = { title, body, dirty: status === "dirty" || status === "error" };
  }, [title, body, status]);

  const back = folderId ? `/ablage?ordner=${folderId}` : "/ablage";
  const folder = folders.find((f) => f.id === folderId);

  const show = useRef(toast.show);
  useEffect(() => {
    show.current = toast.show;
  });

  const save = useCallback(async () => {
    const { title: t, body: b } = latest.current;
    if (!t.trim()) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const res = await saveNote(note.id, { title: t, body: b });
    // Während des Speicherns weitergetippt? Dann bleibt es "dirty" und der Timer speichert gleich nochmal
    setStatus((s) => ("error" in res ? "error" : s === "saving" ? "saved" : s));
    if ("error" in res) show.current(res.error);
  }, [note.id]);

  // Automatisch speichern, kurz nachdem du aufhörst zu tippen
  useEffect(() => {
    if (status !== "dirty") return;
    const timer = setTimeout(save, 900);
    return () => clearTimeout(timer);
  }, [status, title, body, save]);

  // Beim Verlassen der Seite nichts verlieren
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current.dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      const { title: t, body: b, dirty } = latest.current;
      if (dirty && t.trim()) void saveNote(note.id, { title: t, body: b });
    };
  }, [note.id]);

  useEffect(() => {
    if (fresh) titleRef.current?.select();
  }, [fresh]);

  const edit = (patch: { title?: string; body?: string }) => {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.body !== undefined) setBody(patch.body);
    setStatus("dirty");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void save();
    } else if (mod && e.key.toLowerCase() === "e") {
      e.preventDefault();
      setMode((m) => (m === "lesen" ? "schreiben" : "lesen"));
    }
  };

  const onTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    const next = body.slice(0, a) + "  " + body.slice(b);
    edit({ body: next });
    requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
  };

  const preview = (
    <Markdown source={body || "_Noch leer._"} titles={titles} onCreateMissing={(t) => newNote.create({ title: t, folderId, subjectId: note.subject?.id })} />
  );

  return (
    <div onKeyDown={onKeyDown}>
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={back} className="hud-label inline-flex items-center gap-1 text-[11px] text-hud-dim hover:text-hud">
          <ChevronLeft size={14} aria-hidden /> {folder ? folder.name : "Ablage"}
        </Link>
        <span
          role="status"
          className={`hud-label ml-auto text-[10px] ${status === "error" ? "text-alert" : status === "saved" ? "text-ok" : "text-warn"}`}
        >
          ● {statusText[status]}
        </span>
      </div>

      <label htmlFor={`${uid}-title`} className="sr-only">Titel</label>
      <input
        id={`${uid}-title`}
        ref={titleRef}
        value={title}
        onChange={(e) => edit({ title: e.target.value })}
        maxLength={160}
        placeholder="Titel"
        className="glow w-full bg-transparent font-display text-[34px] font-bold uppercase leading-tight tracking-[0.05em] text-hud-strong placeholder:text-faint focus:outline-none sm:text-[42px]"
      />

      <div className="mt-2 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-3 font-display text-[13px] font-semibold tracking-wider text-faint">
        <span className="flex items-center gap-1.5">
          <FolderGlyph size={13} color={folder?.subject?.farbe} />
          <select
            value={folderId ?? ""}
            onChange={(e) => {
              const next = e.target.value || null;
              setFolderId(next);
              start(async () => {
                const res = await moveNote(note.id, next);
                if ("error" in res) toast.show(res.error);
              });
            }}
            aria-label="Ordner"
            className="cursor-pointer bg-transparent py-0.5 text-muted hover:text-hud focus:text-hud"
          >
            <option value="">Kein Ordner</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </span>
        <SubjectTag subject={note.subject} />
        <span>Geändert {formatShort(note.updated)}</span>

        <span className="ml-auto flex items-center gap-1" role="tablist" aria-label="Ansicht">
          {(["schreiben", "lesen"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`hud-cut inline-flex items-center gap-1.5 px-3 py-1 text-[12px] uppercase tracking-[0.14em] ring-1 ring-inset ${
                mode === m ? "bg-hud/15 text-hud-strong ring-hud/60" : "text-muted ring-line hover:text-ink"
              }`}
            >
              {m === "schreiben" ? <PenLine size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
              {m === "schreiben" ? "Schreiben" : "Lesen"}
            </button>
          ))}
        </span>
      </div>

      {mode === "schreiben" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-body`} className="sr-only">Text in Markdown</label>
            <textarea
              id={`${uid}-body`}
              autoFocus={!fresh}
              value={body}
              onChange={(e) => edit({ body: e.target.value })}
              onKeyDown={onTab}
              spellCheck
              placeholder={"# Überschrift\n\nEinfach losschreiben. **fett**, - Liste, - [ ] Aufgabe, `Code`\n\n[[Andere Notiz]] verlinkt eine Notiz."}
              className={`${fieldClass} min-h-[55vh] resize-y font-mono text-[14px] leading-relaxed [field-sizing:content]`}
            />
            <p className="hud-label mt-2 text-[9px] text-faint">
              Markdown · [[Titel]] verlinkt Notizen · Strg+S speichert · Strg+E wechselt zur Leseansicht
            </p>
          </div>
          <div aria-label="Vorschau" className="hidden border-l border-line pl-6 lg:block">
            <p className="hud-label mb-3 text-[10px] text-faint">Vorschau</p>
            {preview}
          </div>
        </div>
      ) : (
        <article onDoubleClick={() => setMode("schreiben")} className="max-w-3xl">
          {preview}
        </article>
      )}

      {backlinks.length ? (
        <section className="mt-10 border-t border-line pt-4" aria-labelledby={`${uid}-backlinks`}>
          <h2 id={`${uid}-backlinks`} className="hud-label mb-2 flex items-center gap-1.5 text-[11px] text-hud">
            <Link2 size={13} aria-hidden /> Verlinkt von
          </h2>
          <ul className="flex flex-wrap gap-2">
            {backlinks.map((b) => (
              <li key={b.id}>
                <Link href={noteHref(b.id)} className="hud-cut inline-block px-3 py-1 text-[13px] text-muted ring-1 ring-inset ring-line hover:text-hud-strong hover:ring-hud/60">
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-12 flex justify-end gap-3">
        {confirm ? (
          <>
            <button type="button" onClick={() => setConfirm(false)} className="hud-label text-[10px] text-faint hover:text-ink">Nein</button>
            <button
              type="button"
              onClick={() =>
                start(async () => {
                  latest.current.dirty = false;
                  setStatus("saved");
                  const res = await deleteNote(note.id);
                  if ("error" in res) return toast.show(res.error);
                  router.replace(back);
                  router.refresh();
                })
              }
              className="hud-label text-[10px] text-alert"
            >
              Notiz endgültig löschen
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="hud-label inline-flex items-center gap-1.5 text-[10px] text-faint hover:text-alert">
            <Trash2 size={13} aria-hidden /> Notiz löschen
          </button>
        )}
      </div>
      <Toast message={toast.message} />
    </div>
  );
}
