const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const iconSrc = path.join(root, "public", "אייקון אפליקציה.jfif");
const splashSrc = path.join(root, "public", "תמונה למסך הטעינה.jfif");
const publicDir = path.join(root, "public");
const appDir = path.join(root, "src", "app");

async function main() {
  if (!fs.existsSync(iconSrc)) throw new Error("Missing icon: " + iconSrc);
  if (!fs.existsSync(splashSrc)) throw new Error("Missing splash: " + splashSrc);

  // Square crop for icons (center crop to 1:1)
  const base = sharp(iconSrc).rotate();
  const meta = await base.metadata();
  const size = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - size) / 2);
  const top = Math.floor((meta.height - size) / 2);

  const squareBuffer = await sharp(iconSrc)
    .rotate()
    .extract({ left, top, width: size, height: size })
    .toBuffer();

  const outputs = [
    { size: 192, path: path.join(publicDir, "icon-192.png") },
    { size: 512, path: path.join(publicDir, "icon-512.png") },
    { size: 180, path: path.join(publicDir, "apple-touch-icon.png") },
    { size: 256, path: path.join(appDir, "icon.png") },
    { size: 180, path: path.join(appDir, "apple-icon.png") },
  ];

  for (const o of outputs) {
    await sharp(squareBuffer).resize(o.size, o.size).png().toFile(o.path);
    console.log("Wrote", path.relative(root, o.path), `(${o.size}x${o.size})`);
  }

  // Splash image: keep aspect ratio, generate web-sized WebP + JPG
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

  // Small square hero version (for mobile/portrait fallback)
  await sharp(splashSrc)
    .rotate()
    .resize(800, 800, { fit: "cover", position: "right" })
    .jpeg({ quality: 85 })
    .toFile(path.join(publicDir, "splash-square.jpg"));
  console.log("Wrote public/splash-square.jpg");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
