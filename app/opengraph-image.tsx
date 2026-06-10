import { ImageResponse } from "next/og";

export const alt = "Hossauges — Small-batch sausage, Columbia SC";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Badge-on-navy OG card. ASCII-only + system fonts so it renders with no
// network font fetch at build. Every multi-child box sets display:flex (next/og
// requirement under Satori).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E3349",
          color: "#F7F3EA",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 8,
            color: "#E2552C",
            textTransform: "uppercase",
          }}
        >
          Est. 2024 - Columbia, SC
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 140,
            fontWeight: 800,
            letterSpacing: -2,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          <span>Hoss</span>
          <span style={{ color: "#E2552C" }}>auges</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#F7F3EA", opacity: 0.8 }}>
          Small-batch sausage. New flavors every week.
        </div>
      </div>
    ),
    { ...size },
  );
}
