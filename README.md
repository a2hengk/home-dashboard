# Home Dashboard

Persönliches Dashboard für Alltag und Berufsschule: Todos, Termine mit Mail-Reminder und eine private Ablage für Schulunterlagen, alles nach Lernfeld sortiert.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Drizzle ORM · Postgres (Neon) · Cloudflare R2 · Resend · Vercel

## Stand

Probe-UI mit Beispieldaten aus `src/lib/sample-data.ts`, noch ohne Datenbank und Login:

- `/` Heute: Datum, die nächsten 14 Tage mit Schultagen, Prüfungen und Abgaben, fällige Todos, Stundenplan
- `/todos` Schnellerfassung, Filter Schule/Privat, Gruppen nach Fälligkeit
- `/schule` alle Fächer mit offenen Todos, nächster Prüfung, Dokumenten, Schnitt
- `/schule/[kuerzel]` ein Lernfeld mit Dokumenten, Todos, Terminen und Noten
- `/ablage` Ordner zum Ablegen (per Ziehen oder Auswahl), Übersicht über alle Dateien, Suche, Filter nach Fach, Upload direkt in einen Ordner. Dateien und neue Ordner bleiben vorerst nur lokal im Browser

## Setup

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run db:generate
npm run db:migrate
npm run dev
```

## Roadmap

1. Fundament: Auth, DB, Deploy
2. MVP: Lernfelder, Todos, Schul-Ablage, Heute-Seite
3. Termine und Mail-Reminder
4. Stundenplan und Noten
5. Extras: Prüfungsvorbereitung, KI-Lernhilfe
