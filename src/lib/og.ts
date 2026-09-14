export const OG_SIZE = { width: 1200, height: 630 } as const;

/** Instagram/WhatsApp story frame. */
export const STORY_SIZE = { width: 1080, height: 1920 } as const;

/**
 * Generated cards are expensive to rasterize, so let the CDN hold them and
 * serve stale copies while revalidating. Crawlers time out on cold renders.
 */
export const CARD_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=604800",
} as const;

/** Hex equivalents of the app's dark theme — satori can't parse `oklch()`. */
export const OG_COLORS = {
  bg: "#0A0A0A",
  fg: "#FAFAFA",
  muted: "#A1A1AA",
  border: "#27272A",
  surface: "#18181B",
  heart: "#EF4444",
} as const;

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Satori will fetch a remote `<img src>` itself, but a slow, dead or
 * unsupported image fails the whole card. Fetching here means a bad cover or
 * avatar just drops out and the rest of the card still renders.
 *
 * Only formats resvg decodes reliably are allowed through — webp/avif are not.
 */
export async function fetchImageDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!/^image\/(png|jpeg|jpg|gif)$/.test(contentType)) return null;

    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
