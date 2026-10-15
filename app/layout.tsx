import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { content } from "@/data/content";
import { SITE_URL } from "@/lib/site";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { TransitionProvider } from "@/components/providers/TransitionProvider";
import { Cursor } from "@/components/ui/Cursor";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const og = { url: "/og.jpg", width: 1200, height: 630, alt: content.meta.ogAlt };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: content.meta.title,
  description: content.meta.description,
  applicationName: content.meta.siteName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: content.meta.siteName,
    title: content.meta.title,
    description: content.meta.description,
    images: [og],
  },
  twitter: {
    card: "summary_large_image",
    title: content.meta.title,
    description: content.meta.description,
    images: [og],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-bg font-sans text-fg antialiased">
        <SmoothScroll>
          <TransitionProvider>
            {/* Тонкая сетка на фоне */}
            <div className="grid-lines" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </div>
            {children}
            <Cursor />
          </TransitionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
