import type { Metadata } from "next";
import { Suspense } from "react";
import { todayISO } from "@/lib/dates";
import { getDocs, getFolders, getSubjects } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { formatSize } from "@/lib/types";
import { AblageView } from "@/components/ablage-view";
import { getVault, matchFolder, meta, notesIn } from "@/lib/vault";
import { obsidianHref, vaultHref } from "@/lib/vault-links";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { VaultSetupHint } from "@/components/vault";
import { PageSkeleton, PageTitle } from "@/components/hud";

export const metadata: Metadata = { title: "Ablage" };

export default function AblagePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Ablage />
    </Suspense>
  );
}

async function Ablage() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const today = todayISO();
  const [docs, folders, subjects, vault] = await Promise.all([getDocs(), getFolders(), getSubjects(), getVault()]);
  const total = docs.reduce((s, d) => s + d.sizeBytes, 0);
  const storage = storageMode();
  // Jeder Ablage-Ordner bekommt den Vault-Ordner mit gleichem Namen (BFK0 -> Schule/BFK0)
  const vaultByFolder =
    vault.status === "ok"
      ? Object.fromEntries(
          folders.flatMap((f) => {
            const path = matchFolder(vault.vault, [f.name, f.subject?.kuerzel, f.subject?.name.split(" - ")[0]]);
            return path ? [[f.id, { path, notes: notesIn(vault.vault, path) }]] : [];
          }),
        )
      : {};

  return (
    <>
      <PageTitle kicker="Modul // Archiv" title="Ablage">
        {docs.length} {docs.length === 1 ? "Datei" : "Dateien"} in {folders.length} {folders.length === 1 ? "Ordner" : "Ordnern"}, zusammen {formatSize(total)}. Privat gespeichert, nur mit Login abrufbar.
      </PageTitle>
      {!storage ? (
        <p role="alert" className="mb-6 border border-warn/50 bg-warn/10 px-4 py-3 text-[14px] text-warn">
          Dateispeicher noch nicht verbunden: Vercel → home-dashboard → Storage → Create → Blob (Private) → mit dem Projekt verbinden, dann neu deployen.
        </p>
      ) : null}
      <AblageView
        docs={docs}
        folders={folders}
        subjects={subjects}
        today={today}
        storage={storage}
        vaultNotes={vault.status === "ok" ? [...vault.vault.notes.values()].map(meta) : []}
        vaultName={vault.status === "ok" ? vault.name : null}
        vaultByFolder={vaultByFolder}
        vaultSlot={<VaultLine state={vault} matched={Object.values(vaultByFolder).map((m) => m.path)} />}
      />
    </>
  );
}

/**
 * Kleine Zeile unter den Ordnern: Obsidian verbunden, wie viele Notizen,
 * und welche Vault-Ordner (noch) keinen Ablage-Ordner haben.
 */
function VaultLine({ state, matched }: { state: Awaited<ReturnType<typeof getVault>>; matched: string[] }) {
  if (state.status !== "ok") return <div className="mt-5"><VaultSetupHint error={state.status === "error" ? state.message : undefined} /></div>;
  const v = state.vault;
  const covered = (p: string) => matched.some((m) => p === m || p.startsWith(`${m}/`) || m.startsWith(`${p}/`));
  // Oberste Vault-Ordner mit Notizen, die zu keinem Ablage-Ordner gehören
  const orphans = [...v.folders.values()]
    .filter((f) => f.notes > 0 && !covered(f.path) && !matched.some((m) => f.path.startsWith(`${m}/`)))
    .filter((f, _, all) => !all.some((o) => o !== f && f.path.startsWith(`${o.path}/`)))
    .sort((a, b) => a.path.localeCompare(b.path, "de"));
  return (
    <p className="hud-label mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-faint">
      <span className="inline-flex items-center gap-1.5 text-ok">
        <span aria-hidden className="size-1.5 rounded-full bg-ok shadow-[0_0_6px_#4cf0a6]" /> Obsidian verbunden
      </span>
      <span>{v.notes.size} Notizen</span>
      {orphans.length ? (
        <span>
          Nur in Obsidian:{" "}
          {orphans.map((f, i) => (
            <span key={f.path}>
              {i ? ", " : ""}
              <Link href={vaultHref(f.path)} className="text-hud-dim hover:text-hud">{f.path}</Link>
            </span>
          ))}
        </span>
      ) : null}
      <Link href="/ablage/vault" className="text-hud-dim hover:text-hud">Ganzer Vault</Link>
      <a href={obsidianHref(state.name, "")} className="inline-flex items-center gap-1 text-hud-dim hover:text-hud">
        <ExternalLink size={11} aria-hidden /> Obsidian öffnen
      </a>
    </p>
  );
}
