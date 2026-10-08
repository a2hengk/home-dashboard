import { addDays, dayNumber, weekday, weekdayShort, relativeDay, formatShort } from "@/lib/dates";
import { eventMeta } from "@/lib/event-types";
import { schoolDays, type EventItem } from "@/lib/sample-data";
import { Panel, SubjectTag } from "./ui";

const DAYS = 14;

/** Prüfung = gefüllter Punkt, Abgabe = Ring, Termin = kleiner Punkt. Form + Farbe, nicht nur Farbe. */
function Marker({ type }: { type: EventItem["type"] }) {
  const color = eventMeta[type].color;
  if (type === "pruefung")
    return <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
  if (type === "abgabe")
    return <span className="size-2 rounded-full border-[1.5px]" style={{ borderColor: color }} aria-hidden />;
  return <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-faint" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-3.5 rounded-sm bg-raised ring-1 ring-line-strong" /> Schultag
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
 * Die nächsten 14 Tage: Schultage hinterlegt, Termine als farbige Marker.
 * Tage mit einem wichtigen Termin leuchten in dessen Farbe.
 */
export function TwoWeeks({ today, events }: { today: string; events: EventItem[] }) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <Panel title="Die nächsten 14 Tage" id="two-weeks" action={<span className="hidden sm:block"><Legend /></span>}>
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
              className={`flex flex-col items-center rounded-lg pb-2.5 pt-2 ${
                school && !highlight ? "bg-raised" : ""
              } ${wd === 1 && i !== 0 ? "ml-1 sm:ml-2" : ""}`}
              style={
                color
                  ? {
                      backgroundColor: `color-mix(in srgb, ${color} 16%, var(--color-surface))`,
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
                    }
                  : undefined
              }
            >
              <span
                className={`text-[11px] sm:text-[12px] ${weekend ? "text-faint/70" : "text-faint"}`}
                aria-hidden
              >
                {weekdayShort(iso)}
              </span>
              <span
                className={`mt-0.5 flex size-[22px] items-center justify-center rounded-full text-[12px] sm:size-7 sm:text-[15px] ${
                  isToday ? "bg-accent font-semibold text-accent-ink" : weekend ? "text-faint" : "text-ink"
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

      <div className="mt-3 sm:hidden">
        <Legend />
      </div>

      <ul className="mt-5">
        {upcoming.map((e) => {
          const meta = eventMeta[e.type];
          return (
            <li
              key={e.id}
              className="grid grid-cols-[3px_5.5rem_1fr_auto] items-center gap-3 border-t border-line py-2.5 sm:grid-cols-[3px_7.5rem_1fr_auto]"
            >
              <span className="h-5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
              <span className="text-[13px] text-muted">
                {relativeDay(e.date, today)}
                {e.time ? <span className="text-faint">, {e.time}</span> : null}
              </span>
              <span className="min-w-0">
                <span className={e.important ? "font-medium text-ink" : "text-ink"}>{e.title}</span>
                {e.important ? (
                  <span
                    className="ml-2 inline-block rounded-full px-2 py-px align-[1px] text-[11px] font-medium"
                    style={{
                      color: meta.color,
                      backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
                    }}
                  >
                    Wichtig
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-3">
                <span className="hidden text-[12px] sm:inline" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                {e.subject ? <SubjectTag kuerzel={e.subject} /> : <span className="text-[13px] text-faint">privat</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
