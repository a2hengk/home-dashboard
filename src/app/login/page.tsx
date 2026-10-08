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
        <Suspense fallback={<div className="h-72 rounded-[var(--radius-panel)] bg-surface" />}>
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
    <div className="rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface p-7">
      <AppMark />
      <h1 className="mt-6 text-[24px] font-semibold tracking-tight text-ink">Anmelden</h1>
      <p className="mt-1.5 text-muted">Dein Dashboard für Alltag und Berufsschule.</p>

      {error ? (
        <p role="alert" className="mt-6 rounded-xl bg-exam/10 px-4 py-3 text-[14px] text-exam">
          Dieser GitHub-Account hat keinen Zugriff. Melde dich mit dem Account an, der in
          ALLOWED_GITHUB_LOGINS steht.
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
                <span className="size-1.5 rounded-full bg-deadline" aria-hidden />
                <code className="text-ink">{k}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
