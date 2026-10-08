import { Suspense } from "react";
import { Nav, NavLinks } from "@/components/nav";
import { Boot } from "@/components/boot";
import { PageSkeleton } from "@/components/hud";
import { requireUser } from "@/lib/session";

/** Alles in dieser Gruppe ist nur eingeloggt erreichbar (Seiten prüfen zusätzlich selbst) */
async function Protected({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Boot />
      <Suspense fallback={<NavLinks pathname={null} />}>
        <Nav />
      </Suspense>
      <main className="px-4 pb-28 pt-6 sm:px-6 md:ml-[88px] md:px-10 md:pb-14 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<PageSkeleton />}>
            <Protected>{children}</Protected>
          </Suspense>
        </div>
      </main>
    </>
  );
}
