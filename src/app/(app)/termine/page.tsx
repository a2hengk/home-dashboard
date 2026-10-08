import type { Metadata } from "next";
import { Suspense } from "react";
import { addDays, todayISO } from "@/lib/dates";
import { getEvents, getSubjects } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { EventForm, EventList } from "@/components/events";
import { HudPanel, PageSkeleton, PageTitle } from "@/components/hud";

export const metadata: Metadata = { title: "Termine" };

export default function TerminePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Termine />
    </Suspense>
  );
}

async function Termine() {
  // Auth-Prüfung hier und nicht nur im Layout: Seite und Layout rendern parallel
  await requireUser();
  const today = todayISO();
  const [events, subjects] = await Promise.all([getEvents({ from: addDays(today, -30) }), getSubjects()]);
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today).reverse();

  return (
    <div className="max-w-4xl">
      <PageTitle kicker="Modul // Kalender" title="Termine">
        Prüfungen, Abgaben und private Termine. Was du als wichtig markierst, leuchtet in der Zeitleiste auf der Startseite.
      </PageTitle>
      <HudPanel label="Neuer Termin" code="IN" className="mb-5">
        <EventForm subjects={subjects} today={today} />
      </HudPanel>
      <HudPanel label="Anstehend" code={`EV-${String(upcoming.length).padStart(2, "0")}`} className="mb-5">
        <EventList events={upcoming} today={today} empty="Keine anstehenden Termine." />
      </HudPanel>
      {past.length ? (
        <HudPanel label="Letzte 30 Tage" code="ARCH">
          <EventList events={past} today={today} empty="" />
        </HudPanel>
      ) : null}
    </div>
  );
}
