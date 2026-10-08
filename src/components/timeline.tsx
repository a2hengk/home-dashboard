import Link from "next/link";
import { addDays, dayNumber, formatShort, relativeDay, weekday, weekdayShort } from "@/lib/dates";
import { eventMeta } from "@/lib/event-types";
import type { EventItem, EventType } from "@/lib/types";
import { Empty, HudPanel, SubjectTag } from "./hud";

const DAYS = 14;

/** Prüfung = Raute gefüllt, Abgabe = Raute hohl, Termin = Punkt. Form + Farbe. */
function Marker({ type }: { type: EventType }) {
  const color = eventMeta[type].color;
  if (type === "privat")
    return <span className="size-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} aria-hidden />;
  return (
    <span
      className="size-2 rotate-45"
      style={
        type === "pruefung"
          ? { backgroundColor: color, boxShadow: `0 0 8px ${color}` }
          : { border: `1.5px solid ${color}` }
      }
      aria-hidden
    />
  );
}

function Legend() {
  return (
    <div className="hud-label flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-faint" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-3 border-t-2 border-hud bg-hud/10" /> Schultag
      </span>
      {(["pruefung", "abgabe", "privat"] as const).map((t) => (
        <span key={t} className="flex items-center gap-1.5">
          <Marker type={t} /> {eventMeta[t].label}
        </span>
      ))}
    </div>
  );
}

/**
 * Zwei Wochen als HUD-Zeitleiste. Schultage = Wochentage mit Stunden im Stundenplan.
 * Tage mit wichtigem Termin leuchten in dessen Farbe.
 */
export function Timeline({
  today,
  events,
  schoolDays,
}: {
  today: string;
  events: EventItem[];
  schoolDays: number[];
}) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const last = days.at(-1)!;
  const upcoming = events.filter((e) => e.date >= today).slice(0, 5);

  return (
    <HudPanel label="Zeitleiste // 14 Tage" code="TL-14" id="timeline" action={<span className="hidden lg:block"><Legend /></span>}>
      <ol className="grid grid-cols-14 gap-px sm:gap-1">
        {days.map((iso, i) => {
          const wd = weekday(iso);
          const school = schoolDays.includes(wd);
          const weekend = wd >= 6;
          const isToday = i === 0;
          const dayEvents = events.filter((e) => e.date === iso);
          const highlight = dayEvents.find((e) => e.important);
          const color = highlight ? eventMeta[highlight.type].color : undefined;
          const label = [
            formatShort(iso),
            school ? "Schultag" : null,
            ...dayEvents.map((e) => `${eventMeta[e.type].label}${e.important ? " (wichtig)" : ""}: ${e.title}`),
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li
              key={iso}
              aria-label={label}
              className={`relative flex flex-col items-center pb-2.5 pt-2 ${school ? "border-t-2 border-hud bg-hud/[0.07]" : "border-t-2 border-transparent"} ${
                wd === 1 && i !== 0 ? "ml-1 sm:ml-2" : ""
              }`}
              style={
                color
                  ? {
                      borderTopColor: color,
                      backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                      boxShadow: `inset 0 0 18px color-mix(in srgb, ${color} 25%, transparent)`,
                    }
                  : undefined
              }
            >
              <span className={`hud-label text-[9px] tracking-[0.1em] ${weekend ? "text-faint/60" : "text-faint"}`} aria-hidden>
                {weekdayShort(iso)}
              </span>
              <span
                className={`mt-0.5 grid size-[22px] place-items-center font-display text-[13px] font-bold sm:size-7 sm:text-[17px] ${
                  isToday ? "rounded-full bg-hud text-void shadow-[0_0_14px_#5ce1ff]" : weekend ? "text-faint" : "text-ink"
                }`}
                style={color && !isToday ? { color } : undefined}
                aria-hidden
              >
                {dayNumber(iso)}
              </span>
              <span className="mt-1.5 flex h-2 items-center gap-0.5" aria-hidden>
                {dayEvents.map((e) => (
                  <Marker key={e.id} type={e.type} />
                ))}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 lg:hidden">
        <Legend />
      </div>

      <div className="mt-5">
        {upcoming.length === 0 ? (
          <Empty>
            Keine Termine bis {formatShort(last)}{" "}
            <Link href="/termine" className="text-hud underline decoration-hud/40 underline-offset-4">
              Termin eintragen
            </Link>
          </Empty>
        ) : (
          <ul>
            {upcoming.map((e) => {
              const meta = eventMeta[e.type];
              return (
                <li key={e.id} className="grid grid-cols-[3px_6rem_1fr_auto] items-center gap-3 border-t border-line/70 py-2.5 sm:grid-cols-[3px_8rem_1fr_auto]">
                  <span className="h-5" style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}` }} aria-hidden />
                  <span className="font-display text-[13px] font-semibold uppercase tracking-wider text-muted">
                    {relativeDay(e.date, today)}
                    {e.time ? <span className="text-faint"> {e.time}</span> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={e.important ? "font-semibold text-ink" : "text-ink"}>{e.title}</span>
                    {e.important ? (
                      <span className="hud-label ml-2 inline-block px-1.5 py-px align-[1px] text-[9px]" style={{ color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}` }}>
                        Wichtig
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="hud-label hidden text-[9px] sm:inline" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <SubjectTag subject={e.subject} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </HudPanel>
  );
}
