"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  interpolatePose,
  resolveMotion,
  type JointName,
  type MotionExercise,
  type MotionSpec,
  type Pose,
} from "@/components/exercise-motion-player";
import rawExercise3DManifest from "@/data/exercise-3d-manifest.json";

type JointVectors = Record<JointName, THREE.Vector3>;
type HighlightLevel = "primary" | "secondary" | "off";
type MuscleRegion =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "core"
  | "lowerBack"
  | "glutes"
  | "abductors"
  | "adductors"
  | "quads"
  | "hamstrings"
  | "calves";

type AthleteRuntime = {
  root: THREE.Object3D;
  update: (joints: JointVectors) => void;
};

type EquipmentRuntime = {
  root: THREE.Object3D;
  update: (joints: JointVectors) => void;
};

type ViewerApi = {
  resetCamera: () => void;
  restartAnimation: () => void;
  rotateCamera: () => void;
  setPlayback: (active: boolean) => void;
  zoomCamera: (factor: number) => void;
};

type CameraFit = {
  far: number;
  fogFar: number;
  fogNear: number;
  maxDistance: number;
  minDistance: number;
  near: number;
  position: THREE.Vector3;
  radius: number;
  target: THREE.Vector3;
};

type Exercise3DProfile = {
  clipName: string;
  clipAliases?: string[];
  motionUrl?: string;
  modelScale?: number;
  modelPosition?: number[];
  modelRotation?: number[];
  includesEquipment?: boolean;
};

type Exercise3DManifest = {
  schemaVersion: number;
  athleteUrl: string;
  profiles: Record<string, Exercise3DProfile>;
};

type GltfRuntime = {
  action: THREE.AnimationAction;
  clip: THREE.AnimationClip;
  mixer: THREE.AnimationMixer;
  root: THREE.Object3D;
};

type GltfStatus =
  | { state: "not-configured"; message: "" }
  | { state: "loading"; message: string }
  | { state: "active"; message: string }
  | { state: "fallback"; message: string };

const exercise3DManifest = rawExercise3DManifest as Exercise3DManifest;

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3();

const muscleKeywords: Record<MuscleRegion, string[]> = {
  chest: ["peito", "peitoral", "serratil"],
  back: ["costas", "dorsal", "latissimo", "romboide", "trapézio", "trapezio", "redondo maior"],
  shoulders: ["ombro", "deltoide", "manguito", "supraesp", "infraesp", "redondo menor", "rotador"],
  biceps: ["biceps", "braquial"],
  triceps: ["triceps", "anconeo"],
  forearms: ["antebraco", "punho", "braquiorradial", "pegada", "flexor dos dedos", "extensor dos dedos", "pronador", "supinador"],
  core: ["abdomen", "abdominal", "core", "obliquo", "transverso"],
  lowerBack: ["lombar", "eretor", "multifido"],
  glutes: ["gluteo"],
  abductors: ["abdutor", "gluteo medio", "gluteo minimo", "rotador externo"],
  adductors: ["adutor"],
  quads: ["quadriceps", "vasto", "reto femoral"],
  // "Posterior" alone also matches "deltoide posterior" and would light the
  // hamstrings during shoulder work.
  hamstrings: ["posteriores", "posterior de coxa", "posterior da coxa", "isquiotib", "biceps femoral", "semitend", "semimembr"],
  calves: ["panturrilha", "gastrocnemio", "soleo", "tibial"],
};

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeAnimationName(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function profileVector(values: number[] | undefined, fallback: [number, number, number]) {
  if (!values || values.length !== 3 || values.some((value) => !Number.isFinite(value))) {
    return new THREE.Vector3(...fallback);
  }
  return new THREE.Vector3(values[0], values[1], values[2]);
}

function hasFiniteBounds(bounds: THREE.Box3) {
  return !bounds.isEmpty()
    && bounds.min.toArray().every(Number.isFinite)
    && bounds.max.toArray().every(Number.isFinite);
}

function defaultViewDirection(
  bounds: THREE.Box3,
  preferredDirection: THREE.Vector3,
) {
  const size = bounds.getSize(new THREE.Vector3());
  const axes = [
    { length: size.x, vector: new THREE.Vector3(1, 0, 0) },
    { length: size.y, vector: new THREE.Vector3(0, 1, 0) },
    { length: size.z, vector: new THREE.Vector3(0, 0, 1) },
  ].sort((left, right) => right.length - left.length);
  const longestAxis = axes[0]?.vector || new THREE.Vector3(0, 1, 0);
  const direction = preferredDirection.lengthSq() > 0.0001
    ? preferredDirection.clone().normalize()
    : new THREE.Vector3(0.25, 0.15, 1).normalize();

  // A floor exercise can be exported with the athlete's long axis facing the
  // fallback camera. Looking almost straight down that axis makes a lying body
  // appear as a small end-on silhouette. Move to a stable three-quarter view.
  if (Math.abs(direction.dot(longestAxis)) > 0.72) {
    const horizontalCandidates = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
    ].sort(
      (left, right) => Math.abs(left.dot(longestAxis)) - Math.abs(right.dot(longestAxis)),
    );
    const transverse = horizontalCandidates[0] || new THREE.Vector3(1, 0, 0);
    const longitudinalSign = direction.dot(longestAxis) < 0 ? -1 : 1;
    direction
      .copy(transverse)
      .addScaledVector(longestAxis, -0.38 * longitudinalSign)
      .addScaledVector(Y_AXIS, 0.32)
      .normalize();
  }

  return direction;
}

