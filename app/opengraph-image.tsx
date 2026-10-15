import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/BrandMark";
import { SITE_NAME } from "@/lib/seo";

export const alt = "Zigzag, l'ordre de visite le plus rapide pour vos tournées";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: 80,
          background: "#FFFFFF",
          color: "#111111",
          borderBottom: "16px solid #111111",
        }}
      >
        <BrandMark size={280} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.04em" }}>
            {SITE_NAME.toLowerCase()}
          </div>
          <div style={{ fontSize: 40, color: "#4A4A4A", maxWidth: 680 }}>
            L&apos;ordre de visite le plus rapide pour vos tournées
          </div>
        </div>
      </div>
    ),
    size,
  );
}
