import Link from "next/link";
import { NotebookPen } from "lucide-react";
import type { NoteMeta, VaultFolder } from "@/lib/vault";
import { vaultHref as vaultLink } from "@/lib/vault-links";
import { FolderGlyph } from "./folder";
import { Empty } from "./hud";

// Ohne Markdown-Renderer, damit Server und Browser diese Listen nutzen können

/* ---------- Ordner & Notizen ---------- */

export function VaultFolderGrid({ folders: all, color = "#b39dff" }: { folders: VaultFolder[]; color?: string }) {
  // Ordner ohne Notizen (z.b. Anhänge) nicht als Kachel zeigen
  const folders = all.filter((f) => f.notes > 0);
  if (!folders.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {folders.map((f) => (
        <li key={f.path}>
          <Link
            href={vaultLink(f.path)}
            className="hud-cut group flex h-full items-center gap-3 border border-line bg-[rgba(2,10,16,0.55)] px-3.5 py-3 transition-colors hover:border-hud/60 hover:bg-hud/5"
          >
            <FolderGlyph size={22} color={color} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[15px] font-bold uppercase tracking-wider text-ink group-hover:text-hud-strong">{f.name}</span>
              <span className="hud-label block text-[9px] text-faint">
                {f.notes} {f.notes === 1 ? "Notiz" : "Notizen"}
                {f.folders ? ` · ${f.folders} Ordner` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function VaultNoteList({ notes, showFolder = false, empty }: { notes: NoteMeta[]; showFolder?: boolean; empty: React.ReactNode }) {
  if (!notes.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((n) => (
        <li key={n.path}>
          <Link
            href={vaultLink(n.path)}
            className="hud-cut group flex h-full flex-col border border-line bg-[rgba(2,10,16,0.55)] px-4 py-3 transition-colors hover:border-hud/60 hover:bg-hud/5"
          >
            <span className="flex items-center gap-2">
              <NotebookPen size={15} strokeWidth={1.5} className="shrink-0 text-hud-dim group-hover:text-hud" aria-hidden />
              <span className="truncate font-display text-[16px] font-bold tracking-wide text-ink group-hover:text-hud-strong">{n.title}</span>
            </span>
            <span className="mt-1.5 line-clamp-2 min-h-[2.6em] text-[13px] leading-[1.3] text-muted">
              {n.excerpt || <span className="text-faint">Noch leer</span>}
            </span>
            {showFolder || n.tags.length ? (
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-[12px] font-semibold tracking-wider text-faint">
                {showFolder && n.folder ? <span className="truncate">▸ {n.folder}</span> : null}
                {n.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-hud-dim">#{t}</span>
                ))}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

