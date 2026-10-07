# Home Dashboard

Persönliches Dashboard für Alltag und Berufsschule: Todos, Termine mit Mail-Reminder und eine private Ablage für Schulunterlagen, alles nach Lernfeld sortiert.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Drizzle ORM · Postgres (Neon) · Cloudflare R2 · Resend · Vercel

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
