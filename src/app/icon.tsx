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
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#166534",
          borderRadius: 7,
          fontFamily: "sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 21,
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          S
        </span>
        <div
          style={{
            position: "absolute",
            top: 3,
            right: 3,
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "#D97706",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
