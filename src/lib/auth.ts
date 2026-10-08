import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Wer rein darf: kommagetrennte GitHub-Benutzernamen, z.b. "a2hengk".
 * Ist die Liste leer, kommt niemand rein – lieber zu als offen.
 */
export function allowedLogins(): string[] {
  return (process.env.ALLOWED_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const isAllowed = (login?: string | null) =>
  !!login && allowedLogins().includes(login.toLowerCase());

// Auf Vercel ohne eigene Domain: die feste Produktions-URL des Projekts
const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // Den GitHub-Benutzernamen direkt am User speichern, damit die
      // Allowlist ohne Join auf account geprüft werden kann
      mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
    },
  },
  user: {
    additionalFields: {
      // Wird nur vom OAuth-Callback gesetzt, nie von einem Formular.
      // input: true, weil better-auth sonst auch Werte aus mapProfileToUser verwirft.
      githubLogin: { type: "string", required: false, input: true },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Fremde Accounts werden gar nicht erst angelegt
        before: async (user) => {
          const login = (user as { githubLogin?: string }).githubLogin;
          if (!isAllowed(login)) {
            throw new APIError("FORBIDDEN", { message: "not_allowed" });
          }
          return { data: user };
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 Tage eingeloggt bleiben
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
