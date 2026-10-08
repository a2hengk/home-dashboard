// Spielt die Drizzle-Migrationen ein, bevor gebaut wird.
// Auf Vercel nur für Production, damit ein Preview-Branch nie die echte DB verändert.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const onVercel = !!process.env.VERCEL;
if (onVercel && process.env.VERCEL_ENV !== "production") {
  console.log("[migrate] Preview-Build, Migrationen übersprungen");
  process.exit(0);
}

// Migrationen über die direkte Verbindung, nicht über den Pooler
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] Keine DATABASE_URL gesetzt, Migrationen übersprungen");
  process.exit(0);
}

const db = drizzle(url);
await migrate(db, { migrationsFolder: "drizzle" });
await db.$client.end();
console.log("[migrate] Datenbank ist auf dem neuesten Stand");
