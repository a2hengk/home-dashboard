// Spielt die Drizzle-Migrationen ein, bevor gebaut wird, und legt beim allerersten
// Mal die Fächer an. Auf Vercel nur für Production, damit ein Preview-Branch nie die
// echte Datenbank verändert.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";

const onVercel = !!process.env.VERCEL;
if (onVercel && process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] Preview-Build, Migrationen übersprungen");
  process.exit(0);
}

// Migrationen über die direkte Verbindung, nicht über den Pooler
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url || url === "DATABASE_URL") {
  console.log("[migrate] Keine DATABASE_URL gesetzt, Migrationen übersprungen");
  process.exit(0);
}

// Lernfelder Fachinformatiker Anwendungsentwicklung laut Rahmenlehrplan,
// dazu die allgemeinbildenden Fächer. Alles in der App änder- und löschbar.
const startSubjects = [
  ["LF1", "Das Unternehmen und die eigene Rolle im Betrieb beschreiben", "#7dd3c0"],
  ["LF2", "Arbeitsplätze nach Kundenwunsch ausstatten", "#f2c46d"],
  ["LF3", "Clients in Netzwerke einbinden", "#b39dff"],
  ["LF4", "Schutzbedarfsanalyse im eigenen Arbeitsbereich durchführen", "#ff8f8f"],
  ["LF5", "Software zur Verwaltung von Daten anpassen", "#5ce1ff"],
  ["LF6", "Serviceanfragen bearbeiten", "#a3e36b"],
  ["LF7", "Cyber-physische Systeme ergänzen", "#ff9fd6"],
  ["LF8", "Daten systemübergreifend bereitstellen", "#6ea8ff"],
  ["LF9", "Netzwerke und Dienste bereitstellen", "#ffb36b"],
  ["LF10a", "Benutzerschnittstellen gestalten und entwickeln", "#67e8a5"],
  ["LF11a", "Funktionalität in Anwendungen realisieren", "#e3a3ff"],
  ["LF12a", "Kundenspezifische Anwendungsentwicklung durchführen", "#ffd86b"],
  ["DE", "Deutsch", "#c9c2b6"],
  ["EN", "Englisch", "#9fb4d9"],
  ["WI", "Wirtschaft", "#d8b48c"],
];

const db = drizzle(url);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("[migrate] Datenbank ist auf dem neuesten Stand");

const { rows } = await db.execute(sql`select count(*)::int as n from subjects`);
if (rows[0].n === 0) {
  for (const [i, [kuerzel, name, farbe]] of startSubjects.entries()) {
    await db.execute(
      sql`insert into subjects (kuerzel, name, farbe, position) values (${kuerzel}, ${name}, ${farbe}, ${i}) on conflict do nothing`,
    );
  }
  console.log(`[migrate] ${startSubjects.length} Fächer angelegt`);
}

await db.$client.end();
