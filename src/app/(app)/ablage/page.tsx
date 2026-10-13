import type { Metadata } from "next";
import { Suspense } from "react";
import { todayISO } from "@/lib/dates";
import { getDocs, getFolders, getSubjects } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { formatSize } from "@/lib/types";
import { AblageView } from "@/components/ablage-view";
import { getVault, matchFolder, meta, notesIn } from "@/lib/vault";
import { obsidianHref } from "@/lib/vault-links";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { VaultFolderGrid, VaultSetupHint } from "@/components/vault";
import { HudPanel, PageSkeleton, PageTitle } from "@/components/hud";

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
        vaultByFolder={
          vault.status === "ok"
            ? Object.fromEntries(
                folders.flatMap((f) => {
                  const path = matchFolder(vault.vault, [f.name, f.subject?.kuerzel, f.subject?.name.split(" - ")[0]]);
                  return path ? [[f.id, { path, notes: notesIn(vault.vault, path) }]] : [];
                }),
              )
            : {}
        }
        vaultSlot={<VaultPanel state={vault} />}
      />
    </>
  );
}

/** Obsidian-Vault in der Übersicht: oberste Ordner, Link zum Vault */
function VaultPanel({ state }: { state: Awaited<ReturnType<typeof getVault>> }) {
  if (state.status !== "ok") return <VaultSetupHint error={state.status === "error" ? state.message : undefined} />;
  const v = state.vault;
  const top = [...v.folders.values()].filter((f) => f.parent === "").sort((a, b) => a.name.localeCompare(b.name, "de"));
  const loose = [...v.notes.values()].filter((n) => !n.folder).length;
  return (
    <HudPanel
      label="Obsidian"
      code={`MD-${String(v.notes.size).padStart(2, "0")}`}
      action={
        <a href={obsidianHref(state.name, "")} className="hud-label inline-flex items-center gap-1 text-[10px] text-faint hover:text-hud">
          <ExternalLink size={12} aria-hidden /> Öffnen
        </a>
      }
    >
      <VaultFolderGrid folders={top} />
      <p className="mt-3 text-[13px] text-muted">
        {v.notes.size} Notizen aus deinem Vault{loose ? `, ${loose} davon ohne Ordner` : ""}.{" "}
        <Link href="/ablage/vault" className="text-hud underline decoration-hud/40 underline-offset-4 hover:text-hud-strong">Ganzen Vault ansehen</Link>
      </p>
    </HudPanel>
  );
}
