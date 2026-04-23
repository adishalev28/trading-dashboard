const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const iconSrc = path.join(root, "public", "אייקון אפליקציה.jfif");
const splashSrc = path.join(root, "public", "תמונה למסך הטעינה.jfif");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

// Detect the non-background bounding box by scanning pixels.
// Assumes the icon's background (grey checker / near-white) is brighter
// and more desaturated than the actual icon content.
async function detectContentBounds(imgPath) {
  const img = sharp(imgPath).rotate();
  const { width, height } = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  // Background = the transparent-checker pattern (grey ~200-230, white ~250-255).
  // Content = actual icon pixels (dark navy, green/red candles, gold arrow, skin).
  // A pixel is content iff it is either reasonably dark OR clearly saturated.
  const isContent = (r, g, b) => {
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const brightness = (r + g + b) / 3;
    if (brightness < 180) return true;        // any dark-ish pixel
    if (sat > 40) return true;                // any saturated pixel (green/red/gold)
    return false;                             // near-white or near-grey → background
  };

  // Scan row-wise: a row is "content" if it has at least N content pixels.
  // This rejects stray outlier pixels (JPEG artifacts on the edges).
  const MIN_PER_ROW = Math.floor(width * 0.02); // ~2% of row
  const MIN_PER_COL = Math.floor(height * 0.02);

  const rowHas = new Array(height).fill(0);
  const colHas = new Array(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (isContent(data[i], data[i + 1], data[i + 2])) {
        rowHas[y]++;
        colHas[x]++;
      }
    }
  }

  let minY = 0, maxY = height - 1, minX = 0, maxX = width - 1;
  while (minY < height && rowHas[minY] < MIN_PER_ROW) minY++;
  while (maxY > 0 && rowHas[maxY] < MIN_PER_ROW) maxY--;
  while (minX < width && colHas[minX] < MIN_PER_COL) minX++;
  while (maxX > 0 && colHas[maxX] < MIN_PER_COL) maxX--;

  return { minX, minY, maxX, maxY, width, height };
}

async function main() {
  if (!fs.existsSync(iconSrc)) throw new Error("Missing icon: " + iconSrc);
  if (!fs.existsSync(splashSrc)) throw new Error("Missing splash: " + splashSrc);

  // 1. Detect where the non-grey icon content lives.
  const b = await detectContentBounds(iconSrc);
  console.log("Detected content bounds:", b);

  // 2. Build a square crop tightly around that content, centered.
  const contentW = b.maxX - b.minX;
  const contentH = b.maxY - b.minY;
  const side = Math.max(contentW, contentH);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  let left = Math.round(cx - side / 2);
  let top = Math.round(cy - side / 2);
  // Clamp to image bounds
  left = Math.max(0, Math.min(b.width - side, left));
  top = Math.max(0, Math.min(b.height - side, top));
  const cropSize = Math.min(side, b.width - left, b.height - top);

  console.log("Cropping:", { left, top, cropSize });

  // 3. Build a pixel-replaced buffer: any near-white/light-grey pixel
  //    (the JPEG's checker background + rounded-corner anti-aliasing)
  //    is repainted with the icon's deep-navy color so phone OS rounded
  //    masks don't reveal grey corners.
  const bg = { r: 18, g: 32, b: 68 };
  const croppedImg = sharp(iconSrc)
    .rotate()
    .extract({ left, top, width: cropSize, height: cropSize });
  const { data: rawData, info: rawInfo } = await croppedImg
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = rawInfo.channels;
  const out = Buffer.from(rawData);
  for (let i = 0; i < out.length; i += ch) {
    const r = out[i], g = out[i + 1], b = out[i + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const brightness = (r + g + b) / 3;
    if (brightness > 180 && sat < 40) {
      out[i] = bg.r;
      out[i + 1] = bg.g;
      out[i + 2] = bg.b;
    }
  }
  const squareBuffer = await sharp(out, {
    raw: { width: cropSize, height: cropSize, channels: ch },
  })
    .png()
    .toBuffer();

  const outputs = [
    { size: 192, path: path.join(publicDir, "icon-192.png") },
    { size: 512, path: path.join(publicDir, "icon-512.png") },
    { size: 180, path: path.join(publicDir, "apple-touch-icon.png") },
    { size: 256, path: path.join(appDir, "icon.png") },
    { size: 180, path: path.join(appDir, "apple-icon.png") },
  ];

  for (const o of outputs) {
    await sharp(squareBuffer)
      .resize(o.size, o.size)
      .png()
      .toFile(o.path);
    console.log("Wrote", path.relative(root, o.path), `(${o.size}x${o.size})`);
  }

  // 4. Splash image: keep aspect ratio, generate web-sized WebP + JPG.
  await sharp(splashSrc)
    .rotate()
    .resize(1600, null, { withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toFile(path.join(publicDir, "splash.jpg"));
  console.log("Wrote public/splash.jpg");

  await sharp(splashSrc)
    .rotate()
    .resize(1600, null, { withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(publicDir, "splash.webp"));
  console.log("Wrote public/splash.webp");

  await sharp(splashSrc)
    .rotate()
    .resize(800, 800, { fit: "cover", position: "right" })
    .jpeg({ quality: 85 })
    .toFile(path.join(publicDir, "splash-square.jpg"));
  console.log("Wrote public/splash-square.jpg");

  // Portrait crop for phone splash: focus on the woman + monitors on the
  // right side of the landscape source. 9:16 aspect.
  const splashMeta = await sharp(splashSrc).rotate().metadata();
  const targetAspect = 9 / 16;
  const portraitH = splashMeta.height;
  const portraitW = Math.round(portraitH * targetAspect);
  // Center the portrait window on the right-of-center part of the image
  // (the woman is roughly at 65-75% width).
  const centerX = Math.round(splashMeta.width * 0.62);
  let portraitLeft = centerX - Math.round(portraitW / 2);
  portraitLeft = Math.max(0, Math.min(splashMeta.width - portraitW, portraitLeft));
  await sharp(splashSrc)
    .rotate()
    .extract({ left: portraitLeft, top: 0, width: portraitW, height: portraitH })
    .resize(900, 1600, { withoutEnlargement: true })
    .jpeg({ quality: 85, progressive: true })
    .toFile(path.join(publicDir, "splash-portrait.jpg"));
  console.log("Wrote public/splash-portrait.jpg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
