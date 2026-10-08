"use client";

import { useEffect, useState } from "react";

const LINES = [
  "LUNAS OS // KERNEL GELADEN",
  "IDENTITÄT BESTÄTIGT",
  "VERBINDE DATENBANK",
  "LADE LERNFELDER",
  "SYSTEM BEREIT",
];

const KEY = "lunas-booted";

/**
 * Start-Sequenz beim ersten Öffnen pro Browser-Sitzung. Klick oder Taste überspringt.
 * Bei "weniger Bewegung" im System gar nicht erst zeigen.
 */
export function Boot() {
  const [phase, setPhase] = useState<"hidden" | "run" | "out">("hidden");
  const [line, setLine] = useState(0);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Privater Modus o.ä.: dann eben jedes Mal
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) return;

    // Bewusst nach dem ersten Render, damit Server und Browser gleich starten
    const show = setTimeout(() => setPhase("run"), 0);
    const timers = LINES.map((_, i) => setTimeout(() => setLine(i + 1), 220 + i * 230));
    const out = setTimeout(() => setPhase("out"), 220 + LINES.length * 230 + 250);
    const done = setTimeout(() => setPhase("hidden"), 220 + LINES.length * 230 + 750);
    return () => [show, ...timers, out, done].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "run") return;
    const skip = () => setPhase("hidden");
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      role="status"
      aria-label="System startet"
      onClick={() => setPhase("hidden")}
      className={`fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-void transition-opacity duration-500 ${
        phase === "out" ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        <svg viewBox="0 0 200 200" className="size-40" aria-hidden>
          <circle cx="100" cy="100" r="40" fill="rgba(92,225,255,0.15)" />
          <g className="origin-center animate-spin" style={{ transformBox: "fill-box", animationDuration: "2.4s" }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="#5ce1ff" strokeWidth="2" strokeDasharray="60 30 10 30" />
          </g>
          <g className="origin-center animate-spin-rev" style={{ transformBox: "fill-box", animationDuration: "1.6s" }}>
            <circle cx="100" cy="100" r="72" fill="none" stroke="#5ce1ff" strokeOpacity="0.5" strokeWidth="6" strokeDasharray="2 6" />
          </g>
          <circle cx="100" cy="100" r="54" fill="none" stroke="#a6f1ff" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="18" fill="#a6f1ff" style={{ filter: "drop-shadow(0 0 12px #5ce1ff)" }} />
        </svg>
        <ul className="w-72 space-y-1 font-display text-[13px] font-semibold uppercase tracking-[0.2em]">
          {LINES.map((l, i) => (
            <li
              key={l}
              className={`flex justify-between transition-opacity duration-200 ${i < line ? "opacity-100" : "opacity-0"}`}
            >
              <span className={i === LINES.length - 1 ? "text-ok" : "text-hud"}>{l}</span>
              <span className="text-faint">{i === LINES.length - 1 ? "●" : "OK"}</span>
            </li>
          ))}
        </ul>
        <p className="hud-label text-[10px] text-faint">Klicken zum Überspringen</p>
      </div>
    </div>
  );
}
