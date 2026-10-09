import { ImageResponse } from "next/og";

// Image metadata
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
          fontSize: 24,
          background: "transparent",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#590317",
          fontWeight: "bold",
          border: "2px solid #590317",
          borderRadius: "50%",
          fontFamily: "sans-serif",
        }}
      >
        S
      </div>
    ),
    {
      ...size,
    }
  );
}