function fitPerspectiveCamera(
  bounds: THREE.Box3,
  viewDirection: THREE.Vector3,
  verticalFovDegrees: number,
  aspect: number,
  compactViewport: boolean,
): CameraFit {
  const target = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(0.01, size.length() / 2);
  const direction = viewDirection.lengthSq() > 0.0001
    ? viewDirection.clone().normalize()
    : new THREE.Vector3(0.25, 0.15, 1).normalize();
  const upReference = Math.abs(direction.dot(Y_AXIS)) > 0.94
    ? new THREE.Vector3(0, 0, 1)
    : Y_AXIS;
  const right = new THREE.Vector3().crossVectors(upReference, direction).normalize();
  const viewUp = new THREE.Vector3().crossVectors(direction, right).normalize();
  const verticalTangent = Math.tan(THREE.MathUtils.degToRad(verticalFovDegrees) / 2);
  const horizontalTangent = verticalTangent * THREE.MathUtils.clamp(aspect, 0.25, 4);
  const padding = compactViewport ? 1.14 : 1.03;
  let distance = radius;

  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const relative = new THREE.Vector3(x, y, z).sub(target);
        const depthTowardCamera = relative.dot(direction);
        distance = Math.max(
          distance,
          depthTowardCamera + Math.abs(relative.dot(right)) * padding / horizontalTangent,
          depthTowardCamera + Math.abs(relative.dot(viewUp)) * padding / verticalTangent,
        );
      }
    }
  }

  distance = Math.max(radius, distance + radius * 0.025);
  return {
    target,
    position: target.clone().addScaledVector(direction, distance),
    radius,
    minDistance: Math.max(0.05, Math.min(distance * 0.52, radius * 0.82)),
    maxDistance: Math.max(distance * 3.8, radius * 8),
    near: Math.max(0.01, radius * 0.008),
    far: Math.max(40, distance + radius * 18),
    fogNear: distance + radius * 1.05,
    fogFar: distance + radius * 6.5,
  };
}

function collectAnimatedBounds(
  root: THREE.Object3D,
  mixer: THREE.AnimationMixer,
  action: THREE.AnimationAction,
  clip: THREE.AnimationClip,
) {
  const bounds = new THREE.Box3();
  const sampleCount = clip.duration > 0 ? 16 : 1;

  for (let sample = 0; sample <= sampleCount; sample += 1) {
    mixer.setTime(clip.duration * sample / sampleCount);
    root.updateWorldMatrix(true, true);
    const sampleBounds = new THREE.Box3().setFromObject(root, true);
    if (hasFiniteBounds(sampleBounds)) bounds.union(sampleBounds);
  }

  action.reset().play();
  mixer.setTime(0);
  root.updateWorldMatrix(true, true);
  return bounds;
}

function animationForProfile(gltf: GLTF, profile: Exercise3DProfile) {
  const acceptedNames = new Set(
    [profile.clipName, ...(profile.clipAliases || [])].map(normalizeAnimationName),
  );
  return gltf.animations.find((clip) => acceptedNames.has(normalizeAnimationName(clip.name)));
}

function highlightFor(region: MuscleRegion, exercise: MotionExercise): HighlightLevel {
  const keywords = muscleKeywords[region];
  const primary = normalizeText(`${exercise.category} ${exercise.primary}`);
  const secondary = normalizeText(exercise.secondary);
  if (keywords.some((keyword) => primary.includes(keyword))) return "primary";
  if (keywords.some((keyword) => secondary.includes(keyword))) return "secondary";
  return "off";
}

function material(
  color: THREE.ColorRepresentation,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.02,
    ...options,
  });
}

function highlightMaterial(level: Exclude<HighlightLevel, "off">) {
  if (level === "primary") {
    return material(0x168dff, { emissive: 0x075cb7, emissiveIntensity: 1.35, roughness: 0.34 });
  }
  return material(0xf0ba35, { emissive: 0x9c6208, emissiveIntensity: 1.05, roughness: 0.38 });
}

