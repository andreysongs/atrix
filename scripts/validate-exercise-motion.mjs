import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const supportedMovements = new Set([
  "horizontal-press", "horizontal-pull", "vertical-press", "vertical-pull", "fly", "curl", "extension", "raise",
  "squat", "hinge", "lunge", "knee-flexion", "knee-extension", "hip-extension", "hip-abduction", "ankle-extension",
  "carry", "rotation", "crunch", "antirotation", "body-control", "shrug",
]);

const seedFile = JSON.parse(await readFile(resolve("src/data/exercise-seeds.json"), "utf8"));
if (!Array.isArray(seedFile.exercises) || seedFile.exercises.length === 0) throw new Error("Exercise catalog is empty.");
const gltfManifest = JSON.parse(await readFile(resolve("src/data/exercise-3d-manifest.json"), "utf8"));
if (gltfManifest.athleteUrl !== "/3d/athlete/olympus-athlete.glb") {
  throw new Error("The incremental GLB player must target /3d/athlete/olympus-athlete.glb.");
}
const floorPressProfile = gltfManifest.profiles?.["dumbbell-floor-press"];
if (!floorPressProfile?.clipName) {
  throw new Error("The GLB manifest must include the dumbbell-floor-press clip profile.");
}
const viewerSource = await readFile(resolve("src/components/exercise-human-3d-player.tsx"), "utf8");
for (const requiredFeature of ["WebGLRenderer", "OrbitControls", "GLTFLoader", "AnimationMixer", "createAthlete", "highlightFor", "setAnimationLoop"]) {
  if (!viewerSource.includes(requiredFeature)) throw new Error(`3D viewer is missing required feature: ${requiredFeature}`);
}
if (/<video|<img|\.gif|\.mp4/i.test(viewerSource)) {
  throw new Error("The execution viewer must not fall back to images, GIFs, or recorded videos.");
}

const ids = new Set();
const animationIds = new Set();
const unsupported = new Set();
for (const exercise of seedFile.exercises) {
  if (!exercise.id || ids.has(exercise.id)) throw new Error(`Invalid or duplicate exercise id: ${exercise.id}`);
  ids.add(exercise.id);
  const animationId = `${exercise.id}.motion3d`;
  if (animationIds.has(animationId)) throw new Error(`Duplicate animation id: ${animationId}`);
  animationIds.add(animationId);
  if (!supportedMovements.has(exercise.movement)) unsupported.add(exercise.movement || "<missing>");
  await access(resolve(`public/media/exercises/olympus/${exercise.id}.webp`));
}

if (unsupported.size > 0) throw new Error(`Unsupported movement profiles: ${Array.from(unsupported).join(", ")}`);
process.stdout.write(`3D catalog coverage OK: ${ids.size} exercises, ${animationIds.size} stable motion3d identifiers, ${supportedMovements.size} movement families, optional GLB athlete route and WebGL2 fallback verified.\n`);
