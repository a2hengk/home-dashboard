import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isAllowed, missingAuthEnv } from "@/lib/auth";
import { AppMark } from "@/components/nav";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = { title: "Anmelden" };


export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="h-96 border border-line bg-panel" />}>
          <LoginCard searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginCard({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;

  const missing = missingAuthEnv();

  // Schon eingeloggt? Dann direkt weiter (nur wenn alles eingerichtet ist)
  if (!error && missing.length === 0) {
    const session = await getAuth().api.getSession({ headers: await headers() }).catch(() => null);
    if (session && isAllowed((session.user as { githubLogin?: string }).githubLogin)) redirect("/");
  }

  return (
    <div className="relative border border-line bg-panel p-8 backdrop-blur" style={{ boxShadow: "0 0 60px rgba(92,225,255,0.08), inset 0 0 40px rgba(92,225,255,0.04)" }}>
      {/* Eckklammern */}
      <span aria-hidden className="absolute -left-px -top-px size-4 border-l-2 border-t-2 border-hud" />
      <span aria-hidden className="absolute -right-px -top-px size-4 border-r-2 border-t-2 border-hud" />
      <span aria-hidden className="absolute -bottom-px -left-px size-4 border-b-2 border-l-2 border-hud" />
      <span aria-hidden className="absolute -bottom-px -right-px size-4 border-b-2 border-r-2 border-hud" />

      <div className="flex flex-col items-center text-center">
        <div className="relative grid size-28 place-items-center">
          <span aria-hidden className="absolute inset-0 animate-spin-slow rounded-full border border-dashed border-hud/50" />
          <span aria-hidden className="absolute inset-3 animate-spin-rev rounded-full border-2 border-dotted border-hud/30" />
          <AppMark size={56} />
        </div>
        <p className="hud-label mt-6 text-[11px] text-hud-dim">Lunas OS // Zugangskontrolle</p>
        <h1 className="glow mt-1 font-display text-[34px] font-bold uppercase tracking-[0.08em] text-hud-strong">Identifizieren</h1>
        <p className="mt-1 text-muted">Dashboard für Alltag und Berufsschule.</p>
      </div>

      {error ? (
        <p role="alert" className="mt-6 border border-alert/50 bg-alert/10 px-4 py-3 text-[14px] text-alert">
          Zugriff verweigert. Dieser GitHub-Account steht nicht in ALLOWED_GITHUB_LOGINS.
        </p>
      ) : null}

      <div className="mt-7">
        <SignInButton disabled={missing.length > 0} />
      </div>

      {missing.length ? (
        <div className="mt-6 border-t border-line pt-5 text-[13px]">
          <p className="text-muted">Login ist noch nicht fertig eingerichtet. In Vercel fehlt (oder steht nur der Name als Wert drin):</p>
          <ul className="mt-2 space-y-1">
            {missing.map((k) => (
              <li key={k} className="flex items-center gap-2 text-faint">
                <span className="size-1.5 rotate-45 bg-warn" aria-hidden />
                <code className="text-ink">{k}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
