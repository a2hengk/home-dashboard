import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { Nav, NavLinks } from "@/components/nav";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  description: "Persönliches Dashboard für Alltag und Berufsschule",
};

export const viewport: Viewport = {
  themeColor: "#131920",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">
        <Suspense fallback={<NavLinks pathname={null} />}>
          <Nav />
        </Suspense>
        <main className="px-5 pb-28 pt-10 md:ml-56 md:px-12 md:pb-16 md:pt-14">
          <div className="mx-auto max-w-5xl">
            <Suspense fallback={<div className="h-40" aria-busy="true" />}>{children}</Suspense>
          </div>
        </main>
      </body>
    </html>
  );
}
