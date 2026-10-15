"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/*
 * Sprache über die Web Speech API des Browsers, kein Server, kein API-Key.
 * Vorlesen (speechSynthesis) geht praktisch überall.
 * Diktieren (SpeechRecognition) nur in Chrome, Edge und Safari, nicht in Firefox.
 * Chrome schickt das Audio dafür an Google.
 */

const LANG = "de-DE";

/* ---------- Typen, SpeechRecognition steht nicht in lib.dom ---------- */

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* Support erst im Browser prüfen, auf dem Server immer false, sonst Hydration-Fehler */
const noop = () => () => {};
function useSupported(check: () => boolean) {
  return useSyncExternalStore(noop, check, () => false);
}

/* ---------- Vorlesen ---------- */

/** Deutsche Stimme bevorzugen, lokale vor Online-Stimmen (die laden manchmal nicht) */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith("de"));
  return voices.find((v) => v.lang === LANG && v.localService) ?? voices.find((v) => v.lang === LANG) ?? voices[0] ?? null;
}

/**
 * Chrome bricht lange Utterances nach ca. 15 Sekunden einfach ab.
 * Deshalb in Sätze teilen und nacheinander in die Queue legen.
 */
function sentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useSpeak() {
  const supported = useSupported(() => "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);

  // Stimmen kommen in Chrome erst asynchron, vorher ist getVoices() leer
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => synth.getVoices();
    load();
    synth.addEventListener("voiceschanged", load);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      synth.cancel();
    };
  }, [supported]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = pickVoice();
    const parts = sentences(text);
    if (!parts.length) return;
    parts.forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = LANG;
      if (voice) u.voice = voice;
      u.rate = 1.05;
      if (i === parts.length - 1) {
        u.onend = () => setSpeaking(false);
      }
      u.onerror = () => setSpeaking(false);
      synth.speak(u);
    });
    setSpeaking(true);
  }, []);

  return { supported, speaking, speak, stop };
}

/* ---------- Diktieren ---------- */

const errorText: Record<string, string> = {
  "not-allowed": "Mikrofon blockiert. In den Browser-Einstellungen für die Seite erlauben.",
  "service-not-allowed": "Spracherkennung ist in diesem Browser gesperrt.",
  "no-speech": "Nichts gehört. Nochmal versuchen.",
  "audio-capture": "Kein Mikrofon gefunden.",
  network: "Spracherkennung braucht Internet.",
};

/**
 * Ein Satz rein, Text raus. onText bekommt laufend den Zwischenstand,
 * final = true sobald der Browser sich sicher ist.
 */
export function useDictation(onText: (text: string, final: boolean) => void) {
  const supported = useSupported(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const callback = useRef(onText);

  useEffect(() => {
    callback.current = onText;
  });

  useEffect(() => () => rec.current?.abort(), []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = LANG;
    r.continuous = false; // ein Todo = ein Satz, hört nach einer Pause von selbst auf
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        final = e.results[i].isFinal;
      }
      callback.current(text.trim(), final);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(errorText[e.error] ?? `Spracherkennung fehlgeschlagen (${e.error}).`);
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    rec.current = r;
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  }, []);

  return { supported, listening, error, start, stop };
}
