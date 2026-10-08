import type { Metadata, Viewport } from "next";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LUNAS OS", template: "%s | LUNAS OS" },
  description: "Persönliches Dashboard für Alltag und Berufsschule",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#02060b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full">
        <div className="hud-grid" aria-hidden />
        <div className="relative z-10">{children}</div>
        <div className="hud-scanlines" aria-hidden />
      </body>
    </html>
  );
}
