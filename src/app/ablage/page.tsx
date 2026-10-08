import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { todayISO } from "@/lib/dates";
import { formatSize, getDocs } from "@/lib/sample-data";
import { AblageView } from "@/components/ablage-view";
import { PageHeader, PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Ablage" };

export default function AblagePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Ablage />
    </Suspense>
  );
}

async function Ablage() {
  await connection();
  const today = todayISO();
  const docs = getDocs(today);
  const total = docs.reduce((s, d) => s + d.sizeBytes, 0);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Ablage">
        {docs.length} Dokumente, zusammen {formatSize(total)}. Nur für dich sichtbar.
      </PageHeader>
      <AblageView initial={docs} today={today} />
    </div>
  );
}
