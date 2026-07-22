import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const supportedMovements = new Set([
  "horizontal-press", "horizontal-pull", "vertical-press", "vertical-pull", "fly", "curl", "extension", "raise",
  "squat", "hinge", "lunge", "knee-flexion", "knee-extension", "hip-extension", "hip-abduction", "ankle-extension",
  "carry", "rotation", "crunch", "antirotation", "body-control", "shrug",
]);

const seedFile = JSON.parse(await readFile(resolve("src/data/exercise-seeds.json"), "utf8"));
if (!Array.isArray(seedFile.exercises) || seedFile.exercises.length === 0) throw new Error("Exercise catalog is empty.");

const ids = new Set();
const animationIds = new Set();
const unsupported = new Set();
for (const exercise of seedFile.exercises) {
  if (!exercise.id || ids.has(exercise.id)) throw new Error(`Invalid or duplicate exercise id: ${exercise.id}`);
  ids.add(exercise.id);
  const animationId = `${exercise.id}.rig`;
  if (animationIds.has(animationId)) throw new Error(`Duplicate animation id: ${animationId}`);
  animationIds.add(animationId);
  if (!supportedMovements.has(exercise.movement)) unsupported.add(exercise.movement || "<missing>");
  await access(resolve(`public/media/exercises/olympus/${exercise.id}.webp`));
}

if (unsupported.size > 0) throw new Error(`Unsupported movement profiles: ${Array.from(unsupported).join(", ")}`);
process.stdout.write(`Motion coverage OK: ${ids.size} exercises, ${animationIds.size} unique .rig identifiers, ${supportedMovements.size} movement families.\n`);
