import sharp from "sharp";

const iconSizes = [48, 72, 96, 128, 192, 256, 512];

await Promise.all(
  iconSizes.map((size) =>
    sharp("public/icon.svg")
      .resize(size, size)
      .webp({ quality: 90 })
      .toFile(`public/icons/icon-${size}.webp`),
  ),
);

await sharp("public/icon.svg")
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");

console.log("Ícones FORGE para PWA gerados.");
