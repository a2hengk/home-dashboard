import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md">
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Seite nicht gefunden</h1>
      <p className="mt-2 text-muted">
        Die Adresse gibt es hier nicht. Vielleicht ein Fach, das noch nicht angelegt ist.
      </p>
      <Link href="/" className="mt-6 inline-block text-accent hover:text-accent-strong">
        Zurück zu Heute
      </Link>
    </div>
  );
}
