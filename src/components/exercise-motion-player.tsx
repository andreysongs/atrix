"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CatalogExercise } from "@/lib/exercise-catalog";

type MotionExercise = Pick<
  CatalogExercise,
  "id" | "name" | "category" | "equipment" | "movement" | "primary" | "animationFile"
>;

type Point = { x: number; y: number };
type JointName =
  | "head"
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR";
type Pose = Record<JointName, Point>;

type SceneKind =
  | "floor"
  | "mat"
  | "bench"
  | "incline-bench"
  | "machine"
  | "pullup"
  | "parallel"
  | "cable-high"
  | "cable-low"
  | "step"
  | "pole";

type MotionSpec = {
  profile: string;
  coachingCue: string;
  frames: Pose[];
  duration: number;
  scene: SceneKind;
  view: "frontal" | "lateral";
};

const joints: JointName[] = [
  "head", "neck", "shoulderL", "shoulderR", "elbowL", "elbowR", "wristL", "wristR",
  "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR",
];

const standingFront: Pose = {
  head: { x: 320, y: 53 }, neck: { x: 320, y: 82 },
  shoulderL: { x: 286, y: 94 }, shoulderR: { x: 354, y: 94 },
  elbowL: { x: 278, y: 143 }, elbowR: { x: 362, y: 143 },
  wristL: { x: 276, y: 192 }, wristR: { x: 364, y: 192 },
  hipL: { x: 303, y: 190 }, hipR: { x: 337, y: 190 },
  kneeL: { x: 299, y: 254 }, kneeR: { x: 341, y: 254 },
  ankleL: { x: 293, y: 320 }, ankleR: { x: 347, y: 320 },
};

const standingSide: Pose = {
  head: { x: 362, y: 54 }, neck: { x: 350, y: 84 },
  shoulderL: { x: 344, y: 99 }, shoulderR: { x: 357, y: 98 },
  elbowL: { x: 350, y: 148 }, elbowR: { x: 365, y: 147 },
  wristL: { x: 354, y: 197 }, wristR: { x: 370, y: 196 },
  hipL: { x: 323, y: 188 }, hipR: { x: 338, y: 188 },
  kneeL: { x: 325, y: 253 }, kneeR: { x: 342, y: 252 },
  ankleL: { x: 314, y: 320 }, ankleR: { x: 350, y: 320 },
};

const seatedSide: Pose = {
  head: { x: 365, y: 61 }, neck: { x: 352, y: 91 },
  shoulderL: { x: 345, y: 106 }, shoulderR: { x: 359, y: 105 },
  elbowL: { x: 351, y: 155 }, elbowR: { x: 366, y: 154 },
  wristL: { x: 355, y: 204 }, wristR: { x: 371, y: 203 },
  hipL: { x: 326, y: 198 }, hipR: { x: 341, y: 198 },
  kneeL: { x: 397, y: 232 }, kneeR: { x: 408, y: 240 },
  ankleL: { x: 394, y: 315 }, ankleR: { x: 420, y: 315 },
};

const lyingSide: Pose = {
  head: { x: 459, y: 199 }, neck: { x: 429, y: 207 },
  shoulderL: { x: 397, y: 211 }, shoulderR: { x: 405, y: 220 },
  elbowL: { x: 398, y: 157 }, elbowR: { x: 407, y: 166 },
  wristL: { x: 398, y: 105 }, wristR: { x: 407, y: 113 },
  hipL: { x: 302, y: 218 }, hipR: { x: 313, y: 226 },
  kneeL: { x: 246, y: 257 }, kneeR: { x: 260, y: 266 },
  ankleL: { x: 223, y: 318 }, ankleR: { x: 241, y: 318 },
};

const plankSide: Pose = {
  head: { x: 472, y: 143 }, neck: { x: 443, y: 158 },
  shoulderL: { x: 411, y: 170 }, shoulderR: { x: 418, y: 179 },
  elbowL: { x: 407, y: 207 }, elbowR: { x: 416, y: 212 },
  wristL: { x: 405, y: 244 }, wristR: { x: 418, y: 246 },
  hipL: { x: 321, y: 181 }, hipR: { x: 328, y: 190 },
  kneeL: { x: 246, y: 199 }, kneeR: { x: 253, y: 208 },
  ankleL: { x: 171, y: 221 }, ankleR: { x: 178, y: 230 },
};

const hangingFront: Pose = {
  head: { x: 320, y: 111 }, neck: { x: 320, y: 139 },
  shoulderL: { x: 296, y: 151 }, shoulderR: { x: 344, y: 151 },
  elbowL: { x: 289, y: 103 }, elbowR: { x: 351, y: 103 },
  wristL: { x: 276, y: 55 }, wristR: { x: 364, y: 55 },
  hipL: { x: 305, y: 222 }, hipR: { x: 335, y: 222 },
  kneeL: { x: 302, y: 276 }, kneeR: { x: 338, y: 276 },
  ankleL: { x: 296, y: 334 }, ankleR: { x: 344, y: 334 },
};

const kneelingSide: Pose = {
  head: { x: 370, y: 72 }, neck: { x: 358, y: 102 },
  shoulderL: { x: 350, y: 116 }, shoulderR: { x: 364, y: 116 },
  elbowL: { x: 356, y: 162 }, elbowR: { x: 370, y: 162 },
  wristL: { x: 360, y: 205 }, wristR: { x: 376, y: 205 },
  hipL: { x: 330, y: 205 }, hipR: { x: 344, y: 205 },
  kneeL: { x: 314, y: 274 }, kneeR: { x: 340, y: 277 },
  ankleL: { x: 260, y: 318 }, ankleR: { x: 288, y: 320 },
};

const quadrupedSide: Pose = {
  head: { x: 452, y: 150 }, neck: { x: 423, y: 168 },
  shoulderL: { x: 394, y: 177 }, shoulderR: { x: 401, y: 187 },
  elbowL: { x: 397, y: 219 }, elbowR: { x: 405, y: 225 },
  wristL: { x: 401, y: 265 }, wristR: { x: 412, y: 267 },
  hipL: { x: 308, y: 189 }, hipR: { x: 315, y: 199 },
  kneeL: { x: 301, y: 249 }, kneeR: { x: 313, y: 255 },
  ankleL: { x: 254, y: 276 }, ankleR: { x: 268, y: 281 },
};

function pose(base: Pose, overrides: Partial<Pose>): Pose {
  return Object.fromEntries(joints.map((joint) => [joint, overrides[joint] || base[joint]])) as Pose;
}

function shift(base: Pose, dx: number, dy: number): Pose {
  return Object.fromEntries(joints.map((joint) => [joint, { x: base[joint].x + dx, y: base[joint].y + dy }])) as Pose;
}

function rotate(base: Pose, degrees: number, center: Point = { x: 320, y: 190 }): Pose {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return Object.fromEntries(joints.map((joint) => {
    const point = base[joint];
    const x = point.x - center.x;
    const y = point.y - center.y;
    return [joint, { x: center.x + x * cosine - y * sine, y: center.y + x * sine + y * cosine }];
  })) as Pose;
}

function interpolatePose(frames: Pose[], phase: number): Pose {
  const validFrames = frames.filter((frame): frame is Pose => Boolean(frame));
  if (validFrames.length === 0) return standingFront;
  const normalizedPhase = Number.isFinite(phase) ? ((phase % 1) + 1) % 1 : 0;
  const framePosition = normalizedPhase * validFrames.length;
  const frameIndex = Math.floor(framePosition) % validFrames.length;
  const nextIndex = (frameIndex + 1) % validFrames.length;
  const local = framePosition - Math.floor(framePosition);
  const eased = (1 - Math.cos(local * Math.PI)) / 2;
  return Object.fromEntries(joints.map((joint) => {
    const from = validFrames[frameIndex][joint] || standingFront[joint];
    const to = validFrames[nextIndex][joint] || from;
    return [joint, { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased }];
  })) as Pose;
}

