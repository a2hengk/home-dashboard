import type { Metadata } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isAllowed } from "@/lib/auth";
import { AppMark } from "@/components/nav";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = { title: "Anmelden" };

// Was für den Login gesetzt sein muss. Angezeigt werden nur die Namen, nie Werte.
const required = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "ALLOWED_GITHUB_LOGINS",
] as const;

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

  // Schon eingeloggt? Dann direkt weiter
  if (!error) {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    if (session && isAllowed((session.user as { githubLogin?: string }).githubLogin)) redirect("/");
  }
  const missing = required.filter((k) => !process.env[k]);

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
          <p className="text-muted">Login ist noch nicht fertig eingerichtet. In Vercel fehlt:</p>
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
