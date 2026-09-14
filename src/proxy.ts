import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Every matched request pays for a session refresh, so match as little as
  // possible: skip static assets, metadata files, the auth route handlers (they
  // manage their own cookies), and router prefetches. Matcher values must be
  // inline literals so Next.js can analyze them at build time.
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|auth/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
