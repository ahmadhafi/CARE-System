import fs from "fs";
import path from "path";
import sharp from "sharp";

const svgPath = path.join(process.cwd(), "public", "icon.svg");
const svgBuffer = fs.readFileSync(svgPath);

// Standard 192x192
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.join(process.cwd(), "public", "pwa-192x192.png"));

// Standard 512x512
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.join(process.cwd(), "public", "pwa-512x512.png"));

// Apple Touch Icon 180x180
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.join(process.cwd(), "public", "apple-touch-icon.png"));

// Maskable Icon 512x512 with 15% safe padding
const paddedSvg = svgBuffer
  .toString()
  .replace('viewBox="0 0 512 512"', 'viewBox="-40 -40 592 592"');

await sharp(Buffer.from(paddedSvg))
  .resize(512, 512)
  .png()
  .toFile(path.join(process.cwd(), "public", "pwa-maskable-512x512.png"));

// Favicon 32x32
await sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile(path.join(process.cwd(), "public", "favicon.png"));

console.log("All PWA PNG icons generated successfully in /public");
