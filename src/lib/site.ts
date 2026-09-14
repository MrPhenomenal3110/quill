export const SITE_NAME = "Quill";
export const SITE_TAGLINE = "A modern blogging space";
export const SITE_DESCRIPTION = "Read, write, and share well-crafted stories.";

/**
 * Absolute origin for the site, used as `metadataBase` so social crawlers
 * (Instagram, WhatsApp, X, Slack) get fully qualified URLs for previews.
 */
export function resolveSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Vercel injects these on preview/production deploys when SITE_URL is unset.
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
