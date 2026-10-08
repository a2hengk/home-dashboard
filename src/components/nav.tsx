"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { House, ListChecks, GraduationCap, FolderOpen, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const items = [
  { href: "/", label: "Heute", icon: House },
  { href: "/todos", label: "Todos", icon: ListChecks },
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

function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/login");
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] text-faint transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
    >
      <LogOut size={17} strokeWidth={1.75} aria-hidden />
      {busy ? "Abmelden…" : "Abmelden"}
    </button>
  );
}

/** Kleines Zeichen der App: der heutige Tag als Punkt in einem Kalenderblatt */
export function AppMark() {
  return (
    <span
      aria-hidden
      className="relative flex size-8 items-center justify-center rounded-[10px] bg-raised ring-1 ring-white/[0.06]"
    >
      <span className="absolute inset-x-1.5 top-1.5 h-px bg-line-strong" />
      <span className="mt-1 size-2 rounded-full bg-accent" />
    </span>
  );
}

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {/* Desktop: schwebende Seitenleiste */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-y-3 left-3 hidden w-56 flex-col rounded-[var(--radius-panel)] border border-white/[0.05] bg-surface p-3 md:flex"
      >
        <div className="flex items-center gap-2.5 px-2 pb-6 pt-1.5">
          <AppMark />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Dashboard</span>
        </div>
        <ul className="flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors ${
                    active
                      ? "bg-raised text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "text-muted hover:bg-raised/60 hover:text-ink"
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={1.75}
                    className={active ? "text-accent" : "text-faint"}
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto border-t border-line pt-3">
          <SignOut />
        </div>
      </nav>

      {/* Handy: schwebende Leiste unten */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 rounded-2xl border border-white/[0.06] bg-surface/90 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-4 p-1.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] transition-colors ${
                    active ? "bg-raised text-ink" : "text-faint"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={1.75}
                    className={active ? "text-accent" : undefined}
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
