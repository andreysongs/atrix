import { copyFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = process.cwd();
const sheetDirectory = path.join(root, "tmp", "olympus-photo-sheets");
const outputDirectory = path.join(root, "public", "media", "exercises", "olympus");
const legacyDirectory = path.join(root, "public", "media", "exercises");
const seedPath = path.join(root, "src", "data", "exercise-seeds.json");
const strict = process.argv.includes("--strict");

const legacyImages = {
  bench: "bench-press.webp",
  incline: "incline-dumbbell-press.webp",
  squat: "barbell-squat.webp",
  rdl: "romanian-deadlift.webp",
  "leg-press": "leg-press.webp",
  "leg-curl": "lying-leg-curl.webp",
  pullup: "pull-up.webp",
  row: "barbell-row.webp",
  pulldown: "neutral-grip-pulldown.webp",
  facepull: "face-pull.webp",
  military: "military-press.webp",
  lateral: "cable-lateral-raise.webp",
  "muscle-up": "muscle-up.webp",
  "front-lever": "front-lever.webp",
  "back-lever": "back-lever.webp",
  planche: "planche.webp",
  "human-flag": "human-flag.webp",
  "l-sit": "l-sit.webp",
  handstand: "handstand.webp",
};

// The first approved sheet was intentionally curated across the chest group.
const approvedSheetIds = [
  "incline-barbell-bench",
  "decline-barbell-bench",
  "dumbbell-bench-press",
  "decline-dumbbell-bench",
  "dumbbell-fly",
  "incline-dumbbell-fly",
  "decline-dumbbell-fly",
  "cable-fly-high-low",
  "cable-fly-low-high",
];

const seedFile = JSON.parse(await readFile(seedPath, "utf8"));
const seeds = seedFile.exercises;
const reservedIds = new Set([...Object.keys(legacyImages), ...approvedSheetIds]);
const remainingIds = seeds
  .map((exercise) => exercise.id)
  .filter((id) => !reservedIds.has(id));

const sheets = [
  { file: "batch-00.png", ids: approvedSheetIds, columns: 3, rows: 3 },
];

for (let offset = 0; offset < remainingIds.length; offset += 9) {
  const ids = remainingIds.slice(offset, offset + 9);
  const batch = offset / 9 + 1;
  sheets.push({
    file: `batch-${String(batch).padStart(2, "0")}.png`,
    ids,
    columns: ids.length === 4 ? 2 : 3,
    rows: ids.length === 4 ? 2 : 3,
  });
}

await mkdir(outputDirectory, { recursive: true });

for (const [id, file] of Object.entries(legacyImages)) {
  await copyFile(path.join(legacyDirectory, file), path.join(outputDirectory, `${id}.webp`));
}

const missingSheets = [];
let cropped = 0;

for (const sheet of sheets) {
  const source = path.join(sheetDirectory, sheet.file);
  try {
    await stat(source);
  } catch {
    missingSheets.push(sheet.file);
    continue;
  }

  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read dimensions for ${sheet.file}`);
  }

  for (let index = 0; index < sheet.ids.length; index += 1) {
    const column = index % sheet.columns;
    const row = Math.floor(index / sheet.columns);
    const x0 = Math.round((column * metadata.width) / sheet.columns);
    const x1 = Math.round(((column + 1) * metadata.width) / sheet.columns);
    const y0 = Math.round((row * metadata.height) / sheet.rows);
    const y1 = Math.round(((row + 1) * metadata.height) / sheet.rows);
    const inset = Math.max(3, Math.round(Math.min(metadata.width, metadata.height) * 0.002));

    await sharp(source)
      .extract({
        left: x0 + inset,
        top: y0 + inset,
        width: x1 - x0 - inset * 2,
        height: y1 - y0 - inset * 2,
      })
      .resize(1280, 720, { fit: "cover", position: "attention" })
      .webp({ quality: 84, effort: 5 })
      .toFile(path.join(outputDirectory, `${sheet.ids[index]}.webp`));

    cropped += 1;
  }
}

const expectedIds = new Set(seeds.map((exercise) => exercise.id));
const outputIds = new Set(
  (await readdir(outputDirectory))
    .filter((file) => file.endsWith(".webp"))
    .map((file) => path.basename(file, ".webp")),
);
const missingIds = [...expectedIds].filter((id) => !outputIds.has(id));
const unexpectedIds = [...outputIds].filter((id) => !expectedIds.has(id));

console.log(
  JSON.stringify(
    {
      catalog: expectedIds.size,
      preservedLegacyPhotos: Object.keys(legacyImages).length,
      croppedPhotos: cropped,
      availablePhotos: outputIds.size,
      sourceSheetsNotPresent: missingSheets,
      missingIds,
      unexpectedIds,
    },
    null,
    2,
  ),
);

if (strict && (missingIds.length > 0 || unexpectedIds.length > 0)) {
  process.exitCode = 1;
}
