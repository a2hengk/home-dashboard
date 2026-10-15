"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Lunas OS bleibt oft den ganzen Tag auf dem zweiten Bildschirm offen.
 * Damit der Vorarbeit-Bericht am Nachmittag (und neue Todos vom Handy) trotzdem auftauchen,
 * holt die Seite alle paar Minuten frische Daten und sofort, wenn man zum Tab zurückkommt.
 * Nur bei sichtbarem Tab, und nie während gerade vorgelesen wird.
 */
export function AutoRefresh({ minutes = 5 }: { minutes?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if ("speechSynthesis" in window && window.speechSynthesis.speaking) return;
      router.refresh();
    };
    const id = window.setInterval(refresh, minutes * 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, minutes]);

  return null;
}
