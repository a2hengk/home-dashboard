import { Suspense } from "react";
import { Nav, NavLinks } from "@/components/nav";
import { PageSkeleton } from "@/components/ui";
import { requireUser } from "@/lib/session";

/** Alles in dieser Gruppe ist nur eingeloggt erreichbar */
async function Protected({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<NavLinks pathname={null} />}>
        <Nav />
      </Suspense>
      <main className="px-4 pb-32 pt-8 sm:px-6 md:ml-[15.5rem] md:px-10 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<PageSkeleton />}>
            <Protected>{children}</Protected>
          </Suspense>
        </div>
      </main>
    </>
  );
}
