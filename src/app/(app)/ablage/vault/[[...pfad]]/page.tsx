import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, Link2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getVault, linkTable, meta, type Vault } from "@/lib/vault";
import { obsidianHref, vaultHref } from "@/lib/vault-links";
import { HudPanel, PageSkeleton, PageTitle, buttonClass } from "@/components/hud";
import { VaultFolderGrid, VaultMarkdown, VaultNoteList, VaultSetupHint } from "@/components/vault";

export const metadata: Metadata = { title: "Obsidian" };

export default function VaultPage({ params }: PageProps<"/ablage/vault/[[...pfad]]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VaultView params={params} />
    </Suspense>
  );
}

function safeDecode(p: string) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

const sortDe = (a: string, b: string) => a.localeCompare(b, "de", { numeric: true });

async function VaultView({ params }: { params: Promise<{ pfad?: string[] }> }) {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const { pfad = [] } = await params;
  const path = pfad.map(safeDecode).join("/");
  const state = await getVault();

  if (state.status !== "ok") {
    return (
      <>
        <Back href="/ablage" label="Ablage" />
        <PageTitle kicker="Modul // Obsidian" title="Vault" />
        <VaultSetupHint error={state.status === "error" ? state.message : undefined} />
      </>
    );
  }

  const v = state.vault;
  const note = v.notes.get(`${path}.md`);
  if (note) return <NoteView vault={v} path={note.path} name={state.name} />;
  if (path && !v.folders.has(path)) notFound();

  const folders = [...v.folders.values()].filter((f) => f.parent === path).sort((a, b) => sortDe(a.name, b.name));
  // Ordner-Notiz (Schule/LF5/LF5.md) zuerst, sonst alphabetisch
  const own = path.split("/").at(-1);
  const notes = [...v.notes.values()]
    .filter((n) => n.folder === path)
    .sort((a, b) => (a.title === own ? -1 : b.title === own ? 1 : sortDe(a.title, b.title)))
    .map(meta);
  const parent = path ? path.split("/").slice(0, -1).join("/") : null;

  return (
    <>
      <Back href={parent === null ? "/ablage" : parent ? vaultHref(parent) : "/ablage/vault"} label={parent === null ? "Ablage" : parent || "Vault"} />
      <PageTitle kicker={`Obsidian // ${path || "Vault"}`} title={own ?? "Vault"}>
        {v.notes.size} Notizen im Vault. Schreiben und Bearbeiten in Obsidian, hier zum Nachschlagen. Aktuell bis zum letzten Sync.
      </PageTitle>
      <div className="mb-6 flex flex-wrap gap-3">
        <a href={obsidianHref(state.name, path)} className={buttonClass("ghost")}>
          <ExternalLink size={14} aria-hidden /> In Obsidian öffnen
        </a>
      </div>
      {folders.length ? (
        <section className="mb-8" aria-label="Ordner">
          <VaultFolderGrid folders={folders} />
        </section>
      ) : null}
      <HudPanel label="Notizen" code={`MD-${String(notes.length).padStart(2, "0")}`}>
        <VaultNoteList notes={notes} empty="In diesem Ordner liegen noch keine Notizen. In Obsidian anlegen, nach dem nächsten Sync tauchen sie hier auf." />
      </HudPanel>
    </>
  );
}

function NoteView({ vault: v, path, name }: { vault: Vault; path: string; name: string }) {
  const n = v.notes.get(path)!;
  const back = (v.backlinks.get(path) ?? []).map((p) => v.notes.get(p)!).sort((a, b) => sortDe(a.title, b.title));
  return (
    <>
      <Back href={n.folder ? vaultHref(n.folder) : "/ablage/vault"} label={n.folder || "Vault"} />
      <header className="mb-6 border-b border-line pb-4">
        <p className="hud-label text-[11px] text-hud-dim">Obsidian // {n.folder || "Vault"}</p>
        <h1 className="glow mt-1 font-display text-[34px] font-bold uppercase leading-tight tracking-[0.05em] text-hud-strong sm:text-[42px]">{n.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {n.tags.map((t) => (
            <span key={t} className="font-display text-[13px] font-semibold tracking-wider text-hud-dim">#{t}</span>
          ))}
          {Object.entries(n.props)
            .filter(([k]) => k !== "tags")
            .map(([k, val]) => (
              <span key={k} className="font-display text-[13px] font-semibold tracking-wider text-faint">
                {k}: <span className="text-muted">{val}</span>
              </span>
            ))}
          <a href={obsidianHref(name, path)} className={`${buttonClass("ghost")} ml-auto !px-3 !py-1 !text-[11px]`}>
            <ExternalLink size={13} aria-hidden /> In Obsidian bearbeiten
          </a>
        </div>
      </header>

      <article className="max-w-3xl">
        <VaultMarkdown source={n.body.trim() || "_Noch leer._"} links={linkTable(v, n.body)} />
      </article>

      {back.length ? (
        <section className="mt-10 border-t border-line pt-4" aria-labelledby="backlinks">
          <h2 id="backlinks" className="hud-label mb-2 flex items-center gap-1.5 text-[11px] text-hud">
            <Link2 size={13} aria-hidden /> Verlinkt von
          </h2>
          <ul className="flex flex-wrap gap-2">
            {back.map((b) => (
              <li key={b.path}>
                <Link href={vaultHref(b.path)} className="hud-cut inline-block px-3 py-1 text-[13px] text-muted ring-1 ring-inset ring-line hover:text-hud-strong hover:ring-hud/60">
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="hud-label mb-6 inline-flex items-center gap-1 text-[11px] text-hud-dim hover:text-hud">
      <ChevronLeft size={14} aria-hidden /> {label}
    </Link>
  );
}
