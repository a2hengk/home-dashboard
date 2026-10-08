import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { authConfigured, getAuth, isAllowed } from "./auth";

/** Nur lokal mit `next dev`: Login überspringen. In Production wirkungslos. */
export const devSkipAuth = () =>
  process.env.NODE_ENV === "development" && process.env.DEV_SKIP_AUTH === "1";

export type CurrentUser = { id: string; name: string; githubLogin?: string | null; image?: string | null };

/**
 * Eingeloggter, erlaubter Nutzer oder null. Pro Request nur einmal abgefragt (cache).
 * Für Route Handler, die selbst mit 401 antworten wollen statt umzuleiten.
 */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  // Immer erst auf den Request warten: Seiten mit Login sind nie statisch,
  // auch wenn die Prüfung unten früh aussteigt (sonst landet new Date() im Prerender)
  await connection();
  if (devSkipAuth()) return { id: "dev", name: "Dev", githubLogin: "dev" };
  // Ohne fertige Einrichtung kann niemand eingeloggt sein
  if (!authConfigured()) return null;

  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    const user = session?.user as CurrentUser | undefined;
    if (!user || !isAllowed(user.githubLogin)) return null;
    return user;
  } catch {
    // z.b. Datenbank nicht erreichbar: behandeln wie ausgeloggt
    return null;
  }
});

/**
 * Die echte Prüfung: gültige Session in der Datenbank UND GitHub-Login auf der Allowlist.
 * Der Proxy schaut nur, ob überhaupt ein Cookie da ist. Aufrufen in jeder Seite,
 * jeder Server Action und jeder Datenabfrage, nicht nur im Layout.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
