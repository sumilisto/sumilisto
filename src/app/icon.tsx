import { ImageResponse } from "next/og";

// Metadata para favicon dinámico de Next.js
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#166534",
          borderRadius: 7,
          border: "2px solid #ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          S
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
