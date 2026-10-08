import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Schneller Vorab-Check: ohne Session-Cookie direkt zum Login.
 * Ob die Session gültig ist und der Account rein darf, prüft requireUser() auf dem Server.
 */
export function proxy(request: NextRequest) {
  // Nur lokal mit `next dev` (siehe lib/session.ts)
  const devSkip = process.env.NODE_ENV === "development" && process.env.DEV_SKIP_AUTH === "1";
  if (!devSkip && !getSessionCookie(request)) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Alles außer Login, Auth-API, Next-Interna und statischen Dateien
  matcher: ["/((?!login|api/auth|_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
