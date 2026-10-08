"use client";

import { useEffect, useState } from "react";

const fmt = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/Berlin",
});

/** Live-Uhr. Bis der Browser übernimmt, Platzhalter, damit Server und Browser gleich rendern. */
export function Clock({ className = "" }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return (
    <time className={`font-display font-semibold tabular-nums ${className}`} suppressHydrationWarning>
      {now ?? "--:--:--"}
    </time>
  );
}
