import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Dreyv — AI-powered treasury operating system for Web3";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(145deg, #050508 0%, #0a0c14 45%, #12101a 100%)",
          padding: 72,
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 12,
              height: 48,
              borderRadius: 4,
              background: "linear-gradient(180deg, #36e27b 0%, #7c6cff 100%)",
            }}
          />
          <span
            style={{
              fontSize: 82,
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1,
            }}
          >
            Dreyv
          </span>
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 500,
            color: "rgba(255,255,255,0.72)",
            maxWidth: 920,
            lineHeight: 1.35,
          }}
        >
          Command-ops for Web3 treasuries — simulate before you sign, agents that
          remember protocols.
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.38)",
          }}
        >
          Non-custodial · Solana-native · AI orchestration
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
