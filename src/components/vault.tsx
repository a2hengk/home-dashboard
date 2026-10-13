import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Nur Server-Komponenten: Markdown wird auf dem Server gerendert, im Browser landet nur HTML.

export { VaultFolderGrid, VaultNoteList } from "./vault-lists";

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
