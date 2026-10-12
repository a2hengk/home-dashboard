"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { NotebookPen, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createNote } from "@/app/actions";
import { diffDays, formatShort } from "@/lib/dates";
import type { Folder, NoteMeta } from "@/lib/types";
import { NOTE_DRAG_TYPE } from "./folder";
import { Empty, SubjectTag, buttonClass } from "./hud";

export const noteHref = (id: string) => `/ablage/notiz/${id}`;

/** Legt eine leere Notiz an und öffnet sie direkt im Editor */
export function useNewNote(onError: (m: string) => void) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const create = (target: { title?: string; folderId?: string | null; subjectId?: string | null } = {}) =>
    start(async () => {
      const res = await createNote(target);
      if ("error" in res) onError(res.error);
      else router.push(`${noteHref(res.id)}?neu=1`);
    });
  return { create, pending };
}

export function NewNoteButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className={`${buttonClass("ghost")} !px-3 !py-1 !text-[11px]`}>
      <Plus size={13} aria-hidden /> Notiz
    </button>
  );
}

export function NoteList({
  notes,
  folders,
  today,
  empty,
  showFolder = false,
}: {
  notes: NoteMeta[];
  folders?: Folder[];
  today: string;
  empty: React.ReactNode;
  showFolder?: boolean;
}) {
  if (!notes.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((n) => {
        const age = diffDays(n.updated, today);
        const when = age === 0 ? "Heute" : age === 1 ? "Gestern" : formatShort(n.updated);
        const folder = showFolder ? folders?.find((f) => f.id === n.folderId) : undefined;
        return (
          <li
            key={n.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(NOTE_DRAG_TYPE, n.id);
              e.dataTransfer.effectAllowed = "move";
            }}
          >
            <Link
              href={noteHref(n.id)}
              className="hud-cut group flex h-full flex-col border border-line bg-[rgba(2,10,16,0.55)] px-4 py-3 transition-colors hover:border-hud/60 hover:bg-hud/5"
            >
              <span className="flex items-center gap-2">
                <NotebookPen size={15} strokeWidth={1.5} className="shrink-0 text-hud-dim group-hover:text-hud" aria-hidden />
                <span className="truncate font-display text-[16px] font-bold tracking-wide text-ink group-hover:text-hud-strong">{n.title}</span>
              </span>
              <span className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13px] leading-[1.3] text-muted">
                {n.excerpt || <span className="text-faint">Noch leer</span>}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 font-display text-[12px] font-semibold tracking-wider text-faint">
                <SubjectTag subject={n.subject} />
                {folder ? <span className="truncate">▸ {folder.name}</span> : null}
                <span className="ml-auto">{when}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Markdown ---------- */

const escapeLabel = (s: string) => s.replace(/[[\]\\]/g, "\\$&");

/**
 * [[Titel]] und [[Titel|Text]] werden zu Links auf die passende Notiz.
 * Gibt es die Notiz noch nicht, wird ein "#neu:" Link draus, der sie beim Klick anlegt.
 * Codeblöcke und Inline-Code bleiben unangetastet.
 */
export function linkWikiRefs(md: string, titles: { id: string; title: string }[]) {
  const byTitle = new Map(titles.map((n) => [n.title.trim().toLowerCase(), n.id]));
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (_, target: string, label?: string) => {
            const id = byTitle.get(target.trim().toLowerCase());
            const text = escapeLabel((label ?? target).trim());
            return id ? `[${text}](${noteHref(id)})` : `[${text}](#neu:${encodeURIComponent(target.trim())})`;
          }),
    )
    .join("");
}

export function Markdown({
  source,
  titles,
  onCreateMissing,
}: {
  source: string;
  titles: { id: string; title: string }[];
  onCreateMissing: (title: string) => void;
}) {
  return (
    <div className="note-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children }) => {
            if (href.startsWith("#neu:")) {
              const title = decodeURIComponent(href.slice(5));
              return (
                <button
                  type="button"
                  onClick={() => onCreateMissing(title)}
                  title={`Notiz „${title}“ anlegen`}
                  className="text-warn underline decoration-dashed decoration-warn/60 underline-offset-4 hover:text-ink"
                >
                  {children}
                </button>
              );
            }
            if (href.startsWith("/")) return <Link href={href}>{children}</Link>;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {linkWikiRefs(source, titles)}
      </ReactMarkdown>
    </div>
  );
}
