import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, getAuth, isAllowed } from "./auth";

/** Nur lokal mit `next dev`: Login überspringen. In Production wirkungslos. */
export const devSkipAuth = () =>
  process.env.NODE_ENV === "development" && process.env.DEV_SKIP_AUTH === "1";

/**
 * Die echte Prüfung: gültige Session in der Datenbank UND GitHub-Login auf der Allowlist.
 * Der Proxy schaut nur, ob überhaupt ein Cookie da ist.
 * Später auch in jeder Server Action und Datenabfrage aufrufen, nicht nur im Layout.
 */
export async function requireUser() {
  if (devSkipAuth()) return { id: "dev", name: "Dev", githubLogin: "dev" };

  // Ohne fertige Einrichtung kann niemand eingeloggt sein. Login-Seite zeigt, was fehlt.
  if (!authConfigured()) redirect("/login");

  let session = null;
  try {
    session = await getAuth().api.getSession({ headers: await headers() });
  } catch {
    // z.b. Datenbank noch nicht verbunden: behandeln wie ausgeloggt
  }
  if (!session) redirect("/login");
  if (!isAllowed((session.user as { githubLogin?: string }).githubLogin)) {
    redirect("/login?error=not_allowed");
  }
  return session.user;
}
