import type { Metadata } from "next";
import { Suspense } from "react";
import { todayISO } from "@/lib/dates";
import { getDocs, getFolders, getSubjects } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { formatSize } from "@/lib/types";
import { AblageView } from "@/components/ablage-view";
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
  const [docs, folders, subjects] = await Promise.all([getDocs(), getFolders(), getSubjects()]);
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
      <AblageView docs={docs} folders={folders} subjects={subjects} today={today} storage={storage} />
    </>
  );
}
