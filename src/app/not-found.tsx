import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="hud-label text-[11px] text-alert">Fehler 404 // Ziel nicht gefunden</p>
        <h1 className="glow-alert mt-2 font-display text-[44px] font-bold uppercase tracking-[0.08em] text-alert">Kein Signal</h1>
        <p className="mt-2 text-muted">Die Adresse gibt es hier nicht. Vielleicht ein Fach, das nicht (mehr) angelegt ist.</p>
        <Link href="/" className="hud-label mt-6 inline-block text-[11px] text-hud hover:text-hud-strong">
          ◂ Zurück zu Heute
        </Link>
      </div>
    </main>
  );
}