function createCapsule(radius: number, meshMaterial: THREE.Material) {
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.08, 1 - radius * 2), 6, 12, 1);
  const mesh = new THREE.Mesh(geometry, meshMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function alignBetween(
  mesh: THREE.Object3D,
  from: THREE.Vector3,
  to: THREE.Vector3,
  baseLength = 1,
  offset: THREE.Vector3 = ZERO,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = Math.max(0.001, direction.length());
  mesh.position.copy(from).add(to).multiplyScalar(0.5).add(offset);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
  mesh.scale.set(1, Math.max(0.05, length / baseLength), 1);
}

function poseTo3D(pose: Pose, view: MotionSpec["view"]): JointVectors {
  const result = {} as JointVectors;
  const scale = 105;
  (Object.keys(pose) as JointName[]).forEach((joint) => {
    const side = joint.endsWith("L") ? -1 : joint.endsWith("R") ? 1 : 0;
    const depth = side * (view === "lateral" ? 0.13 : 0.025);
    result[joint] = new THREE.Vector3(
      (pose[joint].x - 320) / scale,
      Math.max(0.035, (329 - pose[joint].y) / scale),
      depth,
    );
  });
  return result;
}

function bodyBasis(joints: JointVectors) {
  const shoulderMid = joints.shoulderL.clone().add(joints.shoulderR).multiplyScalar(0.5);
  const hipMid = joints.hipL.clone().add(joints.hipR).multiplyScalar(0.5);
  const up = shoulderMid.clone().sub(hipMid).normalize();
  const side = joints.shoulderR.clone().sub(joints.shoulderL).normalize();
  const front = new THREE.Vector3().crossVectors(side, up).normalize();
  if (!Number.isFinite(front.x) || front.lengthSq() < 0.1) front.set(0, 0, 1);
  // Lateral source poses face toward +X, while frontal poses face the default
  // +Z camera. Keep facial features, muscle patches and feet on that same side.
  if (Math.abs(side.z) > Math.abs(side.x) && front.x < 0) front.negate();
  return { shoulderMid, hipMid, up, side, front };
}

function createAthlete(scene: THREE.Scene, exercise: MotionExercise): AthleteRuntime {
  const athlete = new THREE.Group();
  athlete.name = "olympus-human-3d";
  scene.add(athlete);

  const skin = material(0xb77b55, { roughness: 0.48 });
  const skinLight = material(0xc88d67, { roughness: 0.5 });
  const shirt = material(0x161a20, { roughness: 0.42, metalness: 0.08 });
  const shorts = material(0x0b0d11, { roughness: 0.55 });
  const shoe = material(0x20242a, { roughness: 0.6 });
  const hair = material(0x17110e, { roughness: 0.9 });
  const eye = material(0x060606, { roughness: 0.25 });

  const segmentConfig: Array<[string, JointName, JointName, number]> = [
    ["upperArmL", "shoulderL", "elbowL", 0.135],
    ["upperArmR", "shoulderR", "elbowR", 0.135],
    ["forearmL", "elbowL", "wristL", 0.108],
    ["forearmR", "elbowR", "wristR", 0.108],
    ["thighL", "hipL", "kneeL", 0.19],
    ["thighR", "hipR", "kneeR", 0.19],
    ["calfL", "kneeL", "ankleL", 0.145],
    ["calfR", "kneeR", "ankleR", 0.145],
    ["neck", "neck", "head", 0.105],
  ];
  const segments = new Map<string, { mesh: THREE.Mesh; from: JointName; to: JointName }>();
  segmentConfig.forEach(([name, from, to, radius]) => {
    const mesh = createCapsule(radius, name === "neck" ? skinLight : skin);
    mesh.name = name;
    athlete.add(mesh);
    segments.set(name, { mesh, from, to });
  });

  const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), shirt);
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), shirt);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), shorts);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 18), skinLight);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.239, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), hair);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 10), skinLight);
  nose.rotation.x = Math.PI / 2;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), eye);
  const eyeR = eyeL.clone();
  const shortL = createCapsule(0.205, shorts);
  const shortR = createCapsule(0.205, shorts);
  const footL = createCapsule(0.11, shoe);
  const footR = createCapsule(0.11, shoe);
  [torso, abdomen, pelvis, head, hairCap, nose, eyeL, eyeR, shortL, shortR, footL, footR].forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    athlete.add(mesh);
  });

  const jointMeshes = new Map<JointName, THREE.Mesh>();
  (["shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR", "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"] as JointName[]).forEach((joint) => {
    const radius = joint.startsWith("shoulder") ? 0.15 : joint.startsWith("hip") ? 0.16 : joint.startsWith("knee") ? 0.135 : joint.startsWith("ankle") || joint.startsWith("wrist") ? 0.09 : 0.11;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), skin);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    athlete.add(mesh);
    jointMeshes.set(joint, mesh);
  });

  const patchUpdates: Array<(joints: JointVectors, basis: ReturnType<typeof bodyBasis>) => void> = [];
  const addPatch = (region: MuscleRegion, geometry: THREE.BufferGeometry, update: (mesh: THREE.Mesh, joints: JointVectors, basis: ReturnType<typeof bodyBasis>) => void) => {
    const level = highlightFor(region, exercise);
    if (level === "off") return;
    const mesh = new THREE.Mesh(geometry, highlightMaterial(level));
    mesh.castShadow = false;
    mesh.renderOrder = 3;
    athlete.add(mesh);
    patchUpdates.push((joints, basis) => update(mesh, joints, basis));
  };

  const addSegmentPatch = (region: MuscleRegion, from: JointName, to: JointName, radius: number, frontOffset: number, sideOffset = 0) => {
    addPatch(region, new THREE.CapsuleGeometry(radius, Math.max(0.08, 1 - radius * 2), 5, 10, 1), (mesh, joints, basis) => {
      const offset = basis.front.clone().multiplyScalar(frontOffset).add(basis.side.clone().multiplyScalar(sideOffset));
      alignBetween(mesh, joints[from], joints[to], 1, offset);
    });
  };
  const addPointPatch = (region: MuscleRegion, joint: JointName, radius: number, frontOffset: number, sideOffset = 0) => {
    addPatch(region, new THREE.SphereGeometry(radius, 16, 12), (mesh, joints, basis) => {
      mesh.position.copy(joints[joint]).addScaledVector(basis.front, frontOffset).addScaledVector(basis.side, sideOffset);
    });
  };
  const addTorsoPatch = (region: MuscleRegion, vertical: number, sideOffset: number, frontOffset: number, scale: [number, number, number]) => {
    addPatch(region, new THREE.SphereGeometry(1, 18, 12), (mesh, _joints, basis) => {
      mesh.position.copy(basis.hipMid).lerp(basis.shoulderMid, vertical).addScaledVector(basis.side, sideOffset).addScaledVector(basis.front, frontOffset);
      const rotationMatrix = new THREE.Matrix4().makeBasis(basis.side, basis.up, basis.front);
      mesh.quaternion.setFromRotationMatrix(rotationMatrix);
      mesh.scale.set(...scale);
    });
  };

  addTorsoPatch("chest", 0.73, -0.16, 0.205, [0.17, 0.12, 0.06]);
  addTorsoPatch("chest", 0.73, 0.16, 0.205, [0.17, 0.12, 0.06]);
  addTorsoPatch("back", 0.66, -0.19, -0.2, [0.17, 0.23, 0.055]);
  addTorsoPatch("back", 0.66, 0.19, -0.2, [0.17, 0.23, 0.055]);
  addTorsoPatch("core", 0.38, -0.078, 0.205, [0.075, 0.22, 0.045]);
  addTorsoPatch("core", 0.38, 0.078, 0.205, [0.075, 0.22, 0.045]);
  addTorsoPatch("lowerBack", 0.27, 0, -0.205, [0.2, 0.18, 0.05]);
  addPointPatch("shoulders", "shoulderL", 0.155, 0.045);
  addPointPatch("shoulders", "shoulderR", 0.155, 0.045);
  addSegmentPatch("biceps", "shoulderL", "elbowL", 0.078, 0.12);
  addSegmentPatch("biceps", "shoulderR", "elbowR", 0.078, 0.12);
  addSegmentPatch("triceps", "shoulderL", "elbowL", 0.076, -0.12);
  addSegmentPatch("triceps", "shoulderR", "elbowR", 0.076, -0.12);
  addSegmentPatch("forearms", "elbowL", "wristL", 0.062, 0.095);
  addSegmentPatch("forearms", "elbowR", "wristR", 0.062, 0.095);
  addPointPatch("glutes", "hipL", 0.18, -0.14);
  addPointPatch("glutes", "hipR", 0.18, -0.14);
  addPointPatch("abductors", "hipL", 0.145, -0.03, -0.12);
  addPointPatch("abductors", "hipR", 0.145, -0.03, 0.12);
  addSegmentPatch("adductors", "hipL", "kneeL", 0.085, 0.045, 0.07);
  addSegmentPatch("adductors", "hipR", "kneeR", 0.085, 0.045, -0.07);
  addSegmentPatch("quads", "hipL", "kneeL", 0.105, 0.16);
  addSegmentPatch("quads", "hipR", "kneeR", 0.105, 0.16);
  addSegmentPatch("hamstrings", "hipL", "kneeL", 0.105, -0.16);
  addSegmentPatch("hamstrings", "hipR", "kneeR", 0.105, -0.16);
  addSegmentPatch("calves", "kneeL", "ankleL", 0.082, -0.12);
  addSegmentPatch("calves", "kneeR", "ankleR", 0.082, -0.12);

  return {
    root: athlete,
    update(joints) {
      const basis = bodyBasis(joints);
      segments.forEach(({ mesh, from, to }) => alignBetween(mesh, joints[from], joints[to]));
      jointMeshes.forEach((mesh, joint) => mesh.position.copy(joints[joint]));

      torso.position.copy(basis.hipMid).lerp(basis.shoulderMid, 0.68);
      torso.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(basis.side, basis.up, basis.front));
      const torsoLength = basis.shoulderMid.distanceTo(basis.hipMid);
      torso.scale.set(0.43, Math.max(0.25, torsoLength * 0.36), 0.23);
      abdomen.position.copy(basis.hipMid).lerp(basis.shoulderMid, 0.3);
      abdomen.quaternion.copy(torso.quaternion);
      abdomen.scale.set(0.31, Math.max(0.2, torsoLength * 0.28), 0.2);
      pelvis.position.copy(basis.hipMid);
      pelvis.quaternion.copy(torso.quaternion);
      pelvis.scale.set(0.29, 0.17, 0.22);

      head.position.copy(joints.head);
      hairCap.position.copy(joints.head).addScaledVector(basis.up, 0.035).addScaledVector(basis.front, -0.006);
      hairCap.quaternion.copy(torso.quaternion);
      nose.position.copy(joints.head).addScaledVector(basis.front, 0.235).addScaledVector(basis.up, -0.015);
      nose.quaternion.copy(torso.quaternion).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
      eyeL.position.copy(joints.head).addScaledVector(basis.front, 0.215).addScaledVector(basis.side, -0.075).addScaledVector(basis.up, 0.045);
      eyeR.position.copy(joints.head).addScaledVector(basis.front, 0.215).addScaledVector(basis.side, 0.075).addScaledVector(basis.up, 0.045);

      const shortEndL = joints.hipL.clone().lerp(joints.kneeL, 0.3);
      const shortEndR = joints.hipR.clone().lerp(joints.kneeR, 0.3);
      alignBetween(shortL, joints.hipL, shortEndL);
      alignBetween(shortR, joints.hipR, shortEndR);

      const footDirection = basis.front.clone().multiplyScalar(0.28);
      const toeL = joints.ankleL.clone().add(footDirection);
      const toeR = joints.ankleR.clone().add(footDirection);
      alignBetween(footL, joints.ankleL, toeL);
      alignBetween(footR, joints.ankleR, toeR);
      patchUpdates.forEach((update) => update(joints, basis));
    },
  };
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  boxMaterial: THREE.Material,
  rotation: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), boxMaterial);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createEnvironment(scene: THREE.Scene, spec: MotionSpec, exercise: MotionExercise) {
  const equipment = new THREE.Group();
  equipment.name = `scene-${spec.scene}`;
  scene.add(equipment);
  const graphite = material(0x34383d, { metalness: 0.58, roughness: 0.31 });
  const padding = material(0x171a1f, { roughness: 0.72 });
  const gold = material(0xc69232, { metalness: 0.52, roughness: 0.3 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), material(0x080a0c, { roughness: 0.82 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(8, 20, 0x73551f, 0x25221c);
  grid.position.y = 0.006;
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.24;
  scene.add(grid);

  if (spec.scene === "mat") addBox(equipment, [2.9, 0.035, 1.2], [0, 0.025, 0], material(0x182129, { roughness: 0.8 }));
  if (spec.scene === "bench" || spec.scene === "incline-bench") {
    const angle = spec.scene === "incline-bench" ? 0.2 : 0;
    addBox(equipment, [2.7, 0.14, 0.72], [0.18, 0.77, 0], padding, [0, 0, angle]);
    addBox(equipment, [0.12, 0.75, 0.55], [-0.78, 0.38, 0], graphite, [0, 0, -0.1]);
    addBox(equipment, [0.12, 0.75, 0.55], [1.02, 0.38, 0], graphite, [0, 0, 0.1]);
  }
  if (exercise.id === "leg-press") {
    addBox(equipment, [0.15, 1.85, 0.78], [-0.22, 1.48, -0.08], padding, [0, 0, -0.28]);
    addBox(equipment, [0.95, 0.14, 0.78], [0.48, 0.73, -0.02], padding, [0, 0, -0.04]);
    // Keep both guide rails behind the athlete in the default lateral view. A
    // front rail crossed the torso and obscured the hip/knee path users need
    // to inspect in this exercise.
    addBox(equipment, [3.2, 0.08, 0.08], [0.45, 2.33, -0.58], gold, [0, 0, 0.48]);
    addBox(equipment, [3.2, 0.08, 0.08], [0.45, 2.33, -0.82], gold, [0, 0, 0.48]);
  } else if (spec.scene === "machine") {
    addBox(equipment, [0.14, 2.8, 0.14], [-1.6, 1.4, -0.6], graphite);
    addBox(equipment, [0.14, 2.8, 0.14], [1.6, 1.4, -0.6], graphite);
    addBox(equipment, [3.3, 0.14, 0.14], [0, 2.77, -0.6], graphite);
    addBox(equipment, [0.85, 0.12, 0.8], [0, 0.72, -0.25], padding);
  }
  if (spec.scene === "pullup") {
    addBox(equipment, [0.12, 3.1, 0.12], [-1.35, 1.55, 0], graphite);
    addBox(equipment, [0.12, 3.1, 0.12], [1.35, 1.55, 0], graphite);
    addBox(equipment, [2.9, 0.11, 0.11], [0, 3.02, 0], gold);
  }
  if (spec.scene === "parallel") {
    addBox(equipment, [0.1, 1.55, 0.1], [-0.62, 0.78, -0.3], graphite);
    addBox(equipment, [0.1, 1.55, 0.1], [0.62, 0.78, -0.3], graphite);
    addBox(equipment, [0.1, 0.1, 1.55], [-0.62, 1.48, 0.35], gold);
    addBox(equipment, [0.1, 0.1, 1.55], [0.62, 1.48, 0.35], gold);
  }
  if (spec.scene === "step") addBox(equipment, [1.35, 0.5, 1.1], [-0.85, 0.25, 0], padding);
  if (spec.scene === "pole") addBox(equipment, [0.13, 3.2, 0.13], [-0.45, 1.6, 0], graphite);
  if (spec.scene === "cable-high" || spec.scene === "cable-low") {
    addBox(equipment, [0.18, 3, 0.18], [2.15, 1.5, -0.5], graphite);
    addBox(equipment, [0.72, 0.1, 0.55], [2.15, spec.scene === "cable-high" ? 2.8 : 0.16, -0.5], gold);
  }
}

function createDynamicEquipment(scene: THREE.Scene, exercise: MotionExercise, spec: MotionSpec): EquipmentRuntime {
  const group = new THREE.Group();
  group.name = "animated-equipment";
  scene.add(group);
  const metal = material(0xbfc4ca, { metalness: 0.82, roughness: 0.2 });
  const plates = material(0x171a1e, { metalness: 0.35, roughness: 0.5 });
  const accent = material(0xc28c2d, { metalness: 0.55, roughness: 0.3 });
  const rubber = material(0x101216, { roughness: 0.68 });
  const equipment = normalizeText(exercise.equipment);
  const id = normalizeText(exercise.id);

  let bar: THREE.Mesh | null = null;
  const barPlates: THREE.Mesh[] = [];
  if ((equipment.includes("barra") || equipment.includes("smith") || equipment.includes("t-bar")) && !equipment.includes("barra fixa")) {
    bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 12), metal);
    bar.castShadow = true;
    group.add(bar);
    for (let index = 0; index < 2; index += 1) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 18), plates);
      plate.castShadow = true;
      group.add(plate);
      barPlates.push(plate);
    }
  }

  const dumbbells: THREE.Group[] = [];
  if (equipment.includes("halter")) {
    const dumbbellCount = /goblet|sumo/.test(id) ? 1 : 2;
    for (let index = 0; index < dumbbellCount; index += 1) {
      const dumbbell = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), metal);
      handle.rotation.z = Math.PI / 2;
      dumbbell.add(handle);
      [-0.2, 0.2].forEach((x) => {
        const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 14), plates);
        weight.rotation.z = Math.PI / 2;
        weight.position.x = x;
        dumbbell.add(weight);
      });
      dumbbell.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
      group.add(dumbbell);
      dumbbells.push(dumbbell);
    }
  }

  let kettlebell: THREE.Group | null = null;
  if (equipment.includes("kettlebell")) {
    kettlebell = new THREE.Group();
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), plates);
    bell.scale.y = 0.85;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 18, Math.PI), accent);
    handle.position.y = 0.2;
    kettlebell.add(bell, handle);
    group.add(kettlebell);
  }

  let handPlate: THREE.Mesh | null = null;
  if (equipment.includes("anilha")) {
    handPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.085, 20), plates);
    handPlate.rotation.x = Math.PI / 2;
    group.add(handPlate);
  }

  let band: THREE.Mesh | null = null;
  if (equipment.includes("band") || equipment.includes("elastico")) {
    band = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), material(0x9bd122, { emissive: 0x395d00, emissiveIntensity: 0.6 }));
    group.add(band);
  }

  const cables: THREE.Mesh[] = [];
  if (equipment.includes("polia")) {
    for (let index = 0; index < 2; index += 1) {
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 1, 6), rubber);
      group.add(cable);
      cables.push(cable);
    }
  }

  const legPressPlate = id === "leg-press"
    ? addBox(group, [0.16, 1.28, 1.08], [1.75, 1.57, 0], plates, [0, 0, -0.28])
    : null;
  const lowerBodyContext = normalizeText(`${exercise.category} ${exercise.primary}`);
  const lowerBodyBand = /glute|quadr|posterior|panturr|adutor|abdutor|perna/.test(lowerBodyContext);
  const ankleCable = /cable-(kickback|hip-abduction|lateral-glute-kick|cross-glute-kick)/.test(id);

  return {
    root: group,
    update(joints) {
      const hands = joints.wristL.clone().add(joints.wristR).multiplyScalar(0.5);
      if (bar) {
        const shoulderLoaded = exercise.movement === "squat" || id.includes("good-morning");
        const left = shoulderLoaded ? joints.shoulderL.clone().add(new THREE.Vector3(-0.48, 0.05, 0)) : joints.wristL.clone();
        const right = shoulderLoaded ? joints.shoulderR.clone().add(new THREE.Vector3(0.48, 0.05, 0)) : joints.wristR.clone();
        let axis = right.clone().sub(left);
        if (axis.lengthSq() < 0.08) axis = new THREE.Vector3(0, 0, 1);
        axis.normalize();
        const from = left.clone().addScaledVector(axis, -0.48);
        const to = right.clone().addScaledVector(axis, 0.48);
        alignBetween(bar, from, to);
        const quaternion = bar.quaternion;
        barPlates[0]?.position.copy(from).addScaledVector(axis, 0.12);
        barPlates[1]?.position.copy(to).addScaledVector(axis, -0.12);
        barPlates.forEach((plate) => plate.quaternion.copy(quaternion));
      }
      if (dumbbells.length === 1) dumbbells[0]?.position.copy(hands);
      else {
        dumbbells[0]?.position.copy(joints.wristL);
        dumbbells[1]?.position.copy(joints.wristR);
      }
      if (dumbbells.length) {
        const gripAxis = joints.shoulderR.clone().sub(joints.shoulderL).normalize();
        const gripRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), gripAxis);
        dumbbells.forEach((dumbbell) => dumbbell.quaternion.copy(gripRotation));
      }
      if (kettlebell) kettlebell.position.copy(hands).add(new THREE.Vector3(0, -0.18, 0));
      if (handPlate) handPlate.position.copy(hands);
      if (band) {
        alignBetween(
          band,
          lowerBodyBand ? joints.ankleL : joints.wristL,
          lowerBodyBand ? joints.ankleR : joints.wristR,
        );
      }
      if (cables.length) {
        const anchorY = spec.scene === "cable-high" ? 2.8 : 0.18;
        const anchor = new THREE.Vector3(2.15, anchorY, -0.5);
        if (ankleCable) {
          alignBetween(cables[0], anchor, joints.ankleR);
          cables[0].visible = true;
          cables[1].visible = false;
        } else {
          alignBetween(cables[0], anchor, joints.wristL);
          alignBetween(cables[1], anchor, joints.wristR);
          cables[0].visible = true;
          cables[1].visible = true;
        }
      }
      if (legPressPlate) {
        const feet = joints.ankleL.clone().add(joints.ankleR).multiplyScalar(0.5);
        legPressPlate.position.copy(feet).add(new THREE.Vector3(0.28, 0.04, 0));
      }
    },
  };
}

