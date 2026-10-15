"use client";

import { useEffect } from "react";
import { speakText, voicesReady } from "@/lib/use-speech";

const KEY = "lunas-greeted";

function greeted() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function markGreeted() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // privater Modus o.ä., dann begrüßt er halt öfter
  }
}

/**
 * Sagt einmal pro Tab "Hallo", wenn Lunas OS geöffnet wird.
 *
 * Browser lassen Seiten normalerweise erst nach einem Klick sprechen. Edge mit
 * --autoplay-policy=no-user-gesture-required spricht sofort. Sonst kommt die
 * Begrüßung beim ersten Klick irgendwo auf die Seite, außer der Klick geht auf
 * einen Button oder ein Feld (dann will man was anderes, z.b. diktieren).
 */
export function Greeting({ text }: { text: string }) {
  useEffect(() => {
    if (!("speechSynthesis" in window) || greeted()) return;
    let cancelled = false;

    const onFirstInput = (e: Event) => {
      disarm();
      if (greeted()) return;
      const target = e.target as Element | null;
      if (target?.closest("button, a, input, textarea, select, [role=checkbox]")) {
        markGreeted();
        return;
      }
      speakText(text, { onStart: markGreeted });
    };
    const arm = () => {
      if (cancelled) return;
      window.addEventListener("pointerdown", onFirstInput, true);
      window.addEventListener("keydown", onFirstInput, true);
    };
    const disarm = () => {
      window.removeEventListener("pointerdown", onFirstInput, true);
      window.removeEventListener("keydown", onFirstInput, true);
    };

    voicesReady().then(() => {
      if (cancelled || greeted()) return;
      speakText(text, {
        onStart: markGreeted,
        onError: (err) => err === "not-allowed" && arm(),
      });
      // Manche Browser blocken ohne Fehler, dann nach kurzer Zeit auf den ersten Klick warten
      setTimeout(() => {
        if (!cancelled && !greeted() && !window.speechSynthesis.speaking) arm();
      }, 1200);
    });

    return () => {
      cancelled = true;
      disarm();
    };
  }, [text]);

  return null;
}
