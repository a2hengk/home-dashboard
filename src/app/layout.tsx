import type { Metadata, Viewport } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  description: "Persönliches Dashboard für Alltag und Berufsschule",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f141a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
