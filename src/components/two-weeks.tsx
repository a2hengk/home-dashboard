import { addDays, dayNumber, weekday, weekdayShort, relativeDay, formatShort } from "@/lib/dates";
import { schoolDays, type EventItem } from "@/lib/sample-data";
import { SubjectTag } from "./ui";

const DAYS = 14;

function Marker({ type }: { type: EventItem["type"] }) {
  if (type === "pruefung") return <span className="size-2 rounded-full bg-accent" aria-hidden />;
  if (type === "abgabe")
    return <span className="size-2 rounded-full border-[1.5px] border-accent" aria-hidden />;
  return <span className="size-1.5 rounded-full bg-faint" aria-hidden />;
}

const typeLabel: Record<EventItem["type"], string> = {
  pruefung: "Prüfung",
  abgabe: "Abgabe",
  privat: "Termin",
};

/**
 * Die nächsten 14 Tage als Leiste: Schultage hinterlegt, Prüfungen als Punkt,
 * Abgaben als Ring. Darunter die nächsten Termine im Klartext.
 */
export function TwoWeeks({ today, events }: { today: string; events: EventItem[] }) {
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <section aria-labelledby="two-weeks" className="mb-14">
      <h2 id="two-weeks" className="sr-only">
        Die nächsten zwei Wochen
      </h2>

      <ol className="grid grid-cols-14 gap-px sm:gap-1">
        {days.map((iso, i) => {
          const wd = weekday(iso);
          const school = schoolDays.includes(wd);
          const weekend = wd >= 6;
          const isToday = i === 0;
          const dayEvents = events.filter((e) => e.date === iso);
          const label = [
            formatShort(iso),
            school ? "Schultag" : null,
            ...dayEvents.map((e) => `${typeLabel[e.type]}: ${e.title}`),
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <li
              key={iso}
              aria-label={label}
              className={`flex flex-col items-center rounded-md pb-2.5 pt-2 ${
                school ? "bg-surface" : ""
              } ${wd === 1 && i !== 0 ? "ml-1 sm:ml-2" : ""}`}
            >
              <span
                className={`text-[11px] sm:text-[12px] ${weekend ? "text-faint/70" : "text-faint"}`}
                aria-hidden
              >
                {weekdayShort(iso)}
              </span>
              <span
                className={`mt-0.5 flex size-6 items-center sm:size-7 justify-center rounded-full text-[13px] sm:text-[15px] ${
                  isToday
                    ? "bg-accent font-semibold text-accent-ink"
                    : weekend
                      ? "text-faint"
                      : "text-ink"
                }`}
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

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-faint" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm bg-surface ring-1 ring-line" /> Schultag
        </span>
        <span className="flex items-center gap-1.5">
          <Marker type="pruefung" /> Prüfung
        </span>
        <span className="flex items-center gap-1.5">
          <Marker type="abgabe" /> Abgabe
        </span>
      </div>

      <ul className="mt-6 border-t border-line">
        {upcoming.map((e) => (
          <li
            key={e.id}
            className="grid grid-cols-[5.5rem_1fr_auto] items-baseline gap-3 border-b border-line py-2.5 sm:grid-cols-[8rem_1fr_auto]"
          >
            <span className="text-[13px] text-muted">
              {relativeDay(e.date, today)}
              {e.time ? <span className="text-faint">, {e.time}</span> : null}
            </span>
            <span className="min-w-0">
              <span className={e.type === "pruefung" ? "font-medium text-ink" : "text-ink"}>
                {e.title}
              </span>
            </span>
            {e.subject ? (
              <SubjectTag kuerzel={e.subject} />
            ) : (
              <span className="text-[13px] text-faint">privat</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
