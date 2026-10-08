import { toNextJsHandler } from "better-auth/next-js";
import { authConfigured, getAuth } from "@/lib/auth";

// Solange die Einrichtung fehlt, Better Auth gar nicht erst erzeugen (siehe lib/auth.ts)
const notConfigured = () =>
  Response.json({ error: "Login ist noch nicht eingerichtet" }, { status: 503 });

export const GET = (req: Request) =>
  authConfigured() ? toNextJsHandler(getAuth()).GET(req) : notConfigured();
export const POST = (req: Request) =>
  authConfigured() ? toNextJsHandler(getAuth()).POST(req) : notConfigured();
