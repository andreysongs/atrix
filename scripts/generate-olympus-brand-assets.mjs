import sharp from "sharp";

const iconSource = "public/branding/olympus-app-icon.png";
const iconSizes = [48, 72, 96, 128, 192, 256, 512];

await Promise.all(
  iconSizes.map((size) =>
    sharp(iconSource)
      .resize(size, size, { fit: "cover" })
      .webp({ quality: 92, effort: 5 })
      .toFile(`public/icons/icon-${size}.webp`),
  ),
);

await sharp(iconSource)
  .resize(180, 180, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toFile("public/apple-touch-icon.png");

await Promise.all([192, 512].map(async (size) => {
  const safeSize = Math.round(size * 0.7);
  const foreground = await sharp(iconSource).resize(safeSize, safeSize, { fit: "contain" }).webp({ quality: 92 }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#030303" } })
    .composite([{ input: foreground, top: Math.round((size - safeSize) / 2), left: Math.round((size - safeSize) / 2) }])
    .webp({ quality: 92, effort: 5 })
    .toFile(`public/icons/maskable-${size}.webp`);
}));

const splashText = Buffer.from(`
  <svg width="2732" height="2732" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="metal" x1="0" x2="1">
        <stop offset="0" stop-color="#ECECEC"/>
        <stop offset="0.48" stop-color="#8B8B8B"/>
        <stop offset="0.72" stop-color="#FFFFFF"/>
        <stop offset="1" stop-color="#A7A7A7"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" x2="1">
        <stop offset="0" stop-color="#7B4D10"/>
        <stop offset="0.48" stop-color="#E2B65B"/>
        <stop offset="0.72" stop-color="#FFF0B5"/>
        <stop offset="1" stop-color="#A66B16"/>
      </linearGradient>
    </defs>
    <text x="1366" y="1885" text-anchor="middle" fill="url(#metal)" font-family="Arial, Helvetica, sans-serif" font-size="238" font-weight="600" letter-spacing="58">OLYMPUS</text>
    <line x1="695" y1="2090" x2="1100" y2="2090" stroke="url(#gold)" stroke-width="8"/>
    <text x="1366" y="2170" text-anchor="middle" fill="url(#gold)" font-family="Arial, Helvetica, sans-serif" font-size="154" font-weight="500" letter-spacing="55">AI</text>
    <line x1="1630" y1="2090" x2="2035" y2="2090" stroke="url(#gold)" stroke-width="8"/>
    <text x="1366" y="2390" text-anchor="middle" fill="#BDBDBD" font-family="Arial, Helvetica, sans-serif" font-size="55" font-weight="500" letter-spacing="20">TREINE COM INTELIGÊNCIA.</text>
    <text x="1366" y="2490" text-anchor="middle" fill="#BDBDBD" font-family="Arial, Helvetica, sans-serif" font-size="55" font-weight="500" letter-spacing="20">EVOLUA SEM LIMITES.</text>
  </svg>
`);

await sharp({
  create: { width: 2732, height: 2732, channels: 4, background: "#030303" },
})
  .composite([
    { input: await sharp(iconSource).resize(1350, 1350, { fit: "contain" }).png().toBuffer(), top: 190, left: 691 },
    { input: splashText, top: 0, left: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile("assets/splash.png");

await sharp("assets/splash.png")
  .resize(1366, 1366)
  .webp({ quality: 92, effort: 5 })
  .toFile("public/branding/olympus-lockup.webp");

console.log("Ativos OLYMPUS AI gerados para PWA e plataformas nativas.");
