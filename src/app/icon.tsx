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
          backgroundColor: "#ffffff",
          borderRadius: 7,
          border: "2.5px solid #166534",
          fontFamily: "system-ui, -apple-system, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontSize: 23,
            fontWeight: 900,
            color: "#166534",
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
