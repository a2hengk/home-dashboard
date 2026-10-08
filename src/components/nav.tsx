"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListChecks, GraduationCap, FolderOpen } from "lucide-react";

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

export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <>
      {/* Desktop: schmale Seitenleiste */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-base px-4 py-6 md:flex"
      >
        <p className="px-3 pb-8 text-[15px] font-semibold tracking-tight text-ink">Dashboard</p>
        <ul className="flex flex-col gap-0.5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors ${
                    active
                      ? "bg-raised text-ink"
                      : "text-muted hover:bg-surface hover:text-ink"
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
      </nav>

      {/* Handy: Leiste unten */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                    active ? "text-ink" : "text-faint"
                  }`}
                >
                  <Icon
                    size={20}
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
