import { ImageResponse } from "@vercel/og";

// Função serverless (edge) na Vercel que gera dinamicamente a imagem de
// compartilhamento (Open Graph / Twitter) 1200×630 da marca. Referenciada
// em og:image como https://genealogia.flivecompany.com/api/og
export const config = { runtime: "edge" };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b3a52 0%, #1498d5 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: "-1px",
              color: "white",
            }}
          >
            FLIVE
          </div>
          <div style={{ fontSize: 26, opacity: 0.85 }}>Company</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              maxWidth: "900px",
            }}
          >
            Árvore Genealógica Online
          </div>
          <div style={{ fontSize: 34, fontWeight: 500, opacity: 0.92 }}>
            Monte e compartilhe a história da sua família — grátis.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              background: "white",
              color: "#1498d5",
              fontSize: 26,
              fontWeight: 700,
              padding: "12px 26px",
              borderRadius: "999px",
            }}
          >
            Crie sua conta grátis
          </div>
          <div style={{ fontSize: 26, opacity: 0.85 }}>
            genealogia.flivecompany.com
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
