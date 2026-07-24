import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const seed = JSON.parse(await readFile(resolve("src/data/exercise-seeds.json"), "utf8"));
if (!Array.isArray(seed.exercises) || seed.exercises.length === 0) {
  throw new Error("Exercise catalog is empty.");
}
if (seed.exercises.length !== 212) {
  throw new Error(`Expected the complete catalog with 212 exercises, received ${seed.exercises.length}.`);
}

const ids = new Set();
const searchNames = new Set();
for (const exercise of seed.exercises) {
  if (!exercise.id || ids.has(exercise.id)) throw new Error(`Invalid or duplicate exercise id: ${exercise.id}`);
  ids.add(exercise.id);
  if (typeof exercise.nameEn !== "string" || exercise.nameEn.trim().length < 2) {
    throw new Error(`Exercise ${exercise.id} has no MuscleWiki search name.`);
  }
  const searchName = exercise.nameEn.trim().toLocaleLowerCase("en");
  if (searchNames.has(searchName)) throw new Error(`Duplicate MuscleWiki search name: ${exercise.nameEn}`);
  searchNames.add(searchName);
  if (typeof exercise.equipment !== "string" || exercise.equipment.trim().length < 2) {
    throw new Error(`Exercise ${exercise.id} has no equipment hint for MuscleWiki search.`);
  }
}

const player = await readFile(resolve("src/components/exercise-musclewiki-player.tsx"), "utf8");
for (const feature of [
  "/musclewiki/resolve",
  "/musclewiki/exercises/",
  "/musclewiki/media/video/",
  "Exercise data and videos provided by",
]) {
  if (!player.includes(feature)) throw new Error(`MuscleWiki player is missing: ${feature}`);
}
if (/WebGL|GLTF|AnimationMixer|<canvas/i.test(player)) {
  throw new Error("MuscleWiki player must not contain the retired 3D renderer.");
}
if (player.includes("api.musclewiki.com") || player.includes("/stream/videos/")) {
  throw new Error("The browser must use the local authenticated proxy instead of direct MuscleWiki media URLs.");
}

const app = await readFile(resolve("src/components/performance-app.tsx"), "utf8");
if (!app.includes("ExerciseMuscleWikiPlayer")) {
  throw new Error("Exercise details do not mount the MuscleWiki player.");
}
if (/ExerciseHuman3DPlayer|ExerciseMotionPlayer|exercise-human-3d-player|exercise-motion-player/i.test(app)) {
  throw new Error("Exercise details still reference a retired 3D player.");
}

const backend = await readFile(resolve("api/src/musclewiki.service.ts"), "utf8");
for (const requirement of ["MUSCLEWIKI_API_KEY", '"X-API-Key"', "https://api.musclewiki.com"]) {
  if (!backend.includes(requirement)) throw new Error(`MuscleWiki backend is missing: ${requirement}`);
}

const legal = await readFile(resolve("public/legal.html"), "utf8");
if (!legal.includes("Exercise data and videos provided by MuscleWiki.com")) {
  throw new Error("MuscleWiki attribution is missing from the legal notice.");
}

process.stdout.write(`MuscleWiki integration OK: ${ids.size} exercises have unique English search mappings, authenticated proxy routes, attribution, and no active 3D player.\n`);
