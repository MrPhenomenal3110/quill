import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CARD_CACHE_HEADERS, OG_COLORS, OG_SIZE } from "@/lib/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const brandMark = await readFile(join(process.cwd(), "public", "quill.jpeg"))
    .then((bytes) => `data:image/jpeg;base64,${bytes.toString("base64")}`)
    .catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          color: OG_COLORS.fg,
          backgroundColor: OG_COLORS.bg,
          backgroundImage: "linear-gradient(160deg, #18181B 0%, #0A0A0A 60%)",
        }}
      >
        {brandMark ? (
          <img
            alt=""
            src={brandMark}
            width={96}
            height={96}
            style={{ width: 96, height: 96, borderRadius: 24 }}
          />
        ) : null}
        <span style={{ fontSize: 86, fontWeight: 700, letterSpacing: -2, marginTop: 40 }}>
          {SITE_NAME}
        </span>
        <span style={{ fontSize: 38, color: OG_COLORS.muted, marginTop: 16 }}>{SITE_TAGLINE}</span>
        <span style={{ fontSize: 30, color: OG_COLORS.muted, marginTop: 28 }}>
          {SITE_DESCRIPTION}
        </span>
      </div>
    ),
    { ...size, headers: { ...CARD_CACHE_HEADERS } },
  );
}
