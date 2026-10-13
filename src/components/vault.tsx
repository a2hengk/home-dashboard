import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NotebookPen } from "lucide-react";
import type { NoteMeta, VaultFolder } from "@/lib/vault";
import { vaultHref as vaultLink } from "@/lib/vault-links";
import { FolderGlyph } from "./folder";
import { Empty } from "./hud";

// Nur Server-Komponenten: Markdown wird auf dem Server gerendert, im Browser landet nur HTML.

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

/* ---------- Markdown im Obsidian-Dialekt ---------- */

const IMG = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const esc = (s: string) => s.replace(/[[\]\\]/g, "\\$&");

/**
 * Obsidian-Syntax in normales Markdown übersetzen:
 * [[Ziel|Text]], [[Ziel#Abschnitt]], ![[bild.png]], Callouts, ==Markierung==, %%Kommentare%%.
 * Codeblöcke bleiben unangetastet.
 */
export function obsidianToMarkdown(md: string, links: Record<string, string>) {
  return md
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => {
      if (i % 2) return part;
      return part
        .replace(/%%[\s\S]*?%%/g, "")
        .replace(/!\[\[([^\]|#\n]+)(?:#[^\]|\n]*)?(?:\|([^\]\n]*))?\]\]/g, (_, target: string, opt?: string) => {
          const url = links[target.trim().toLowerCase()];
          const name = target.trim().split("/").at(-1)!;
          if (url && IMG.test(target.trim())) return `![${esc(opt && !/^\d+(x\d+)?$/.test(opt) ? opt : name)}](${url})`;
          if (url) return `[📎 ${esc(name.replace(/\.md$/i, ""))}](${url})`;
          return `[${esc(name)}](#fehlt)`;
        })
        .replace(/\[\[([^\]|#\n]+)(#[^\]|\n]*)?(?:\|([^\]\n]+))?\]\]/g, (_, target: string, anchor?: string, label?: string) => {
          const url = links[target.trim().toLowerCase()];
          const text = esc((label ?? `${target.trim()}${anchor ? ` › ${anchor.slice(1)}` : ""}`).trim());
          return url ? `[${text}](${url})` : `[${text}](#fehlt)`;
        })
        .replace(/^(\s*>\s*)\[!(\w+)\][+-]?\s*(.*)$/gm, (_, q: string, type: string, title: string) => `${q}**${title || type[0].toUpperCase() + type.slice(1)}**`)
        .replace(/==([^=\n]+)==/g, "**$1**");
    })
    .join("");
}

export function VaultMarkdown({ source, links }: { source: string; links: Record<string, string> }) {
  return (
    <div className="note-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href = "", children }) => {
            if (href === "#fehlt")
              return (
                <span title="Diese Notiz gibt es noch nicht" className="cursor-help text-warn underline decoration-dashed decoration-warn/60 underline-offset-4">
                  {children}
                </span>
              );
            if (href.startsWith("/api/")) return <a href={href} target="_blank" rel="noopener">{children}</a>;
            if (href.startsWith("/")) return <Link href={href}>{children}</Link>;
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          // eslint-disable-next-line @next/next/no-img-element -- Bilder kommen privat aus dem Vault, kein next/image nötig
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />,
        }}
      >
        {obsidianToMarkdown(source, links)}
      </ReactMarkdown>
    </div>
  );
}

/* ---------- Hinweis, wenn der Vault noch nicht verbunden ist ---------- */

export function VaultSetupHint({ error }: { error?: string }) {
  return (
    <div role="status" className="border border-warn/50 bg-warn/10 px-4 py-3 text-[14px] text-warn">
      {error ? (
        <p>Obsidian-Vault: {error}</p>
      ) : (
        <>
          <p>Obsidian-Vault noch nicht verbunden.</p>
          <p className="mt-1 text-[13px] text-warn/80">
            Vercel → home-dashboard → Settings → Environment Variables → <code>VAULT_GITHUB_TOKEN</code> setzen (Token nur für das Vault-Repo, „Contents: Read-only“), dann neu deployen.
          </p>
        </>
      )}
    </div>
  );
}
