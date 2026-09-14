import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { format } from "date-fns";
import { getPostSocialCard } from "@/lib/queries";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { OG_COLORS, OG_SIZE, fetchImageDataUri, initialsOf, truncate } from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

export const alt = `A post on ${SITE_NAME} — tap through to read and like it`;
export const size = OG_SIZE;
export const contentType = "image/png";

// Like counts move, but not fast enough to regenerate the card on every crawl.
export const revalidate = 300;

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const HEART_PATH =
  "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z";

async function readBrandMark(): Promise<string | null> {
  try {
    const bytes = await readFile(join(process.cwd(), "public", "quill.jpeg"));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAnonClient();
  const post = await getPostSocialCard(supabase, slug).catch(() => null);

  const [cover, avatar, brandMark] = await Promise.all([
    fetchImageDataUri(post?.cover_image_url),
    fetchImageDataUri(post?.author.avatar_url),
    readBrandMark(),
  ]);

  const title = truncate(post?.title ?? SITE_NAME, 84);
  const excerpt = post?.excerpt ? truncate(post.excerpt, 110) : null;
  const authorName = post?.author.display_name ?? SITE_NAME;
  const published = post ? new Date(post.published_at ?? post.created_at) : null;

  const metaLine = [
    published ? format(published, "LLL d, yyyy") : null,
    post?.reading_minutes ? `${post.reading_minutes} min read` : null,
    post && post.comment_count > 0
      ? `${compact.format(post.comment_count)} ${post.comment_count === 1 ? "comment" : "comments"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: OG_COLORS.bg,
          color: OG_COLORS.fg,
        }}
      >
        {cover ? (
          <img
            alt=""
            src={cover}
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: OG_SIZE.width,
              height: OG_SIZE.height,
              objectFit: "cover",
            }}
          />
        ) : null}

        {/* Scrim keeps the text readable over any cover image. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            display: "flex",
            backgroundImage: cover
              ? // Light at the top so the cover still reads, heavy over the
                // title/author/like row so the text stays legible on any image.
                "linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.45) 25%, rgba(10,10,10,0.85) 55%, rgba(10,10,10,0.96) 100%)"
              : "linear-gradient(160deg, #18181B 0%, #0A0A0A 60%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {brandMark ? (
                <img
                  alt=""
                  src={brandMark}
                  width={52}
                  height={52}
                  style={{ width: 52, height: 52, borderRadius: 14, marginRight: 16 }}
                />
              ) : null}
              <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.4 }}>{SITE_NAME}</span>
            </div>
          </div>

          <div style={{ display: "flex", flex: 1 }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.6 }}>
              {title}
            </span>
            {excerpt ? (
              <span style={{ fontSize: 28, lineHeight: 1.4, color: OG_COLORS.muted, marginTop: 20 }}>
                {excerpt}
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 48,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              {avatar ? (
                <img
                  alt=""
                  src={avatar}
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, borderRadius: 32, marginRight: 18 }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    marginRight: 18,
                    backgroundColor: OG_COLORS.surface,
                    border: `1px solid ${OG_COLORS.border}`,
                    fontSize: 26,
                    fontWeight: 600,
                  }}
                >
                  {initialsOf(authorName) || "U"}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 28, fontWeight: 600 }}>{authorName}</span>
                {metaLine ? (
                  <span style={{ fontSize: 22, color: OG_COLORS.muted, marginTop: 4 }}>{metaLine}</span>
                ) : null}
              </div>
            </div>

            {/* Reads as a button, so the card itself advertises the like. */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 999,
                padding: "18px 32px",
                backgroundColor: "rgba(250,250,250,0.10)",
                border: "1px solid rgba(250,250,250,0.18)",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill={OG_COLORS.heart}>
                <path d={HEART_PATH} />
              </svg>
              <span style={{ fontSize: 34, fontWeight: 700, marginLeft: 14 }}>
                {compact.format(post?.like_count ?? 0)}
              </span>
              <span style={{ fontSize: 26, color: OG_COLORS.muted, marginLeft: 20 }}>Tap to like</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
