import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Heart } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { SiteNav } from "@/components/site-nav";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  // Lets every route below express og:image / canonical as a relative path.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  // `cover` is what makes env(safe-area-inset-*) non-zero, so the sticky action
  // bar can clear the in-app browser chrome on Instagram, Threads, etc.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6">
          <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <span>made with</span>
            <Heart className="size-4 fill-red-500 text-red-500" aria-label="love" />
            <span>by</span>
            <a
              href="https://premshah.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:underline underline-offset-4"
            >
              Prem Shah
            </a>
          </p>
        </footer>
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