function disposeScene(scene: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Line)) return;
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((item) => { if (item) materials.add(item); });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((item) => item.dispose());
}

export function ExerciseMotionPlayer({ exercise }: { exercise: MotionExercise }) {
  const spec = useMemo(() => resolveMotion(exercise), [exercise]);
  const gltfProfile = exercise3DManifest.profiles[exercise.id] || null;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedFallback, setExpandedFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [gltfStatus, setGltfStatus] = useState<GltfStatus>({ state: "not-configured", message: "" });
  const playerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const phaseRef = useRef(0);
  const viewerApiRef = useRef<ViewerApi | null>(null);

  useEffect(() => {
    playingRef.current = playing;
    viewerApiRef.current?.setPlayback(playing);
  }, [playing]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let disposed = false;
    setReady(false);
    setRenderError("");
    setGltfStatus(gltfProfile
      ? { state: "loading", message: "Procurando o atleta GLB real e sua animação…" }
      : { state: "not-configured", message: "" });
    phaseRef.current = 0;
    playingRef.current = false;
    setPlaying(false);

    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let gltfRuntime: GltfRuntime | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let requestRender = () => undefined;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050607);
    scene.fog = new THREE.Fog(0x050607, 6.5, 11);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.08, 40);
    const compactViewport = window.innerWidth < 700;
    const minimumDistance = compactViewport ? 3.45 : 3.15;
    const maximumDistance = compactViewport ? 10.2 : 8.4;
    const cameraStart = new THREE.Vector3(spec.view === "frontal" ? 0 : 0.3, 1.55, compactViewport ? 7.45 : 6.1);
    const targetStart = new THREE.Vector3(0, 1.45, 0);
    const fallbackCameraFit: CameraFit = {
      position: cameraStart.clone(),
      target: targetStart.clone(),
      radius: 2,
      minDistance: minimumDistance,
      maxDistance: maximumDistance,
      near: 0.08,
      far: 40,
      fogNear: 6.5,
      fogFar: 11,
    };
    let resetCameraFit = fallbackCameraFit;
    let realAthleteBounds: THREE.Box3 | null = null;
    let realAthleteResetDirection: THREE.Vector3 | null = null;
    camera.position.copy(cameraStart);

    try {
      const context = canvas.getContext("webgl2", {
        alpha: false,
        antialias: true,
        depth: true,
        powerPreference: "high-performance",
      });
      if (!context) throw new Error("WebGL2 não está disponível neste dispositivo.");
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, powerPreference: "high-performance" });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.45 : 1.8));

      const hemisphere = new THREE.HemisphereLight(0xdde8ff, 0x21150a, 1.7);
      scene.add(hemisphere);
      const keyLight = new THREE.DirectionalLight(0xffe0a1, 3.1);
      keyLight.position.set(3.8, 6.2, 4.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(window.innerWidth < 700 ? 512 : 1024, window.innerWidth < 700 ? 512 : 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -2;
      scene.add(keyLight);
      const rimLight = new THREE.DirectionalLight(0x2f8fff, 1.9);
      rimLight.position.set(-4, 3, -4);
      scene.add(rimLight);

      createEnvironment(scene, spec, exercise);
      const proceduralAthlete = createAthlete(scene, exercise);
      const proceduralEquipment = createDynamicEquipment(scene, exercise, spec);
      controls = new OrbitControls(camera, canvas);
      controls.target.copy(targetStart);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = false;
      controls.minDistance = minimumDistance;
      controls.maxDistance = maximumDistance;
      controls.minPolarAngle = 0.18;
      controls.maxPolarAngle = Math.PI * 0.86;
      controls.update();

      const applyCameraFit = (fit: CameraFit) => {
        camera.position.copy(fit.position);
        camera.near = fit.near;
        camera.far = fit.far;
        camera.updateProjectionMatrix();
        if (scene.fog instanceof THREE.Fog) {
          scene.fog.near = fit.fogNear;
          scene.fog.far = fit.fogFar;
        }
        if (controls) {
          controls.target.copy(fit.target);
          controls.minDistance = fit.minDistance;
          controls.maxDistance = fit.maxDistance;
          controls.update();
        }
        requestRender();
      };
      const frameRealAthlete = (preserveViewDirection: boolean) => {
        if (!realAthleteBounds || !realAthleteResetDirection) return;
        const currentViewDirection = camera.position.clone().sub(controls?.target || targetStart);
        resetCameraFit = fitPerspectiveCamera(
          realAthleteBounds,
          realAthleteResetDirection,
          camera.fov,
          camera.aspect,
          compactViewport,
        );
        const fit = preserveViewDirection && currentViewDirection.lengthSq() > 0.0001
          ? fitPerspectiveCamera(
            realAthleteBounds,
            currentViewDirection,
            camera.fov,
            camera.aspect,
            compactViewport,
          )
          : resetCameraFit;
        applyCameraFit(fit);
      };
      const resetCamera = () => {
        applyCameraFit(resetCameraFit);
      };
      const restartAnimation = () => {
        phaseRef.current = 0;
        if (gltfRuntime) {
          gltfRuntime.action.reset().play();
          gltfRuntime.mixer.update(0);
        }
        requestRender();
      };
      const rotateCamera = () => {
        const offset = camera.position.clone().sub(controls?.target || targetStart).applyAxisAngle(Y_AXIS, Math.PI / 4);
        camera.position.copy((controls?.target || targetStart).clone().add(offset));
        controls?.update();
      };
      const setPlayback = (active: boolean) => {
        playingRef.current = active;
        if (gltfRuntime) {
          gltfRuntime.action.paused = !active;
          if (active) gltfRuntime.action.play();
        }
        requestRender();
      };
      const zoomCamera = (factor: number) => {
        const target = controls?.target || targetStart;
        const offset = camera.position.clone().sub(target);
        const nextDistance = THREE.MathUtils.clamp(
          offset.length() * factor,
          controls?.minDistance ?? minimumDistance,
          controls?.maxDistance ?? maximumDistance,
        );
        camera.position.copy(target).add(offset.setLength(nextDistance));
        controls?.update();
      };
      viewerApiRef.current = { resetCamera, restartAnimation, rotateCamera, setPlayback, zoomCamera };

      const resize = () => {
        if (!renderer || disposed) return;
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (realAthleteBounds) frameRealAthlete(true);
        else requestRender();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      resize();

      let previous = performance.now();
      let needsRender = true;
      requestRender = () => { needsRender = true; };
      controls.addEventListener("change", requestRender);
      renderer.setAnimationLoop((now) => {
        if (disposed || !renderer || document.hidden) return;
        const delta = Math.max(0, Math.min(80, now - previous));
        previous = now;
        const controlsChanged = controls?.update() ?? false;
        if (!playingRef.current && !needsRender && !controlsChanged) return;
        if (gltfRuntime) {
          if (playingRef.current) {
            gltfRuntime.mixer.update(delta / 1000 * speedRef.current);
          }
          phaseRef.current = gltfRuntime.clip.duration > 0
            ? (gltfRuntime.action.time % gltfRuntime.clip.duration) / gltfRuntime.clip.duration
            : 0;
        } else {
          if (playingRef.current) {
            phaseRef.current = (phaseRef.current + delta * speedRef.current / Math.max(1, spec.duration)) % 1;
          }
          const current = interpolatePose(spec.frames, phaseRef.current);
          const joints = poseTo3D(current, spec.view);
          proceduralAthlete.update(joints);
          proceduralEquipment.update(joints);
        }
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${phaseRef.current})`;
        renderer.render(scene, camera);
        needsRender = false;
      });
      const initialJoints = poseTo3D(interpolatePose(spec.frames, 0), spec.view);
      proceduralAthlete.update(initialJoints);
      proceduralEquipment.update(initialJoints);
      renderer.render(scene, camera);
      setReady(true);
      void renderer.compileAsync(scene, camera).catch(() => undefined);

      if (gltfProfile) {
        const loadRealAthlete = async () => {
          let athleteGltf: GLTF | null = null;
          let motionGltf: GLTF | null = null;
          let athleteAdoptedByScene = false;
          try {
            const loader = new GLTFLoader();
            if (gltfProfile.motionUrl) {
              [athleteGltf, motionGltf] = await Promise.all([
                loader.loadAsync(exercise3DManifest.athleteUrl),
                loader.loadAsync(gltfProfile.motionUrl),
              ]);
            } else {
              athleteGltf = await loader.loadAsync(exercise3DManifest.athleteUrl);
              motionGltf = athleteGltf;
            }

            if (disposed) return;
            const clip = animationForProfile(motionGltf, gltfProfile);
            if (!clip) {
              throw new Error(`Clip "${gltfProfile.clipName}" não encontrado no pacote GLB.`);
            }

            const realAthlete = athleteGltf.scene;
            const modelPosition = profileVector(gltfProfile.modelPosition, [0, 0, 0]);
            const modelRotation = profileVector(gltfProfile.modelRotation, [0, 0, 0]);
            realAthlete.name = "olympus-real-athlete-glb";
            realAthlete.position.copy(modelPosition);
            realAthlete.rotation.set(modelRotation.x, modelRotation.y, modelRotation.z);
            realAthlete.scale.setScalar(
              Number.isFinite(gltfProfile.modelScale) ? Math.max(0.001, gltfProfile.modelScale || 1) : 1,
            );
            realAthlete.traverse((object) => {
              if (!(object instanceof THREE.Mesh)) return;
              object.castShadow = true;
              object.receiveShadow = true;
            });

            const mixer = new THREE.AnimationMixer(realAthlete);
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            action.reset().play();
            mixer.update(0);
            const animatedBounds = collectAnimatedBounds(realAthlete, mixer, action, clip);
            if (!hasFiniteBounds(animatedBounds)) {
              throw new Error("O atleta GLB não possui limites visuais válidos para enquadramento.");
            }

            scene.add(realAthlete);
            athleteAdoptedByScene = true;
            proceduralAthlete.root.visible = false;
            proceduralEquipment.root.visible = !gltfProfile.includesEquipment;
            gltfRuntime = { action, clip, mixer, root: realAthlete };
            realAthleteBounds = animatedBounds;
            realAthleteResetDirection = defaultViewDirection(
              animatedBounds,
              cameraStart.clone().sub(targetStart),
            );
            frameRealAthlete(false);
            phaseRef.current = 0;
            setGltfStatus({
              state: "active",
              message: `Atleta GLB real · clip ${clip.name}`,
            });
            requestRender();
            if (renderer) void renderer.compileAsync(scene, camera).catch(() => undefined);
          } catch (error) {
            if (!disposed) {
              const detail = error instanceof Error ? error.message : "arquivo ou clip indisponível";
              console.info(`[OLYMPUS 3D] ${detail}`);
              proceduralAthlete.root.visible = true;
              proceduralEquipment.root.visible = true;
              realAthleteBounds = null;
              realAthleteResetDirection = null;
              resetCameraFit = fallbackCameraFit;
              applyCameraFit(fallbackCameraFit);
              setGltfStatus({
                state: "fallback",
                message: "Ativo GLB real ainda não instalado · exibindo fallback 3D",
              });
              requestRender();
            }
          } finally {
            if (!athleteAdoptedByScene && athleteGltf) disposeScene(athleteGltf.scene);
            if (motionGltf && motionGltf !== athleteGltf) disposeScene(motionGltf.scene);
          }
        };
        void loadRealAthlete();
      }
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Não foi possível inicializar o modelo humano 3D.");
    }

    const onContextLost = (event: Event) => {
      event.preventDefault();
      setRenderError("O contexto 3D foi interrompido. Reabra o exercício para continuar.");
    };
    const onContextRestored = () => {
      setRenderError("");
      requestRender();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      disposed = true;
      viewerApiRef.current = null;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      resizeObserver?.disconnect();
      controls?.removeEventListener("change", requestRender);
      controls?.dispose();
      if (gltfRuntime) {
        gltfRuntime.mixer.stopAllAction();
        gltfRuntime.mixer.uncacheRoot(gltfRuntime.root);
      }
      renderer?.setAnimationLoop(null);
      disposeScene(scene);
      renderer?.renderLists.dispose();
      renderer?.dispose();
    };
  }, [exercise, gltfProfile, spec]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const restart = () => {
    viewerApiRef.current?.restartAnimation();
    setPlaying(true);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (playerRef.current?.requestFullscreen) {
        await playerRef.current.requestFullscreen();
        return;
      }
    } catch {
      // iOS/WKWebView can reject the Fullscreen API; the CSS fallback below keeps the experience usable.
    }
    setExpandedFallback((value) => !value);
  };

  return (
    <section ref={playerRef} className={`exercise-motion-player exercise-human-3d${fullscreen || expandedFallback ? " is-expanded" : ""}`} aria-label={`Modelo humano 3D executando ${exercise.name}`}>
      <header className="motion-player-heading">
        <div><span className={playing ? "motion-live-dot is-playing" : "motion-live-dot"} aria-hidden="true" /><p><strong>{gltfStatus.state === "active" ? "ATLETA GLB REAL" : "MODELO HUMANO 3D"}</strong><small>{gltfStatus.state === "active" ? gltfStatus.message : spec.profile}</small></p></div>
        <span className="motion-view-chip">3D · 360°</span>
      </header>
      <div ref={stageRef} className="motion-stage motion-stage-3d">
        <canvas ref={canvasRef} role="img" aria-label={`${exercise.name}: modelo humano 3D interativo. Arraste para girar e use pinça ou rolagem para zoom.`} onDoubleClick={() => viewerApiRef.current?.resetCamera()} />
        {!ready && !renderError && <div className="motion-3d-loading" role="status"><span /> Preparando atleta 3D…</div>}
        {renderError && <div className="motion-3d-error" role="alert"><strong>Visualização 3D indisponível</strong><span>{renderError}</span></div>}
        {ready && gltfStatus.state !== "not-configured" && (
          <div className={`motion-gltf-status is-${gltfStatus.state}`} role="status">
            <i aria-hidden="true" />
            {gltfStatus.message}
          </div>
        )}
        <div className="motion-3d-hint"><Rotate3D size={14} /> Arraste para girar · pinça/scroll para zoom</div>
        <div className="motion-muscle-legend" aria-label="Legenda de ativação muscular"><span><i className="primary" /> Principal</span><span><i className="secondary" /> Secundário</span></div>
        <div className="motion-stage-label"><span>{exercise.primary}</span><strong>{spec.coachingCue}</strong></div>
        <div className="motion-progress" aria-hidden="true"><i ref={progressRef} /></div>
      </div>
      <div className="motion-controls" role="group" aria-label="Controles do modelo humano 3D">
        <button type="button" className="motion-primary-control" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pausar animação" : "Reproduzir animação"} aria-pressed={playing}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <div className="motion-speed-control" aria-label="Velocidade de reprodução">
          {([0.5, 1, 1.5] as const).map((value) => <button key={value} type="button" className={speed === value ? "active" : ""} onClick={() => setSpeed(value)} aria-pressed={speed === value}>{value}x</button>)}
        </div>
        <button type="button" onClick={restart} aria-label="Reiniciar animação" title="Reiniciar"><RotateCcw size={17} /></button>
        <button type="button" onClick={() => viewerApiRef.current?.rotateCamera()} aria-label="Girar câmera em 45 graus" title="Girar câmera"><Rotate3D size={17} /></button>
        <button type="button" onClick={() => viewerApiRef.current?.zoomCamera(1.16)} aria-label="Afastar câmera" title="Afastar câmera"><ZoomOut size={17} /></button>
        <button type="button" onClick={() => viewerApiRef.current?.zoomCamera(0.86)} aria-label="Aproximar câmera" title="Aproximar câmera"><ZoomIn size={17} /></button>
        <button type="button" onClick={() => viewerApiRef.current?.resetCamera()} aria-label="Restaurar câmera" title="Restaurar câmera"><RotateCcw size={17} /></button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen || expandedFallback ? "Sair da tela cheia" : "Abrir em tela cheia"} title="Tela cheia">{fullscreen || expandedFallback ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <footer className="motion-player-footer"><span><i /> {gltfStatus.state === "active" ? "GLB real · AnimationMixer" : gltfStatus.state === "fallback" ? "Fallback procedural · WebGL2" : "Atleta anatômico · WebGL2"}</span><code>{gltfProfile?.clipName || exercise.animationFile}</code></footer>
      <span className="sr-only" aria-live="polite">{playing ? `Animação 3D em reprodução a ${speed} vezes a velocidade normal.` : "Animação 3D pausada. Pressione Play para iniciar."}</span>
    </section>
  );
}
