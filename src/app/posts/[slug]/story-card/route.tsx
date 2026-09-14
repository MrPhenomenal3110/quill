/* eslint-disable @next/next/no-img-element -- satori rasterizes raw <img>; next/image has no meaning here. */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPostSocialCard } from "@/lib/queries";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  CARD_CACHE_HEADERS,
  OG_COLORS,
  STORY_SIZE,
  fetchImageDataUri,
  initialsOf,
  truncate,
} from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const LINK_PATHS = [
  "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
];

/**
 * 1080x1920 card sized for an Instagram story. The bottom ~300px is left
 * deliberately empty: that is where the poster drops the link sticker, and
 * Instagram's own reply bar sits there too.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAnonClient();
  const post = await getPostSocialCard(supabase, slug).catch(() => null);

  const [cover, avatar, brandMark] = await Promise.all([
    fetchImageDataUri(post?.cover_image_url),
    fetchImageDataUri(post?.author.avatar_url),
    readFile(join(process.cwd(), "public", "quill.jpeg"))
      .then((bytes) => `data:image/jpeg;base64,${bytes.toString("base64")}`)
      .catch(() => null),
  ]);

  const title = truncate(post?.title ?? SITE_NAME, 70);
  const excerpt = post?.excerpt ? truncate(post.excerpt, 120) : null;
  const authorName = post?.author.display_name ?? SITE_NAME;

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
            width={STORY_SIZE.width}
            height={STORY_SIZE.height}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: STORY_SIZE.width,
              height: STORY_SIZE.height,
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: STORY_SIZE.width,
            height: STORY_SIZE.height,
            display: "flex",
            backgroundImage: cover
              ? "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.25) 28%, rgba(10,10,10,0.80) 62%, rgba(10,10,10,0.97) 100%)"
              : "linear-gradient(180deg, #18181B 0%, #0A0A0A 65%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            // Top inset clears Instagram's profile row, bottom leaves room for
            // the link sticker and the reply bar.
            padding: "220px 72px 320px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {brandMark ? (
              <img
                alt=""
                src={brandMark}
                width={64}
                height={64}
                style={{ width: 64, height: 64, borderRadius: 18, marginRight: 20 }}
              />
            ) : null}
            <span style={{ fontSize: 38, fontWeight: 600, letterSpacing: -0.5 }}>{SITE_NAME}</span>
          </div>

          <div style={{ display: "flex", flex: 1 }} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 82, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2 }}>
              {title}
            </span>
            {excerpt ? (
              <span style={{ fontSize: 34, lineHeight: 1.4, color: OG_COLORS.muted, marginTop: 28 }}>
                {excerpt}
              </span>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", marginTop: 52 }}>
            {avatar ? (
              <img
                alt=""
                src={avatar}
                width={76}
                height={76}
                style={{ width: 76, height: 76, borderRadius: 38, marginRight: 22 }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  marginRight: 22,
                  backgroundColor: OG_COLORS.surface,
                  border: `1px solid ${OG_COLORS.border}`,
                  fontSize: 30,
                  fontWeight: 600,
                }}
              >
                {initialsOf(authorName) || "U"}
              </div>
            )}
            <span style={{ fontSize: 34, fontWeight: 600 }}>{authorName}</span>
          </div>

          {/* The sticker is the real tap target, so the pill points at where it goes. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              borderRadius: 999,
              padding: "22px 38px",
              marginTop: 44,
              backgroundColor: "rgba(250,250,250,0.12)",
              border: "1px solid rgba(250,250,250,0.20)",
            }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill="none"
              stroke={OG_COLORS.fg}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={LINK_PATHS[0]} />
              <path d={LINK_PATHS[1]} />
            </svg>
            <span style={{ fontSize: 36, fontWeight: 600, marginLeft: 20 }}>Add link here</span>
          </div>
        </div>
      </div>
    ),
    { ...STORY_SIZE, headers: { ...CARD_CACHE_HEADERS } },
  );
}
