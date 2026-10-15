"use client";

import { Mic, Square, Volume2 } from "lucide-react";
import { useDictation, useSpeak } from "@/lib/use-speech";
import { buttonClass } from "./hud";

/** Liest den Tagesbrief vor. Ohne Browser-Support wird nichts angezeigt. */
export function ReadAloudButton({ text, label = "Brief vorlesen" }: { text: string; label?: string }) {
  const { supported, speaking, speak, stop } = useSpeak();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      aria-pressed={speaking}
      className={`${buttonClass(speaking ? "primary" : "ghost")} px-3 py-1.5 text-[11px]`}
    >
      {speaking ? <Square size={13} aria-hidden /> : <Volume2 size={14} aria-hidden />}
      {speaking ? "Stopp" : label}
    </button>
  );
}

/**
 * Mikrofon neben einem Eingabefeld. onText kommt laufend mit dem Zwischenstand,
 * das Feld zeigt also schon beim Sprechen mit.
 */
export function MicButton({
  onText,
  onStart,
  className = "",
}: {
  onText: (text: string, final: boolean) => void;
  onStart?: () => void;
  className?: string;
}) {
  const { supported, listening, error, start, stop } = useDictation(onText);
  if (!supported) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (listening) return stop();
          onStart?.();
          start();
        }}
        aria-pressed={listening}
        aria-label={listening ? "Diktieren beenden" : "Diktieren"}
        title={listening ? "Zuhören beenden" : "Diktieren"}
        className={`${buttonClass(listening ? "danger" : "ghost")} px-3 ${listening ? "animate-pulse" : ""} ${className}`}
      >
        {listening ? <Square size={14} aria-hidden /> : <Mic size={15} aria-hidden />}
      </button>
      {error ? (
        <p role="alert" className="basis-full text-[13px] text-alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
