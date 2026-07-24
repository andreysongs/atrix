import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const assetPath = resolve("public/3d/athlete/olympus-athlete.glb");
const file = await readFile(assetPath);

if (file.length < 20) throw new Error("Olympus athlete GLB is empty or truncated.");
if (file.readUInt32LE(0) !== 0x46546c67) throw new Error("Olympus athlete asset is not a GLB file.");
if (file.readUInt32LE(4) !== 2) throw new Error("Olympus athlete GLB must use glTF 2.0.");
if (file.readUInt32LE(8) !== file.length) throw new Error("Olympus athlete GLB length header is invalid.");
if (file.length > 15 * 1024 * 1024) throw new Error("Olympus athlete GLB exceeds the 15 MB mobile budget.");

const jsonChunkLength = file.readUInt32LE(12);
const jsonChunkType = file.readUInt32LE(16);
if (jsonChunkType !== 0x4e4f534a) throw new Error("Olympus athlete GLB is missing its JSON chunk.");

const gltf = JSON.parse(file.subarray(20, 20 + jsonChunkLength).toString("utf8").trimEnd());
if (gltf.asset?.version !== "2.0") throw new Error("Olympus athlete metadata must declare glTF 2.0.");
if (!Array.isArray(gltf.scenes) || gltf.scenes.length === 0) throw new Error("Olympus athlete has no scene.");
if (!Array.isArray(gltf.meshes) || gltf.meshes.length < 3) throw new Error("Olympus athlete is missing body or equipment meshes.");
if (!Array.isArray(gltf.skins) || gltf.skins.length === 0) throw new Error("Olympus athlete is not rigged.");

const clip = gltf.animations?.find((animation) => animation.name === "dumbbell-floor-press");
if (!clip) throw new Error('Olympus athlete is missing the "dumbbell-floor-press" animation.');
if (!Array.isArray(clip.channels) || clip.channels.length < 20) {
  throw new Error("Olympus athlete floor-press clip has too few animated channels.");
}

const nodeNames = new Set((gltf.nodes || []).map((node) => node.name));
for (const requiredNode of [
  "olympus_athlete_rig",
  "olympus_dumbbell_l",
  "olympus_dumbbell_r",
  "olympus_highlight_primary",
  "olympus_highlight_secondary",
]) {
  if (!nodeNames.has(requiredNode)) throw new Error(`Olympus athlete is missing required node: ${requiredNode}`);
}

process.stdout.write(
  `Olympus athlete GLB OK: ${(file.length / 1024 / 1024).toFixed(2)} MB, `
  + `${gltf.meshes.length} meshes, ${gltf.skins.length} skin, `
  + `${clip.channels.length} animated channels.\n`,
);
