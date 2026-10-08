import { ImageResponse } from "next/og";

export const alt = "CasinOnline.ro — Cazinouri online, bonusuri și jocuri";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default site-wide Open Graph image (static, brand-themed). */
export default function OpengraphImage() {
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
          backgroundColor: "#0b0f14",
          backgroundImage:
            "radial-gradient(circle at 82% 18%, rgba(34,197,94,0.18), transparent 46%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              backgroundColor: "rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#22c55e",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800 }}>
            CasinOnline
            <span style={{ color: "#22c55e" }}>.ro</span>
          </div>
        </div>

        <div style={{ marginTop: 48, fontSize: 66, fontWeight: 800, lineHeight: 1.1, maxWidth: 940 }}>
          Cazinouri online, bonusuri și jocuri
        </div>

        <div style={{ marginTop: 24, fontSize: 30, color: "#aab4c3", maxWidth: 820 }}>
          Platformă premium de comparare din România
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 52, fontSize: 22, color: "#6e7a89" }}>
          <span>Licențiate ONJN</span>
          <span>·</span>
          <span>Oferte verificate</span>
          <span>·</span>
          <span>Recenzii independente</span>
        </div>
      </div>
    ),
    size,
  );
}
