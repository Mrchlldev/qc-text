import express from "express";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import os from "os";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(process.cwd(), "public")));

const BG_URL = "https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/qc.png";

const INTER_FONTS = [
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
    file: "Inter-Regular.woff2"
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2",
    file: "Inter-Medium.woff2"
  },
  {
    url: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2",
    file: "Inter-SemiBold.woff2"
  }
];

const BG_W = 1080;
const BG_H = 2280;

let assetsReady = false;
let bgPath = "";

async function download(url, dest) {
  if (fs.existsSync(dest)) return;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Failed download asset: ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

async function prepareAssets() {
  if (assetsReady) return;

  const dir = path.join(os.tmpdir(), "qc-kata-assets");
  const fontsDir = path.join(dir, "fonts");

  fs.mkdirSync(fontsDir, {
    recursive: true
  });

  bgPath = path.join(dir, "qc.png");

  await download(BG_URL, bgPath);

  for (const font of INTER_FONTS) {
    const fontPath = path.join(fontsDir, font.file);

    await download(font.url, fontPath);

    GlobalFonts.registerFromPath(fontPath, "Inter");
  }

  assetsReady = true;
}

function wrapByWords(text, wordsPerLine = 3) {
  const cleanText = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanText.split(" ");
  const lines = [];

  for (let i = 0; i < words.length; i += wordsPerLine) {
    const line = words.slice(i, i + wordsPerLine).join(" ");
    if (line) lines.push(line);
  }

  return lines;
}

async function renderImage(text) {
  await prepareAssets();

  const quoteText =
    text ||
    "jangan terlalu sibuk mengejar dunia sampai sholat 5 waktu di tinggalin";

  const canvas = createCanvas(BG_W, BG_H);
  const ctx = canvas.getContext("2d");

  const bgImg = await loadImage(bgPath);

  ctx.drawImage(bgImg, 0, 0, BG_W, BG_H);

  const textLines = wrapByWords(quoteText, 3);

  const fontSize = 55;
  const lineGap = 5;
  const centerX = 532;
  const centerY = 1186;

  ctx.font = `600 ${fontSize}px Inter`;
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = fontSize + lineGap;
  const totalTextHeight = textLines.length * lineHeight;

  ctx.save();

  ctx.translate(centerX, centerY);

  const startY = 0 - totalTextHeight / 2 + fontSize / 2;

  for (let i = 0; i < textLines.length; i++) {
    ctx.fillText(textLines[i], 0, startY + i * lineHeight);
  }

  ctx.restore();

  return await canvas.encode("png");
}

app.get("/api/generate", async (req, res) => {
  try {
    const image = await renderImage(req.query.text);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    return res.send(Buffer.from(image));
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : "Internal Server Error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`QC Kata Kata server running on port ${PORT}`);
});
