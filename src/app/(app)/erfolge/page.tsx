import type { Metadata } from "next";
import { Suspense } from "react";
import { todayISO } from "@/lib/dates";
import { getAchievements } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { AchievementsView } from "@/components/achievements";
import { PageSkeleton } from "@/components/hud";

export const metadata: Metadata = { title: "Erfolge" };

export default function ErfolgePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Erfolge />
    </Suspense>
  );
}

async function Erfolge() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const items = await getAchievements();
  return <AchievementsView items={items} today={todayISO()} />;
}
