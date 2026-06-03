import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Heart } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quill — A modern blogging space",
  description: "Read, write, and share well-crafted stories.",
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