function deterministicDuration(id: string, base: number) {
  const hash = Array.from(id).reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return Math.round(base * (0.97 + (Math.abs(hash) % 7) / 100));
}

function resolveMotion(exercise: MotionExercise): MotionSpec {
  const id = exercise.id.toLowerCase();
  const latinId = id.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const movement = exercise.movement.toLowerCase();
  const equipment = exercise.equipment.toLowerCase();
  const make = (profile: string, coachingCue: string, frames: Pose[], duration: number, scene: SceneKind, view: MotionSpec["view"]): MotionSpec => ({
    profile,
    coachingCue,
    frames,
    duration: deterministicDuration(id, duration),
    scene,
    view,
  });

  if (movement === "body-control") {
    if (id.includes("handstand")) {
      const inverted = rotate(standingFront, 180, { x: 320, y: 188 });
      return make("Parada de mãos — controle invertido", "Empurre o solo e mantenha costelas e pelve empilhadas.", [inverted, pose(inverted, { ankleL: { x: 304, y: 49 }, ankleR: { x: 336, y: 49 } })], 3300, "floor", "frontal");
    }
    if (id.includes("human-flag")) {
      const flag = shift(rotate(standingFront, -90, { x: 320, y: 190 }), 12, 0);
      return make("Bandeira humana — alavanca lateral", "Trave o core e empurre/puxe o poste com braços opostos.", [flag, pose(flag, { ankleL: { x: 478, y: 166 }, ankleR: { x: 478, y: 198 } })], 3500, "pole", "lateral");
    }
    if (id.includes("front-lever") || id.includes("back-lever") || id.includes("planche")) {
      const horizontal = shift(rotate(hangingFront, id.includes("back") ? 88 : -88, { x: 320, y: 155 }), 0, 52);
      return make(id.includes("planche") ? "Planche — sustentação horizontal" : id.includes("back") ? "Back lever — alavanca posterior" : "Front lever — alavanca anterior", "Mantenha cotovelos estendidos e quadril alinhado aos ombros.", [horizontal, shift(horizontal, 0, -7)], 3600, id.includes("planche") ? "floor" : "pullup", "lateral");
    }
    if (id.includes("l-sit")) {
      const lSit = pose(seatedSide, { wristL: { x: 320, y: 224 }, wristR: { x: 337, y: 224 }, kneeL: { x: 407, y: 204 }, kneeR: { x: 412, y: 216 }, ankleL: { x: 478, y: 204 }, ankleR: { x: 482, y: 217 } });
      return make("L-sit — compressão isométrica", "Depressione os ombros e sustente pernas estendidas sem perder o tronco.", [lSit, shift(lSit, 0, -6)], 3200, "parallel", "lateral");
    }
    if (id.includes("muscle-up")) {
      const top = pose(shift(hangingFront, 0, -86), { wristL: { x: 276, y: 55 }, wristR: { x: 364, y: 55 }, elbowL: { x: 292, y: 66 }, elbowR: { x: 348, y: 66 }, shoulderL: { x: 302, y: 42 }, shoulderR: { x: 338, y: 42 } });
      return make("Muscle-up — puxada, transição e apoio", "Conduza o peito à barra antes de girar os punhos para o apoio.", [hangingFront, pose(hangingFront, { head: { x: 320, y: 65 }, neck: { x: 320, y: 91 }, shoulderL: { x: 291, y: 105 }, shoulderR: { x: 349, y: 105 }, hipL: { x: 305, y: 174 }, hipR: { x: 335, y: 174 } }), top], 3900, "pullup", "frontal");
    }
    return make("Controle escapular suspenso", "Alongue o corpo e mova as escápulas sem perder o alinhamento.", [hangingFront, shift(hangingFront, 0, -14)], 2800, "pullup", "frontal");
  }

  if (movement === "horizontal-press") {
    if (latinId.includes("push-up") || latinId.includes("flexao")) {
      const lowered = pose(plankSide, { head: { x: 469, y: 192 }, neck: { x: 441, y: 203 }, shoulderL: { x: 409, y: 209 }, shoulderR: { x: 417, y: 217 }, elbowL: { x: 371, y: 221 }, elbowR: { x: 382, y: 229 }, hipL: { x: 321, y: 207 }, hipR: { x: 329, y: 215 }, kneeL: { x: 246, y: 211 }, kneeR: { x: 253, y: 219 } });
      return make(id.includes("diamond") ? "Flexão diamante — base estreita" : id.includes("decline") || id.includes("feet") ? "Flexão declinada — pés elevados" : id.includes("incline") ? "Flexão inclinada — apoio elevado" : id.includes("explosive") ? "Flexão explosiva — aceleração controlada" : "Flexão — cadeia corporal rígida", "Desça em bloco, cotovelos controlados e mãos firmes no apoio.", [plankSide, lowered], id.includes("explosive") ? 1750 : 2400, id.includes("incline") || id.includes("decline") || id.includes("feet") ? "step" : "floor", "lateral");
    }
    if (/bench|floor|smith|jm-press|supino/.test(latinId)) {
      const isIncline = latinId.includes("inclinado") || latinId.includes("incline");
      const isDecline = latinId.includes("declinado") || latinId.includes("decline");
      const benchPose = isIncline ? rotate(lyingSide, -11, { x: 352, y: 238 }) : isDecline ? rotate(lyingSide, 7, { x: 352, y: 238 }) : lyingSide;
      const lowered = pose(benchPose, {
        elbowL: { x: 357, y: benchPose.elbowL.y + 19 },
        elbowR: { x: 368, y: benchPose.elbowR.y + 19 },
        wristL: { x: 394, y: benchPose.wristL.y + 52 },
        wristR: { x: 404, y: benchPose.wristR.y + 52 },
      });
      const profile = isIncline
        ? "Supino inclinado - trajetoria diagonal"
        : isDecline
          ? "Supino declinado - arco inferior"
          : latinId.includes("fechado") || latinId.includes("close") || latinId.includes("jm")
            ? "Press fechado - enfase em triceps"
            : "Supino horizontal - press guiado";
      return make(profile, "Mantenha escapulas apoiadas e antebracos alinhados sob a carga.", [benchPose, lowered], 2500, isIncline ? "incline-bench" : "bench", "lateral");
    }
    const extended = pose(standingSide, { elbowL: { x: 414, y: 130 }, elbowR: { x: 426, y: 136 }, wristL: { x: 468, y: 130 }, wristR: { x: 480, y: 136 } });
    const loaded = pose(standingSide, { elbowL: { x: 374, y: 137 }, elbowR: { x: 386, y: 143 }, wristL: { x: 390, y: 122 }, wristR: { x: 401, y: 130 } });
    return make(id.includes("landmine") ? "Landmine press — trajetória diagonal convergente" : "Press horizontal em estação", "Pressione à frente sem projetar a cabeça ou perder o core.", [loaded, extended], 2450, equipment.includes("polia") ? "cable-low" : equipment.includes("landmine") ? "floor" : "machine", "lateral");
  }

  if (movement === "fly") {
    if (/rear|reverse|invertido/.test(id)) {
      const bent = pose(standingSide, { head: { x: 414, y: 125 }, neck: { x: 388, y: 143 }, shoulderL: { x: 360, y: 158 }, shoulderR: { x: 369, y: 165 }, hipL: { x: 322, y: 190 }, hipR: { x: 337, y: 193 }, wristL: { x: 405, y: 191 }, wristR: { x: 413, y: 198 } });
      const open = pose(bent, { elbowL: { x: 355, y: 111 }, elbowR: { x: 367, y: 114 }, wristL: { x: 352, y: 70 }, wristR: { x: 365, y: 73 } });
      return make("Crucifixo inverso — abdução posterior", "Abra os braços pela escápula mantendo pescoço neutro.", [bent, open], 2500, equipment.includes("máquina") ? "machine" : "floor", "lateral");
    }
    if (/cable|crossover/.test(id) || equipment.includes("polia")) {
      const open = pose(standingFront, { elbowL: { x: 246, y: 112 }, elbowR: { x: 394, y: 112 }, wristL: { x: 205, y: 124 }, wristR: { x: 435, y: 124 } });
      const closed = pose(standingFront, { elbowL: { x: 287, y: 126 }, elbowR: { x: 353, y: 126 }, wristL: { x: 314, y: 137 }, wristR: { x: 326, y: 137 } });
      return make(id.includes("low") ? "Crossover baixo-alto" : id.includes("high") ? "Crossover alto-baixo" : "Crossover médio — adução de ombro", "Aproxime as mãos em arco sem encolher os ombros.", [open, closed], 2700, "cable-high", "frontal");
    }
    const open = pose(lyingSide, { elbowL: { x: 350, y: 149 }, elbowR: { x: 358, y: 158 }, wristL: { x: 315, y: 177 }, wristR: { x: 324, y: 184 } });
    return make("Crucifixo com apoio — arco controlado", "Preserve uma leve flexão dos cotovelos e limite o alongamento ao conforto.", [lyingSide, open], 2800, id.includes("incline") ? "incline-bench" : "bench", "lateral");
  }

  if (movement === "vertical-press") {
    if (id.includes("dip")) {
      const top = pose(hangingFront, { wristL: { x: 282, y: 151 }, wristR: { x: 358, y: 151 }, elbowL: { x: 286, y: 116 }, elbowR: { x: 354, y: 116 }, shoulderL: { x: 298, y: 90 }, shoulderR: { x: 342, y: 90 }, head: { x: 320, y: 48 }, neck: { x: 320, y: 74 } });
      const bottom = shift(top, 0, 47);
      return make("Paralela — press vertical corporal", "Desça com ombros organizados e pressione as barras para baixo.", [top, bottom], 2700, "parallel", "frontal");
    }
    const loaded = pose(standingFront, { elbowL: { x: 275, y: 127 }, elbowR: { x: 365, y: 127 }, wristL: { x: 289, y: 91 }, wristR: { x: 351, y: 91 } });
    const overhead = pose(standingFront, { elbowL: { x: 300, y: 65 }, elbowR: { x: 340, y: 65 }, wristL: { x: 302, y: 24 }, wristR: { x: 338, y: 24 } });
    return make(id.includes("arnold") ? "Desenvolvimento Arnold — rotação e press" : id.includes("landmine") ? "Landmine press — plano escapular" : "Desenvolvimento vertical — press acima", "Finalize com braços alinhados sem hiperestender a lombar.", [loaded, overhead], 2600, equipment.includes("máquina") ? "machine" : "floor", "frontal");
  }

  if (movement === "vertical-pull") {
    if (/straight-arm|pullover/.test(id)) {
      if (id.includes("dumbbell")) {
        const overhead = pose(lyingSide, { elbowL: { x: 440, y: 150 }, elbowR: { x: 448, y: 158 }, wristL: { x: 486, y: 178 }, wristR: { x: 494, y: 186 } });
        return make("Pullover com halter — arco sobre a cabeça", "Mova pelos ombros mantendo costelas controladas e cotovelos suaves.", [lyingSide, overhead], 2900, "bench", "lateral");
      }
      const overhead = pose(standingSide, { elbowL: { x: 388, y: 94 }, elbowR: { x: 401, y: 99 }, wristL: { x: 421, y: 58 }, wristR: { x: 433, y: 64 } });
      const down = pose(overhead, { elbowL: { x: 381, y: 151 }, elbowR: { x: 394, y: 156 }, wristL: { x: 398, y: 195 }, wristR: { x: 411, y: 199 } });
      return make(id.includes("cable-pullover") ? "Pullover no cabo — extensão de ombro" : "Pulldown com braços estendidos", "Conduza os braços em arco sem transformar o movimento em tríceps.", [overhead, down], 2750, "cable-high", "lateral");
    }
    if (id.includes("high-pull")) {
      const loaded = pose(standingFront, { wristL: { x: 298, y: 205 }, wristR: { x: 342, y: 205 } });
      const high = pose(loaded, { elbowL: { x: 258, y: 104 }, elbowR: { x: 382, y: 104 }, wristL: { x: 299, y: 116 }, wristR: { x: 341, y: 116 } });
      return make("High pull — puxada explosiva alta", "Estenda quadril e conduza os cotovelos altos, mantendo a barra próxima.", [loaded, high], 2100, "floor", "frontal");
    }
    if (/pull-up|pullup|chin-up/.test(id) || equipment.includes("barra fixa")) {
      const top = pose(shift(hangingFront, 0, -58), { wristL: hangingFront.wristL, wristR: hangingFront.wristR, elbowL: { x: 270, y: 96 }, elbowR: { x: 370, y: 96 }, shoulderL: { x: 291, y: 100 }, shoulderR: { x: 349, y: 100 } });
      return make(id.includes("assisted") ? "Barra assistida — puxada vertical guiada" : id.includes("chin") ? "Barra supinada — puxada fechada" : id.includes("neutral") ? "Barra neutra — puxada vertical" : "Barra pronada — puxada vertical", "Leve o peito à barra iniciando pela depressão das escápulas.", [hangingFront, top], 2900, id.includes("assisted") ? "machine" : "pullup", "frontal");
    }
    const start = pose(seatedSide, { elbowL: { x: 337, y: 102 }, elbowR: { x: 352, y: 101 }, wristL: { x: 326, y: 52 }, wristR: { x: 350, y: 51 } });
    const pulled = pose(start, { elbowL: { x: 325, y: 139 }, elbowR: { x: 342, y: 139 }, wristL: { x: 346, y: 112 }, wristR: { x: 361, y: 112 } });
    return make(id.includes("straight-arm") ? "Pulldown com braços estendidos" : id.includes("supinated") ? "Puxada supinada na polia" : "Puxada vertical na polia", "Conduza os cotovelos para baixo sem balançar o tronco.", [start, pulled], 2700, "cable-high", "lateral");
  }

  if (movement === "horizontal-pull") {
    if (id.includes("facepull")) {
      const long = pose(standingFront, { elbowL: { x: 292, y: 122 }, elbowR: { x: 348, y: 122 }, wristL: { x: 309, y: 145 }, wristR: { x: 331, y: 145 } });
      const pulled = pose(long, { elbowL: { x: 248, y: 88 }, elbowR: { x: 392, y: 88 }, wristL: { x: 299, y: 78 }, wristR: { x: 341, y: 78 } });
      return make("Face pull — rotação externa e retração", "Puxe a corda em direção ao rosto com cotovelos altos e ombros baixos.", [long, pulled], 2600, "cable-high", "frontal");
    }
    if (id.includes("upright-row")) {
      const low = pose(standingFront, { wristL: { x: 302, y: 207 }, wristR: { x: 338, y: 207 } });
      const high = pose(low, { elbowL: { x: 258, y: 105 }, elbowR: { x: 382, y: 105 }, wristL: { x: 302, y: 118 }, wristR: { x: 338, y: 118 } });
      return make("Remada alta — abdução com cotovelos", "Suba apenas até uma amplitude confortável mantendo a carga próxima.", [low, high], 2500, "floor", "frontal");
    }
    if (id.includes("inverted")) {
      const low = rotate(plankSide, 180, { x: 320, y: 205 });
      return make("Remada invertida — corpo em prancha", "Puxe o peito ao apoio mantendo quadril e costelas alinhados.", [low, shift(low, 0, -30)], 2700, "pullup", "lateral");
    }
    if (/seated|machine|low-row/.test(id) || equipment.includes("polia") || equipment.includes("máquina")) {
      const long = pose(seatedSide, { elbowL: { x: 405, y: 145 }, elbowR: { x: 417, y: 151 }, wristL: { x: 460, y: 153 }, wristR: { x: 470, y: 158 } });
      const row = pose(seatedSide, { elbowL: { x: 319, y: 148 }, elbowR: { x: 329, y: 154 }, wristL: { x: 352, y: 161 }, wristR: { x: 362, y: 167 } });
      return make("Remada sentada — retração escapular", "Termine com cotovelos atrás do tronco, sem elevar os ombros.", [long, row], 2700, equipment.includes("polia") ? "cable-low" : "machine", "lateral");
    }
    const hinge = pose(standingSide, { head: { x: 420, y: 134 }, neck: { x: 394, y: 151 }, shoulderL: { x: 365, y: 164 }, shoulderR: { x: 375, y: 171 }, elbowL: { x: 383, y: 204 }, elbowR: { x: 394, y: 210 }, wristL: { x: 405, y: 245 }, wristR: { x: 416, y: 250 } });
    const row = pose(hinge, { elbowL: { x: 338, y: 185 }, elbowR: { x: 348, y: 192 }, wristL: { x: 365, y: 201 }, wristR: { x: 376, y: 207 } });
    return make(id.includes("meadows") ? "Meadows row — remada unilateral" : id.includes("t-bar") ? "Remada cavalinho — puxada convergente" : "Remada inclinada — puxada horizontal", "Mantenha a coluna longa e conduza a carga ao tronco.", [hinge, row], 2750, "floor", "lateral");
  }

  if (movement === "curl") {
    if (id.includes("wrist-roller")) {
      const low = pose(standingFront, { elbowL: { x: 290, y: 131 }, elbowR: { x: 350, y: 131 }, wristL: { x: 301, y: 157 }, wristR: { x: 339, y: 157 } });
      const rolled = pose(low, { wristL: { x: 297, y: 150 }, wristR: { x: 343, y: 164 } });
      return make("Wrist roller — enrolamento alternado", "Mantenha braços estáveis e alterne os punhos sem compensar pelos ombros.", [low, rolled, low, pose(low, { wristL: { x: 305, y: 164 }, wristR: { x: 335, y: 150 } })], 3600, "floor", "frontal");
    }
    if (id.includes("wrist")) {
      const base = pose(seatedSide, { elbowL: { x: 386, y: 204 }, elbowR: { x: 397, y: 211 }, wristL: { x: 430, y: 207 }, wristR: { x: 440, y: 214 } });
      const flexed = pose(base, { wristL: { x: 436, y: 187 }, wristR: { x: 446, y: 194 } });
      return make("Flexão de punho — alavanca curta", "Mova apenas os punhos, mantendo antebraços apoiados.", [base, flexed], 2200, "bench", "lateral");
    }
    const start = standingFront;
    const both = pose(start, { elbowL: { x: 278, y: 145 }, elbowR: { x: 362, y: 145 }, wristL: { x: 294, y: 106 }, wristR: { x: 346, y: 106 } });
    if (id.includes("alternating")) {
      const left = pose(start, { wristL: { x: 294, y: 106 } });
      const right = pose(start, { wristR: { x: 346, y: 106 } });
      return make("Rosca alternada — controle unilateral", "Mantenha cotovelos junto ao tronco e alterne sem inclinar o corpo.", [start, left, start, right], 3900, "floor", "frontal");
    }
    return make(id.includes("hammer") ? "Rosca martelo — pegada neutra" : id.includes("preacher") ? "Rosca Scott — braço apoiado" : id.includes("incline") || id.includes("bayesian") ? "Rosca em alongamento de ombro" : "Rosca de cotovelo — flexão controlada", "Flexione os cotovelos sem deslocar os ombros para a frente.", [start, both], 2450, /preacher|incline|concentration|spider|machine/.test(id) ? "bench" : equipment.includes("polia") ? "cable-low" : "floor", "frontal");
  }

  if (movement === "extension") {
    if (id.includes("wrist")) {
      const base = pose(seatedSide, { elbowL: { x: 386, y: 204 }, elbowR: { x: 397, y: 211 }, wristL: { x: 430, y: 207 }, wristR: { x: 440, y: 214 } });
      return make("Extensão de punho — alavanca curta", "Eleve o dorso das mãos mantendo os antebraços estáveis.", [base, pose(base, { wristL: { x: 434, y: 224 }, wristR: { x: 444, y: 231 } })], 2200, "bench", "lateral");
    }
    if (/skull|tate|testa/.test(id)) {
      const flexed = pose(lyingSide, { elbowL: { x: 398, y: 151 }, elbowR: { x: 407, y: 160 }, wristL: { x: 440, y: 177 }, wristR: { x: 449, y: 185 } });
      return make("Tríceps testa — extensão de cotovelo", "Mantenha braços estáveis e estenda sem abrir os cotovelos.", [flexed, lyingSide], 2500, "bench", "lateral");
    }
    if (/overhead|french/.test(id)) {
      const flexed = pose(standingFront, { elbowL: { x: 302, y: 79 }, elbowR: { x: 338, y: 79 }, wristL: { x: 310, y: 123 }, wristR: { x: 330, y: 123 } });
      const extended = pose(flexed, { wristL: { x: 307, y: 32 }, wristR: { x: 333, y: 32 } });
      return make("Extensão de tríceps acima da cabeça", "Aponte cotovelos à frente e evite compensar com a lombar.", [flexed, extended], 2600, equipment.includes("polia") ? "cable-low" : "floor", "frontal");
    }
    const loaded = pose(standingSide, { elbowL: { x: 349, y: 144 }, elbowR: { x: 362, y: 145 }, wristL: { x: 390, y: 159 }, wristR: { x: 401, y: 164 } });
    const extended = pose(loaded, { wristL: { x: 357, y: 205 }, wristR: { x: 372, y: 205 } });
    return make(id.includes("kickback") ? "Coice de tríceps — braço junto ao tronco" : "Pushdown — extensão na polia", "Estenda totalmente sem mover o braço ou balançar o tronco.", [loaded, extended], 2350, equipment.includes("polia") ? "cable-high" : "floor", "lateral");
  }

  if (movement === "raise") {
    const lateral = pose(standingFront, { elbowL: { x: 247, y: 103 }, elbowR: { x: 393, y: 103 }, wristL: { x: 207, y: 104 }, wristR: { x: 433, y: 104 } });
    const front = pose(standingFront, { elbowL: { x: 299, y: 120 }, elbowR: { x: 341, y: 120 }, wristL: { x: 305, y: 81 }, wristR: { x: 335, y: 81 } });
    const yRaise = pose(standingFront, { elbowL: { x: 280, y: 66 }, elbowR: { x: 360, y: 66 }, wristL: { x: 255, y: 30 }, wristR: { x: 385, y: 30 } });
    return make(/y-raise|prone-y/.test(id) ? "Elevação em Y — plano escapular" : /t-raise/.test(id) ? "Elevação em T — deltoide posterior" : id.includes("front") ? "Elevação frontal — flexão de ombro" : "Elevação lateral — abdução de ombro", "Eleve sem encolher os ombros e pare antes de perder o alinhamento.", [standingFront, /y-raise|prone-y/.test(id) ? yRaise : id.includes("front") ? front : lateral], 2550, equipment.includes("polia") ? "cable-low" : "floor", "frontal");
  }

  if (movement === "squat") {
    if (id === "leg-press") {
      const loaded = pose(seatedSide, { hipL: { x: 326, y: 210 }, hipR: { x: 341, y: 210 }, kneeL: { x: 404, y: 230 }, kneeR: { x: 414, y: 240 }, ankleL: { x: 448, y: 168 }, ankleR: { x: 459, y: 178 } });
      const extended = pose(loaded, { kneeL: { x: 438, y: 190 }, kneeR: { x: 448, y: 200 }, ankleL: { x: 505, y: 142 }, ankleR: { x: 516, y: 152 } });
      return make("Leg press — extensão guiada de pernas", "Pressione a plataforma sem bloquear os joelhos ou perder a pelve no encosto.", [loaded, extended], 3000, "machine", "lateral");
    }
    const bottom = pose(standingFront, { head: { x: 320, y: 112 }, neck: { x: 320, y: 139 }, shoulderL: { x: 286, y: 149 }, shoulderR: { x: 354, y: 149 }, elbowL: { x: 278, y: 179 }, elbowR: { x: 362, y: 179 }, wristL: { x: 296, y: 153 }, wristR: { x: 344, y: 153 }, hipL: { x: 300, y: 232 }, hipR: { x: 340, y: 232 }, kneeL: { x: 268, y: 262 }, kneeR: { x: 372, y: 262 } });
    return make(id.includes("front") ? "Agachamento frontal — tronco vertical" : id.includes("sumo") ? "Agachamento sumô — base ampla" : id.includes("sissy") ? "Sissy squat — dominância de joelho" : id.includes("hack") || id.includes("pendulum") ? "Agachamento guiado — trilho de máquina" : "Agachamento — flexão coordenada de quadril e joelho", "Joelhos acompanham os pés; mantenha pressão uniforme e coluna estável.", [standingFront, bottom], 3000, equipment.includes("máquina") ? "machine" : "floor", "frontal");
  }

  if (movement === "hinge") {
    const hinged = pose(standingSide, { head: { x: 421, y: 139 }, neck: { x: 394, y: 155 }, shoulderL: { x: 365, y: 168 }, shoulderR: { x: 375, y: 175 }, elbowL: { x: 385, y: 207 }, elbowR: { x: 396, y: 214 }, wristL: { x: 401, y: 252 }, wristR: { x: 413, y: 256 }, kneeL: { x: 337, y: 249 }, kneeR: { x: 350, y: 253 } });
    const swing = pose(standingSide, { elbowL: { x: 399, y: 111 }, elbowR: { x: 411, y: 116 }, wristL: { x: 448, y: 102 }, wristR: { x: 459, y: 108 } });
    return make(id.includes("kettlebell") ? "Kettlebell swing — extensão balística de quadril" : id.includes("sumo") ? "Terra sumô — hinge com base ampla" : id.includes("good-morning") ? "Good morning — hinge com carga posterior" : "Levantamento terra romeno — hinge de quadril", "Leve o quadril para trás mantendo coluna neutra e carga próxima ao corpo.", [hinged, id.includes("kettlebell") ? swing : standingSide], id.includes("kettlebell") ? 1900 : 3100, "floor", "lateral");
  }

  if (movement === "lunge") {
    const split = pose(standingSide, { hipL: { x: 326, y: 211 }, hipR: { x: 340, y: 211 }, kneeL: { x: 394, y: 259 }, ankleL: { x: 424, y: 320 }, kneeR: { x: 292, y: 264 }, ankleR: { x: 238, y: 320 } });
    const low = pose(split, { head: { x: 361, y: 83 }, neck: { x: 350, y: 112 }, shoulderL: { x: 343, y: 127 }, shoulderR: { x: 357, y: 126 }, hipL: { x: 325, y: 224 }, hipR: { x: 340, y: 224 }, kneeL: { x: 398, y: 261 }, kneeR: { x: 292, y: 278 } });
    return make(id.includes("curtsy") ? "Afundo cruzado — plano diagonal" : id.includes("walking") ? "Passada — transferência alternada" : id.includes("step-up") ? "Step-up — subida unilateral" : id.includes("bulgarian") ? "Agachamento búlgaro — apoio traseiro" : "Afundo — descida unilateral", "Desça verticalmente e mantenha o joelho alinhado ao segundo dedo do pé.", [split, low], 3000, id.includes("step") || id.includes("bulgarian") ? "step" : "floor", "lateral");
  }

  if (movement === "knee-flexion") {
    if (id.includes("nordic") || id.includes("glute-ham")) {
      const upright = kneelingSide;
      const lowered = pose(upright, { head: { x: 443, y: 157 }, neck: { x: 416, y: 173 }, shoulderL: { x: 386, y: 186 }, shoulderR: { x: 397, y: 193 }, hipL: { x: 337, y: 211 }, hipR: { x: 348, y: 218 } });
      return make("Flexão nórdica — controle excêntrico", "Mantenha ombros, quadril e joelhos alinhados durante a descida.", [upright, lowered], 3400, "mat", "lateral");
    }
    const extended = pose(lyingSide, { kneeL: { x: 238, y: 223 }, kneeR: { x: 250, y: 232 }, ankleL: { x: 170, y: 223 }, ankleR: { x: 182, y: 232 } });
    const curled = pose(extended, { ankleL: { x: 250, y: 153 }, ankleR: { x: 264, y: 162 } });
    return make(id.includes("seated") ? "Flexora sentada — flexão de joelho" : "Mesa flexora — flexão de joelho", "Flexione sem levantar o quadril ou acelerar a volta.", [extended, curled], 2700, "machine", "lateral");
  }

  if (movement === "knee-extension") {
    const loaded = seatedSide;
    const extended = pose(seatedSide, { kneeL: { x: 400, y: 224 }, kneeR: { x: 411, y: 232 }, ankleL: { x: 474, y: 224 }, ankleR: { x: 484, y: 232 } });
    return make("Cadeira extensora — extensão de joelho", "Estenda sem tirar o quadril do assento e retorne controlando.", [loaded, extended], 2600, "machine", "lateral");
  }

  if (movement === "hip-extension") {
    if (/bridge|hip-thrust/.test(id)) {
      const low = pose(lyingSide, { head: { x: 448, y: 242 }, neck: { x: 416, y: 246 }, shoulderL: { x: 385, y: 248 }, shoulderR: { x: 394, y: 256 }, hipL: { x: 302, y: 274 }, hipR: { x: 312, y: 282 }, kneeL: { x: 245, y: 249 }, kneeR: { x: 257, y: 258 } });
      const high = pose(low, { hipL: { x: 306, y: 219 }, hipR: { x: 316, y: 227 }, kneeL: { x: 251, y: 246 }, kneeR: { x: 263, y: 254 } });
      return make(id.includes("single") ? "Ponte unilateral — extensão de quadril" : id.includes("thrust") ? "Hip thrust — extensão de quadril" : "Glute bridge — extensão de quadril", "Finalize com glúteos, sem hiperestender a coluna.", [low, high], 2800, id.includes("thrust") ? "bench" : "mat", "lateral");
    }
    if (id.includes("reverse-hyper")) {
      const low = pose(lyingSide, { head: { x: 432, y: 192 }, neck: { x: 402, y: 200 }, shoulderL: { x: 372, y: 207 }, shoulderR: { x: 380, y: 215 }, hipL: { x: 302, y: 218 }, hipR: { x: 313, y: 226 }, kneeL: { x: 242, y: 264 }, kneeR: { x: 253, y: 272 }, ankleL: { x: 188, y: 304 }, ankleR: { x: 199, y: 312 } });
      const high = pose(low, { kneeL: { x: 238, y: 210 }, kneeR: { x: 249, y: 218 }, ankleL: { x: 178, y: 188 }, ankleR: { x: 189, y: 196 } });
      return make("Reverse hyper — extensão de quadril apoiada", "Eleve as pernas pelo quadril sem comprimir ou hiperestender a lombar.", [low, high], 3000, "bench", "lateral");
    }
    const start = quadrupedSide;
    const kick = pose(start, { kneeL: { x: 271, y: 173 }, ankleL: { x: 210, y: 176 } });
    return make(id.includes("pull-through") ? "Pull through — extensão no cabo" : id.includes("back-extension") || id.includes("hyper") ? "Hiperextensão — extensão controlada" : "Coice de glúteo — extensão unilateral", "Movimente o quadril sem rodar a pelve ou arquear a lombar.", [start, kick], 2700, equipment.includes("polia") ? "cable-low" : equipment.includes("máquina") ? "machine" : "mat", "lateral");
  }

  if (movement === "hip-abduction") {
    if (id.includes("adductor")) {
      const open = pose(standingFront, { kneeL: { x: 270, y: 252 }, kneeR: { x: 370, y: 252 }, ankleL: { x: 244, y: 318 }, ankleR: { x: 396, y: 318 } });
      return make("Adutora — fechamento controlado de quadril", "Aproxime as pernas sem impulso e mantenha a pelve apoiada.", [open, standingFront], 2700, "machine", "frontal");
    }
    if (id.includes("side-lying")) {
      const side = rotate(plankSide, 7, { x: 320, y: 210 });
      const raised = pose(side, { kneeL: { x: 265, y: 162 }, ankleL: { x: 196, y: 136 } });
      return make("Elevação lateral de perna — abdução no solo", "Mantenha a pelve empilhada e eleve a perna sem rodar o pé.", [side, raised], 2700, "mat", "lateral");
    }
    if (/clamshell|fire-hydrant|donkey/.test(id)) {
      const open = pose(quadrupedSide, { kneeL: { x: 295, y: 202 }, ankleL: { x: 254, y: 223 } });
      return make(id.includes("clamshell") ? "Clamshell — rotação/abdução lateral" : "Fire hydrant — abdução em quatro apoios", "Abra o quadril sem girar o tronco ou deslocar o apoio.", [quadrupedSide, open], 2600, "mat", "lateral");
    }
    const open = pose(standingFront, { kneeL: { x: 245, y: 255 }, ankleL: { x: 204, y: 306 } });
    return make(id.includes("lateral-band") || id.includes("monster") ? "Caminhada com faixa — abdução dinâmica" : equipment.includes("máquina") ? "Abdutora — abertura controlada" : "Abdução de quadril — elevação lateral", "Mantenha a pelve nivelada e abra pela lateral do quadril.", [standingFront, open], 2800, equipment.includes("máquina") ? "machine" : equipment.includes("polia") ? "cable-low" : "floor", "frontal");
  }

  if (movement === "ankle-extension") {
    const raised = shift(standingFront, 0, -18);
    raised.ankleL = standingFront.ankleL;
    raised.ankleR = standingFront.ankleR;
    return make(id.includes("seated") ? "Panturrilha sentada — flexão plantar" : id.includes("tibialis") ? "Elevação tibial — dorsiflexão" : id.includes("single") ? "Panturrilha unilateral — flexão plantar" : "Panturrilha em pé — flexão plantar", "Suba pelo hálux, pause no topo e desça sem perder o alinhamento.", [standingFront, raised], 2350, id.includes("step") ? "step" : equipment.includes("máquina") ? "machine" : "floor", "frontal");
  }

  if (movement === "carry") {
    const stride = pose(standingFront, { kneeL: { x: 282, y: 251 }, ankleL: { x: 255, y: 309 }, kneeR: { x: 350, y: 248 }, ankleR: { x: 376, y: 309 } });
    if (id.includes("hold") || id.includes("pinch")) return make(id.includes("pinch") ? "Pinça de anilhas — sustentação isométrica" : "Sustentação de pegada — isometria", "Cresça o tronco e mantenha a carga estável sem inclinar.", [standingFront, shift(standingFront, 0, -5)], 3300, "floor", "frontal");
    return make("Farmer walk — passada carregada", "Cresça o tronco, estabilize a carga e caminhe sem inclinar.", [standingFront, stride, standingFront, pose(stride, { kneeL: stride.kneeR, ankleL: stride.ankleR, kneeR: stride.kneeL, ankleR: stride.ankleL })], 3300, "floor", "frontal");
  }

  if (movement === "rotation") {
    const left = pose(standingFront, { shoulderL: { x: 298, y: 91 }, shoulderR: { x: 365, y: 104 }, elbowL: { x: 273, y: 125 }, elbowR: { x: 351, y: 139 }, wristL: { x: 299, y: 146 }, wristR: { x: 329, y: 153 } });
    const right = pose(standingFront, { shoulderL: { x: 275, y: 104 }, shoulderR: { x: 342, y: 91 }, elbowL: { x: 289, y: 139 }, elbowR: { x: 367, y: 125 }, wristL: { x: 311, y: 153 }, wristR: { x: 341, y: 146 } });
    return make(id.includes("wrist") || id.includes("pronation") ? "Pronação e supinação — rotação do antebraço" : id.includes("woodchop") ? "Woodchop — rotação diagonal" : "Rotação de tronco — controle oblíquo", "Gire pelo tronco sem perder o apoio dos pés e da pelve.", [left, right], 3000, equipment.includes("polia") ? "cable-high" : "floor", "frontal");
  }

  if (movement === "crunch") {
    const flat = pose(lyingSide, { wristL: { x: 435, y: 178 }, wristR: { x: 445, y: 185 } });
    const flexed = pose(flat, { head: { x: 415, y: 149 }, neck: { x: 393, y: 169 }, shoulderL: { x: 365, y: 184 }, shoulderR: { x: 375, y: 192 } });
    return make(id.includes("cable") ? "Crunch ajoelhado na polia" : id.includes("reverse") ? "Crunch reverso — retroversão pélvica" : id.includes("hanging") ? "Elevação abdominal suspensa" : "Crunch — flexão segmentar do tronco", "Aproxime costelas e pelve sem puxar a cabeça.", [flat, flexed], 2700, id.includes("cable") ? "cable-high" : "mat", "lateral");
  }

  if (movement === "antirotation") {
    if (id.includes("ab-wheel")) {
      const start = kneelingSide;
      const rollout = pose(start, { head: { x: 469, y: 143 }, neck: { x: 440, y: 157 }, shoulderL: { x: 410, y: 167 }, shoulderR: { x: 419, y: 176 }, elbowL: { x: 437, y: 199 }, elbowR: { x: 446, y: 207 }, wristL: { x: 468, y: 229 }, wristR: { x: 477, y: 237 }, hipL: { x: 333, y: 211 }, hipR: { x: 344, y: 219 } });
      return make("Ab wheel — rollout em anti-extensão", "Avance a roda mantendo costelas e pelve conectadas, sem ceder a lombar.", [start, rollout], 3400, "mat", "lateral");
    }
    if (id.includes("bird-dog")) {
      const long = pose(quadrupedSide, { elbowL: { x: 452, y: 170 }, wristL: { x: 506, y: 163 }, kneeR: { x: 249, y: 190 }, ankleR: { x: 186, y: 179 } });
      return make("Bird dog — extensão contralateral", "Alcance braço e perna opostos sem girar ou arquear o tronco.", [quadrupedSide, long], 3200, "mat", "lateral");
    }
    if (id.includes("dead-bug")) {
      const start = pose(lyingSide, { elbowL: { x: 400, y: 164 }, elbowR: { x: 410, y: 172 }, wristL: { x: 402, y: 116 }, wristR: { x: 412, y: 124 }, kneeL: { x: 279, y: 175 }, kneeR: { x: 290, y: 183 }, ankleL: { x: 248, y: 132 }, ankleR: { x: 259, y: 140 } });
      const long = pose(start, { wristL: { x: 472, y: 192 }, ankleR: { x: 179, y: 236 } });
      return make("Dead bug — extensão contralateral supina", "Mantenha a lombar apoiada enquanto braço e perna opostos se afastam.", [start, long, start, pose(start, { wristR: { x: 482, y: 199 }, ankleL: { x: 168, y: 228 } })], 4000, "mat", "lateral");
    }
    if (/plank|mountain/.test(id)) {
      const braced = pose(plankSide, { kneeL: { x: 300, y: 222 }, ankleL: { x: 252, y: 236 } });
      return make(id.includes("side") ? "Prancha lateral — anti-inclinação" : id.includes("mountain") ? "Mountain climber — prancha dinâmica" : "Prancha — anti-extensão", "Mantenha costelas, pelve e cabeça alinhadas enquanto resiste ao movimento.", [plankSide, braced], 2900, "mat", "lateral");
    }
    const pressed = pose(standingFront, { elbowL: { x: 302, y: 131 }, elbowR: { x: 338, y: 131 }, wristL: { x: 309, y: 161 }, wristR: { x: 331, y: 161 } });
    const extended = pose(pressed, { elbowL: { x: 309, y: 147 }, elbowR: { x: 331, y: 147 }, wristL: { x: 310, y: 196 }, wristR: { x: 330, y: 196 } });
    return make(id.includes("bird-dog") || id.includes("dead-bug") ? "Estabilidade contralateral — core" : "Pallof press — antirrotação", "Resista à rotação e respire mantendo o tronco imóvel.", [pressed, extended], 3000, equipment.includes("polia") ? "cable-low" : "mat", "frontal");
  }

  if (movement === "shrug") {
    const elevated = pose(standingFront, { shoulderL: { x: 286, y: 79 }, shoulderR: { x: 354, y: 79 }, elbowL: { x: 278, y: 132 }, elbowR: { x: 362, y: 132 }, wristL: { x: 276, y: 181 }, wristR: { x: 364, y: 181 } });
    return make("Encolhimento — elevação escapular", "Eleve os ombros verticalmente sem girar ou projetar a cabeça.", [standingFront, elevated], 2350, equipment.includes("máquina") ? "machine" : "floor", "frontal");
  }

  return make("Padrão motor guiado", "Execute em amplitude confortável, mantendo controle e alinhamento.", [standingFront, shift(standingFront, 0, -12)], 2800, "floor", "frontal");
}

