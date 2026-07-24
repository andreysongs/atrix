import { readFile, mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import process from "node:process";
import sharp from "sharp";

const args = parseArgs(process.argv.slice(2));
const sourceDir = resolve(args.sourceDir || ".tools/rocketbox/Sports_Male_04");
const outputDir = resolve(args.outputDir || ".tools/rocketbox/Sports_Male_04/prepared");
const textureSize = Number(args.size || 1024);

if (!Number.isInteger(textureSize) || textureSize < 512 || textureSize > 2048) {
  throw new Error("--size must be an integer from 512 to 2048.");
}

await mkdir(outputDir, { recursive: true });

const jobs = [
  ["m026_body_color.tga", "olympus-body-color.png", recolorBody],
  ["m026_body_normal.tga", "olympus-body-normal.png", null],
  ["m026_head_color.tga", "olympus-head-color.png", warmHead],
  ["m026_head_normal.tga", "olympus-head-normal.png", null],
];

for (const [sourceName, outputName, transform] of jobs) {
  const sourcePath = resolve(sourceDir, sourceName);
  const targetPath = resolve(outputDir, outputName);
  const decoded = decodeTga(await readFile(sourcePath), sourcePath);
  if (transform) transform(decoded.pixels);
  await sharp(decoded.pixels, {
    raw: { width: decoded.width, height: decoded.height, channels: 4 },
  })
    .resize(textureSize, textureSize, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(targetPath);
  process.stdout.write(`OLYMPUS_TEXTURE=${targetPath}\n`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--source-dir") parsed.sourceDir = argv[++index];
    else if (token === "--output-dir") parsed.outputDir = argv[++index];
    else if (token === "--size") parsed.size = argv[++index];
    else throw new Error(`Unknown argument: ${token}`);
  }
  return parsed;
}

function decodeTga(file, sourcePath) {
  if (file.length < 18) throw new Error(`Truncated TGA: ${basename(sourcePath)}`);
  const idLength = file[0];
  const imageType = file[2];
  const width = file.readUInt16LE(12);
  const height = file.readUInt16LE(14);
  const depth = file[16];
  const descriptor = file[17];
  if (imageType !== 2 || ![24, 32].includes(depth) || width === 0 || height === 0) {
    throw new Error(
      `Unsupported TGA ${basename(sourcePath)}: type=${imageType}, depth=${depth}, size=${width}x${height}`,
    );
  }

  const channels = depth / 8;
  const sourcePixels = file.subarray(18 + idLength);
  const expectedLength = width * height * channels;
  if (sourcePixels.length < expectedLength) {
    throw new Error(`Truncated TGA pixels: ${basename(sourcePath)}`);
  }

  const pixels = Buffer.alloc(width * height * 4);
  const topOrigin = (descriptor & 0x20) !== 0;
  for (let y = 0; y < height; y += 1) {
    const sourceY = topOrigin ? y : height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = (sourceY * width + x) * channels;
      const targetIndex = (y * width + x) * 4;
      pixels[targetIndex] = sourcePixels[sourceIndex + 2];
      pixels[targetIndex + 1] = sourcePixels[sourceIndex + 1];
      pixels[targetIndex + 2] = sourcePixels[sourceIndex];
      pixels[targetIndex + 3] = channels === 4 ? sourcePixels[sourceIndex + 3] : 255;
    }
  }
  return { width, height, pixels };
}

function recolorBody(pixels) {
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const isAtlasBackground = maximum < 7;
    const isSkin = (
      red > 62
      && red > green * 1.035
      && green > blue * 1.055
      && red - blue > 18
    );

    if (isAtlasBackground || isSkin) continue;

    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const contrast = maximum - minimum;
    const detail = Math.pow(luminance / 255, 0.72);
    const base = Math.round(10 + detail * 43 + Math.min(8, contrast * 0.025));
    pixels[index] = Math.max(7, Math.round(base * 0.88));
    pixels[index + 1] = Math.max(8, Math.round(base * 0.92));
    pixels[index + 2] = Math.max(10, Math.round(base));
  }
}

function warmHead(pixels) {
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const isSkin = (
      red > 58
      && red > green * 1.025
      && green > blue * 1.045
      && red - blue > 15
    );
    if (!isSkin) continue;
    pixels[index] = Math.min(255, Math.round(red * 1.025));
    pixels[index + 1] = Math.min(255, Math.round(green * 0.985));
    pixels[index + 2] = Math.min(255, Math.round(blue * 0.96));
  }
}
