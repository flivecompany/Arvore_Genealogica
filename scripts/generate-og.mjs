// Gera a imagem de compartilhamento (Open Graph) como PNG estático em
// public/og-image.png, usando @vercel/og localmente (satori + resvg).
// Rodar: node scripts/generate-og.mjs
import { ImageResponse } from "@vercel/og";
import React from "react";
import { writeFileSync, mkdirSync } from "fs";

const h = React.createElement;

const el = h(
  "div",
  {
    style: {
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      background: "linear-gradient(135deg, #0b3a52 0%, #1498d5 100%)",
      padding: "72px",
      fontFamily: "sans-serif",
      color: "white",
    },
  },
  h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "16px" } },
    h("div", { style: { fontSize: 34, fontWeight: 800, color: "white" } }, "FLIVE"),
    h("div", { style: { fontSize: 26, opacity: 0.85 } }, "Company"),
  ),
  h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: "20px" } },
    h(
      "div",
      { style: { fontSize: 68, fontWeight: 800, lineHeight: 1.05, maxWidth: "900px" } },
      "Árvore Genealógica Online",
    ),
    h(
      "div",
      { style: { fontSize: 34, fontWeight: 500, opacity: 0.92 } },
      "Monte e compartilhe a história da sua família — grátis.",
    ),
  ),
  h(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "16px" } },
    h(
      "div",
      {
        style: {
          background: "white",
          color: "#1498d5",
          fontSize: 26,
          fontWeight: 700,
          padding: "12px 26px",
          borderRadius: "999px",
        },
      },
      "Crie sua conta grátis",
    ),
    h("div", { style: { fontSize: 26, opacity: 0.85 } }, "genealogia.flivecompany.com"),
  ),
);

const resp = new ImageResponse(el, { width: 1200, height: 630 });
const buf = Buffer.from(await resp.arrayBuffer());
mkdirSync("public", { recursive: true });
writeFileSync("public/og-image.png", buf);
console.log("OK: public/og-image.png", buf.length, "bytes");