function midpoint(left: Point, right: Point): Point {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function Segment({ from, to, active = false, depth = false }: { from: Point; to: Point; active?: boolean; depth?: boolean }) {
  return (
    <g className={depth ? "motion-rig-depth" : undefined}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="motion-bone-outline" />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={active ? "motion-bone motion-bone-active" : "motion-bone"} />
    </g>
  );
}

function Scene({ spec, pose: current, equipment }: { spec: MotionSpec; pose: Pose; equipment: string }) {
  const lowerEquipment = equipment.toLowerCase();
  const hands = midpoint(current.wristL, current.wristR);
  return (
    <g className="motion-equipment" aria-hidden="true">
      <line x1="64" y1="329" x2="576" y2="329" className="motion-floor-line" />
      {spec.scene === "mat" && <rect x="150" y="315" width="345" height="12" rx="6" className="motion-mat" />}
      {(spec.scene === "bench" || spec.scene === "incline-bench") && (
        <g transform={spec.scene === "incline-bench" ? "rotate(-12 360 244)" : undefined}>
          <rect x="212" y="235" width="282" height="18" rx="8" className="motion-machine-fill" />
          <line x1="255" y1="252" x2="245" y2="322" className="motion-machine-line" />
          <line x1="452" y1="252" x2="462" y2="322" className="motion-machine-line" />
        </g>
      )}
      {spec.scene === "machine" && <path d="M235 318V95h42M235 214h72v15h-72M270 228v90M455 318V92h-42" className="motion-machine-line" />}
      {spec.scene === "pullup" && <path d="M214 48H426M231 48V326M409 48V326" className="motion-machine-line" />}
      {spec.scene === "parallel" && <path d="M248 150h70v8h-70M322 150h70v8h-70M263 158v164M377 158v164" className="motion-machine-line" />}
      {spec.scene === "step" && <path d="M150 278h128v48H150z" className="motion-machine-fill" />}
      {spec.scene === "pole" && <rect x="285" y="25" width="13" height="304" rx="6" className="motion-machine-fill" />}
      {(spec.scene === "cable-high" || spec.scene === "cable-low") && (
        <g>
          <rect x="510" y="54" width="20" height="272" rx="9" className="motion-machine-fill" />
          <circle cx="520" cy={spec.scene === "cable-high" ? 72 : 304} r="7" className="motion-pulley" />
          <line x1="520" y1={spec.scene === "cable-high" ? 72 : 304} x2={hands.x} y2={hands.y} className="motion-cable" />
        </g>
      )}
      {(lowerEquipment.includes("halter") || lowerEquipment.includes("kettlebell")) && (
        <g>
          <circle cx={current.wristL.x} cy={current.wristL.y} r={lowerEquipment.includes("kettlebell") ? 12 : 9} className="motion-weight" />
          <circle cx={current.wristR.x} cy={current.wristR.y} r={lowerEquipment.includes("kettlebell") ? 12 : 9} className="motion-weight" />
        </g>
      )}
      {(lowerEquipment.includes("barra") || lowerEquipment.includes("t-bar")) && !lowerEquipment.includes("barra fixa") && (
        <g>
          <line x1={hands.x - 65} y1={hands.y} x2={hands.x + 65} y2={hands.y} className="motion-bar" />
          <circle cx={hands.x - 57} cy={hands.y} r="12" className="motion-plate" />
          <circle cx={hands.x + 57} cy={hands.y} r="12" className="motion-plate" />
        </g>
      )}
      {(lowerEquipment.includes("band") || lowerEquipment.includes("elástico")) && <line x1={current.ankleL.x} y1={current.ankleL.y} x2={current.ankleR.x} y2={current.ankleR.y} className="motion-band" />}
    </g>
  );
}

function Rig({ pose: current, category, view }: { pose: Pose; category: string; view: MotionSpec["view"] }) {
  const upper = /Peito|Costas|Ombros|Trapézio|Bíceps|Tríceps|Antebraços/i.test(category);
  const lower = /Quadríceps|Posteriores|Glúteos|Panturrilhas|Pernas/i.test(category);
  const core = /Abdômen|Core|Lombar|Calistenia/i.test(category);
  const shoulderMid = midpoint(current.shoulderL, current.shoulderR);
  const hipMid = midpoint(current.hipL, current.hipR);
  const side = view === "lateral";
  return (
    <g className="motion-rig">
      <ellipse cx={hipMid.x} cy="326" rx={side ? 106 : 70} ry="9" className="motion-shadow" />
      <Segment from={current.shoulderL} to={current.elbowL} active={upper} depth />
      <Segment from={current.elbowL} to={current.wristL} active={upper} depth />
      <Segment from={current.hipL} to={current.kneeL} active={lower} depth />
      <Segment from={current.kneeL} to={current.ankleL} active={lower} depth />
      <polygon points={`${current.shoulderL.x},${current.shoulderL.y} ${current.shoulderR.x},${current.shoulderR.y} ${current.hipR.x},${current.hipR.y} ${current.hipL.x},${current.hipL.y}`} className={core ? "motion-torso motion-torso-active" : "motion-torso"} />
      <Segment from={current.neck} to={shoulderMid} active={upper || core} />
      <Segment from={shoulderMid} to={hipMid} active={core} />
      <Segment from={current.shoulderR} to={current.elbowR} active={upper} />
      <Segment from={current.elbowR} to={current.wristR} active={upper} />
      <Segment from={current.hipR} to={current.kneeR} active={lower} />
      <Segment from={current.kneeR} to={current.ankleR} active={lower} />
      <circle cx={current.head.x} cy={current.head.y} r="17" className="motion-head" />
      <path d={`M${current.head.x + 5} ${current.head.y - 2}l8 4-8 3`} className="motion-face" />
      {[current.shoulderR, current.elbowR, current.wristR, current.hipR, current.kneeR, current.ankleR].map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4" className="motion-joint" />)}
      <line x1={current.ankleL.x - 4} y1={current.ankleL.y} x2={current.ankleL.x + 20} y2={current.ankleL.y} className="motion-foot" />
      <line x1={current.ankleR.x - 4} y1={current.ankleR.y} x2={current.ankleR.x + 20} y2={current.ankleR.y} className="motion-foot" />
    </g>
  );
}

export function ExerciseMotionPlayer({ exercise }: { exercise: MotionExercise }) {
  const spec = useMemo(() => resolveMotion(exercise), [exercise]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [phase, setPhase] = useState(0);
  const [zoom, setZoom] = useState(1.08);
  const [mirrored, setMirrored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedFallback, setExpandedFallback] = useState(false);
  const phaseRef = useRef(0);
  const playerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    phaseRef.current = 0;
    setPhase(0);
    setZoom(1.08);
    setMirrored(false);
    // The execution reference is expected to start immediately when opened.
    // Users can pause it at any time with the first control.
    setPlaying(true);
  }, [exercise.id]);

  useEffect(() => {
    if (!playing) return;
    let animationFrame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = Number.isFinite(now) ? Math.max(0, Math.min(80, now - previous)) : 0;
      previous = now;
      const duration = Number.isFinite(spec.duration) && spec.duration > 0 ? spec.duration : 2800;
      const nextPhase = phaseRef.current + delta * speed / duration;
      phaseRef.current = Number.isFinite(nextPhase) ? nextPhase % 1 : 0;
      setPhase(phaseRef.current);
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [playing, spec.duration, speed]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const currentPose = interpolatePose(spec.frames, phase);
  const restart = () => {
    phaseRef.current = 0;
    setPhase(0);
    setPlaying(true);
  };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (playerRef.current?.requestFullscreen) {
      await playerRef.current.requestFullscreen();
      return;
    }
    setExpandedFallback((value) => !value);
  };

  return (
    <section ref={playerRef} className={`exercise-motion-player${fullscreen || expandedFallback ? " is-expanded" : ""}`} aria-label={`Animação de execução de ${exercise.name}`}>
      <header className="motion-player-heading">
        <div><span className={playing ? "motion-live-dot is-playing" : "motion-live-dot"} aria-hidden="true" /><p><strong>EXECUÇÃO EM TEMPO REAL</strong><small>{spec.profile}</small></p></div>
        <span className="motion-view-chip">2D · {spec.view}</span>
      </header>
      <div className="motion-stage" role="img" aria-label={`${exercise.name}: ${spec.coachingCue}`}>
        <svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id={`rig-${exercise.id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f4d489" /><stop offset="1" stopColor="#b87818" /></linearGradient>
            <radialGradient id={`stage-${exercise.id}`} cx="50%" cy="45%" r="60%"><stop stopColor="rgba(201,154,61,.16)" /><stop offset="1" stopColor="rgba(3,3,3,0)" /></radialGradient>
            <filter id={`glow-${exercise.id}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          <rect width="640" height="360" fill={`url(#stage-${exercise.id})`} />
          <g className="motion-grid"><path d="M70 88H570M70 148H570M70 208H570M70 268H570M140 42V326M230 42V326M320 42V326M410 42V326M500 42V326" /></g>
          <g transform={`translate(320 180) scale(${mirrored ? -zoom : zoom} ${zoom}) translate(-320 -180)`}>
            <Scene spec={spec} pose={currentPose} equipment={exercise.equipment} />
            <g style={{ ["--rig-gradient" as string]: `url(#rig-${exercise.id})`, filter: `url(#glow-${exercise.id})` }}><Rig pose={currentPose} category={exercise.category} view={spec.view} /></g>
          </g>
        </svg>
        <div className="motion-stage-label"><span>{exercise.primary}</span><strong>{spec.coachingCue}</strong></div>
        <div className="motion-progress" aria-hidden="true"><i style={{ width: `${phase * 100}%` }} /></div>
      </div>
      <div className="motion-controls" role="group" aria-label="Controles da animação">
        <button type="button" className="motion-primary-control" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pausar animação" : "Reproduzir animação"} aria-pressed={!playing}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <div className="motion-speed-control" aria-label="Velocidade de reprodução">
          {([0.5, 1, 1.5] as const).map((value) => <button key={value} type="button" className={speed === value ? "active" : ""} onClick={() => setSpeed(value)} aria-pressed={speed === value}>{value}x</button>)}
        </div>
        <button type="button" onClick={restart} aria-label="Reiniciar animação" title="Reiniciar"><RotateCcw size={17} /></button>
        <button type="button" onClick={() => setMirrored((value) => !value)} aria-label="Inverter vista lateral" aria-pressed={mirrored} title="Inverter vista"><ArrowLeftRight size={17} /></button>
        <button type="button" onClick={() => setZoom((value) => Math.max(0.82, Number((value - 0.1).toFixed(2))))} aria-label="Reduzir zoom" title="Reduzir zoom"><ZoomOut size={17} /></button>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.48, Number((value + 0.1).toFixed(2))))} aria-label="Aumentar zoom" title="Aumentar zoom"><ZoomIn size={17} /></button>
        <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen || expandedFallback ? "Sair da tela cheia" : "Abrir em tela cheia"} title="Tela cheia">{fullscreen || expandedFallback ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <footer className="motion-player-footer"><span><i /> Rig esquelético procedural</span><code>{exercise.animationFile}</code></footer>
      <span className="sr-only" aria-live="polite">{playing ? `Animação em reprodução a ${speed} vezes a velocidade normal.` : "Animação pausada."}</span>
    </section>
  );
}
