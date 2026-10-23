import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nearby — a little closer to love", template: "%s · Nearby" },
  description: "Meet people nearby, with distance and mutual preference at the heart of discovery.",
  applicationName: "Nearby",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-frame">
          <SiteHeader />
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <span>Nearby · A little closer to love.</span>
            <span>Your location is private and used only for distance-based discovery.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
