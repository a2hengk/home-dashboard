"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { House, ListChecks, CalendarDays, GraduationCap, FolderOpen, Power } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Clock } from "./clock";

const items = [
  { href: "/", label: "Heute", icon: House },
  { href: "/todos", label: "Todos", icon: ListChecks },
  { href: "/termine", label: "Termine", icon: CalendarDays },
  { href: "/schule", label: "Schule", icon: GraduationCap },
  { href: "/ablage", label: "Ablage", icon: FolderOpen },
] as const;

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} />;
}

function useSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    await authClient.signOut().catch(() => null);
    router.replace("/login");
  };
  return { busy, signOut };
}

/** Kleiner Reaktor als Logo */
export function AppMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#5ce1ff" strokeOpacity="0.5" strokeDasharray="3 3" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="#5ce1ff" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="5" fill="#a6f1ff" style={{ filter: "drop-shadow(0 0 4px #5ce1ff)" }} />
    </svg>
  );
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  const { busy, signOut } = useSignOut();
  return (
    <>
      {/* Desktop: schmale HUD-Leiste links */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-line bg-[rgba(2,8,14,0.85)] py-5 backdrop-blur md:flex"
      >
        <Link href="/" aria-label="Start" className="mb-1">
          <AppMark size={40} />
        </Link>
        <span className="hud-label mb-8 text-[9px] text-hud-dim">Lunas OS</span>
        <ul className="flex flex-col gap-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex w-[68px] flex-col items-center gap-1 py-2.5 transition-colors ${
                    active ? "text-hud-strong" : "text-faint hover:text-hud"
                  }`}
                >
                  {active ? (
                    <span aria-hidden className="absolute -left-[10px] top-1/2 h-8 w-[3px] -translate-y-1/2 bg-hud shadow-[0_0_10px_#5ce1ff]" />
                  ) : null}
                  <Icon size={20} strokeWidth={1.5} aria-hidden style={active ? { filter: "drop-shadow(0 0 6px #5ce1ff)" } : undefined} />
                  <span className="hud-label text-[9px] tracking-[0.14em]">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-col items-center gap-4">
          <Clock className="text-[11px] text-hud-dim" />
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            aria-label="Abmelden"
            title="Abmelden"
            className="text-faint transition-colors hover:text-alert disabled:opacity-40"
          >
            <Power size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </nav>

      {/* Handy: Kopfzeile oben mit Logo und Abmelden */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[rgba(2,8,14,0.85)] px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <AppMark size={26} />
          <span className="hud-label text-[11px] text-hud">Lunas OS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Clock className="text-[12px] text-hud-dim" />
          <button type="button" onClick={signOut} disabled={busy} aria-label="Abmelden" className="text-faint hover:text-alert">
            <Power size={17} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>

      {/* Handy: Leiste unten */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[rgba(2,8,14,0.92)] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex flex-col items-center gap-1 py-2.5 ${active ? "text-hud-strong" : "text-faint"}`}
                >
                  {active ? <span aria-hidden className="absolute inset-x-4 top-0 h-[2px] bg-hud shadow-[0_0_8px_#5ce1ff]" /> : null}
                  <Icon size={19} strokeWidth={1.5} aria-hidden />
                  <span className="hud-label text-[9px] tracking-[0.1em]">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
