import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { todayISO } from "@/lib/dates";
import { folders, getDocs } from "@/lib/sample-data";
import { AblageView } from "@/components/ablage-view";
import { PageSkeleton } from "@/components/ui";

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

  return (
    <div className="max-w-5xl">
      <AblageView initial={getDocs(today)} initialFolders={folders} today={today} />
    </div>
  );
}
