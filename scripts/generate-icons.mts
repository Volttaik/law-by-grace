/**
 * THE LAW With Gracious · icon generator
 *
 * Renders the canonical stacked-books mark (src/app/icon.svg) into the PNG
 * sizes used by app icons, manifests and social metadata, plus a 1200×630
 * Open Graph / Twitter card built from the same mark.
 *
 * Run:  npx tsx scripts/generate-icons.mts
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("src/app/icon.svg", "utf8");

// ── App icons (transparent background, square) ──────────────────────────
const ICONS = [
  { out: "public/icons/icon-192.png", size: 192 },
  { out: "public/icons/icon-512.png", size: 512 },
  { out: "public/icons/icon.png", size: 512 },
];

for (const { out, size } of ICONS) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`✓ ${out} (${size}×${size})`);
}

// ── Social card (1200×630, branded background) ──────────────────────────
const W = 1200;
const H = 630;
const iconUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#1d3a8a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <image href="${iconUri}" x="450" y="64" width="300" height="300"/>
  <text x="600" y="470" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" fill="#ffffff">THE LAW With Gracious</text>
  <text x="600" y="528" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" letter-spacing="1" fill="#9fb6dd">LEGAL E-LIBRARY &amp; STUDY PLATFORM</text>
</svg>`;

await sharp(Buffer.from(card)).png().toFile("public/icons/og-1200x630.png");
console.log("✓ public/icons/og-1200x630.png (1200×630 social card)");

const meta = await sharp("public/icons/og-1200x630.png").metadata();
console.log("card size:", meta.width, "x", meta.height);