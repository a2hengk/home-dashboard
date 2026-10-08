# LUNAS OS – Home Dashboard

Persönliches Dashboard für Alltag und Berufsschule im HUD-Stil: Todos, Termine, Stundenplan, Noten und eine private Ablage für Schulunterlagen, alles nach Lernfeld sortiert. Nur ein Nutzer, Login über GitHub.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · Drizzle ORM · Postgres (Neon über Vercel) · Vercel Blob (privat) · Better Auth (GitHub) · Vercel

## Seiten

- `/` Heute: Reaktor-Countdown bis zur nächsten Prüfung, Systemstatus, 14-Tage-Zeitleiste mit Schultagen und farbigen Terminen, fällige Todos, Stundenplan
- `/todos` Schnellerfassung, Filter Schule/Privat, Gruppen nach Fälligkeit, abhaken und löschen
- `/termine` Prüfungen, Abgaben und private Termine, als wichtig markieren
- `/schule` Fächer und Lernfelder verwalten, Stundenplan-Editor
- `/schule/[kuerzel]` ein Fach: Dateien, Todos, Termine, Noten mit Schnitt
- `/ablage` Ordner, Upload in privaten Blob-Speicher, Öffnen/Herunterladen nur mit Login, Verschieben per Ziehen oder Auswahl

Beim allerersten Migrieren werden die FIAE-Lernfelder (LF1 bis LF12a) plus Deutsch, Englisch und Wirtschaft angelegt.

## Einrichtung auf Vercel

1. Storage → Create → Neon (Postgres), mit dem Projekt verbinden
2. Storage → Create → Blob, Zugriff **Private**, mit dem Projekt verbinden
3. GitHub OAuth App anlegen, Callback `https://<domain>/api/auth/callback/github`
4. Env-Variablen setzen: `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_GITHUB_LOGINS`
5. Neu deployen. Migrationen laufen beim Production-Build automatisch (`scripts/migrate.mjs`)

Die Login-Seite zeigt an, was noch fehlt.

## Lokal

```bash
npm install
cp .env.example .env.local   # Werte eintragen
npm run db:migrate
npm run dev                   # DEV_SKIP_AUTH=1 überspringt den Login, nur mit next dev
```

## Sicherheit

- Proxy leitet ohne Session-Cookie zum Login, jede Seite, Server Action, Datenabfrage und Datei-Route prüft die Session zusätzlich auf dem Server
- Nur GitHub-Accounts aus `ALLOWED_GITHUB_LOGINS` werden überhaupt angelegt
- Dateien liegen in einem privaten Blob-Store und werden nur über `/api/files/[id]` nach Login-Prüfung ausgeliefert
