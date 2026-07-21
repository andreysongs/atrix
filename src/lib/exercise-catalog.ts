import rawExerciseSeeds from "@/data/exercise-seeds.json";

/**
 * The rich catalog is deliberately independent from the compact demo library.
 * It can be adopted screen by screen without changing persisted workout IDs.
 */
export type ExerciseRegion = "upper" | "lower" | "full";
export type ExerciseType = "compound" | "isolation" | "calisthenics" | "mobility";
export type ExerciseLevel = "Iniciante" | "Intermediário" | "Avançado";
export type ExerciseAccent = "violet" | "cyan" | "blue" | "green" | "orange";

export type ExercisePrescription = {
  sets: string;
  reps: string;
  intensity: string;
  note: string;
};

export type ExerciseSeed = {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  region: ExerciseRegion;
  type: ExerciseType;
  equipment: string;
  equipmentAlternative: string;
  primary: string;
  secondary: string;
  level: ExerciseLevel;
  movement: string;
  objective: string;
  activation: string;
  audience: string;
  tags: string[];
  favorite?: boolean;
  best?: string;
};

/**
 * This intersection preserves every field currently rendered by the legacy
 * exercise cards, while supplying the detail fields needed by future screens.
 */
export type CatalogExercise = ExerciseSeed & {
  /** Legacy card contract */
  favorite: boolean;
  accent: ExerciseAccent;
  best: string;
  image: string;
  /** Rich catalog contract */
  execution: string[];
  range: string;
  breathing: string;
  commonErrors: string[];
  cues: string[];
  variations: string[];
  similar: string[];
  care: string;
  prescriptions: {
    strength: ExercisePrescription;
    hypertrophy: ExercisePrescription;
    endurance: ExercisePrescription;
  };
  rest: number;
  cadence: string;
};

type SeedFile = {
  schemaVersion: number;
  exercises: ExerciseSeed[];
};

const seedFile = rawExerciseSeeds as unknown as SeedFile;

const accentForCategory: Record<string, ExerciseAccent> = {
  Peito: "violet",
  Costas: "blue",
  Ombros: "orange",
  "Trapézio": "orange",
  "Bíceps": "green",
  "Tríceps": "orange",
  Antebraços: "green",
  Abdômen: "violet",
  Core: "violet",
  Lombar: "cyan",
  Quadríceps: "cyan",
  Posteriores: "cyan",
  Glúteos: "green",
  Panturrilhas: "green",
  Pernas: "cyan",
  Calistenia: "green",
};

const compoundMovements = new Set([
  "horizontal-press",
  "vertical-press",
  "horizontal-pull",
  "vertical-pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
]);

function titleForMovement(movement: string) {
  const labels: Record<string, string> = {
    "horizontal-press": "pressão horizontal",
    "vertical-press": "pressão vertical",
    "horizontal-pull": "puxada horizontal",
    "vertical-pull": "puxada vertical",
    fly: "adução controlada",
    curl: "flexão de cotovelo",
    extension: "extensão de cotovelo",
    raise: "elevação controlada",
    shrug: "elevação escapular",
    rotation: "rotação controlada",
    squat: "agachamento",
    hinge: "dobradiça de quadril",
    lunge: "passada unilateral",
    "knee-flexion": "flexão de joelho",
    "knee-extension": "extensão de joelho",
    "hip-abduction": "abdução de quadril",
    "hip-extension": "extensão de quadril",
    "ankle-extension": "extensão de tornozelo",
    crunch: "flexão de tronco",
    antirotation: "estabilidade anti-rotação",
    "body-control": "controle corporal",
  };
  return labels[movement] || "movimento controlado";
}

function rangeFor(seed: ExerciseSeed) {
  if (seed.type === "calisthenics") return "Use a maior amplitude que você controla sem perder a posição articular.";
  if (seed.movement === "squat" || seed.movement === "lunge") return "Desça mantendo o pé inteiro apoiado e o joelho acompanhando a linha dos dedos.";
  if (seed.movement === "hinge") return "Leve o quadril para trás com coluna neutra; pare antes de perder tensão e alinhamento.";
  if (seed.movement === "vertical-pull" || seed.movement === "horizontal-pull") return "Comece com escápulas organizadas e termine sem projetar excessivamente o ombro à frente.";
  return "Trabalhe uma amplitude confortável, sem compensar com balanço ou perda de alinhamento.";
}

function breathingFor(seed: ExerciseSeed) {
  if (seed.type === "calisthenics" || seed.movement === "body-control") return "Respire de forma contínua e calma; evite prender o ar durante a sustentação.";
  if (seed.movement === "hinge" || seed.movement === "squat") return "Inspire e estabilize antes da descida; expire de forma controlada na fase de subida.";
  return "Inspire durante o retorno e expire na fase de maior esforço, mantendo o tronco estável.";
}

function careFor(seed: ExerciseSeed) {
  if (["Ombros", "Peito", "Trapézio"].includes(seed.category)) return "Reduza a amplitude se houver dor no ombro e priorize o posicionamento das escápulas.";
  if (["Lombar", "Posteriores", "Glúteos"].includes(seed.category) || seed.movement === "hinge") return "Mantenha a coluna neutra; dor lombar, formigamento ou perda de controle exigem interrupção e avaliação profissional.";
  if (["Quadríceps", "Panturrilhas", "Pernas"].includes(seed.category) || seed.movement === "squat" || seed.movement === "lunge") return "Mantenha joelhos alinhados aos pés e reduza carga/amplitude se houver dor articular.";
  if (seed.type === "calisthenics") return "Use progressão compatível com sua força e interrompa se surgir desconforto em ombros, cotovelos ou punhos.";
  return "Priorize técnica, carga progressiva e uma amplitude sem dor. Procure orientação profissional em caso de lesão ou desconforto persistente.";
}

function restFor(seed: ExerciseSeed) {
  if (seed.type === "calisthenics" || compoundMovements.has(seed.movement)) return 120;
  if (["Calistenia", "Quadríceps", "Posteriores", "Glúteos"].includes(seed.category)) return 105;
  return 75;
}

function cadenceFor(seed: ExerciseSeed) {
  if (seed.type === "calisthenics") return "Controle contínuo · 2–3 s por fase";
  if (seed.movement === "hinge" || seed.movement === "squat") return "3–1–1–0";
  return "2–1–2–0";
}

function buildExecution(seed: ExerciseSeed) {
  const movement = titleForMovement(seed.movement);
  return [
    `Ajuste ${seed.equipment.toLowerCase()} e organize uma base estável antes de iniciar.`,
    `Inicie a ${movement} mantendo ${seed.activation.toLowerCase()} ativo e o tronco sob controle.`,
    "Conduza a fase de esforço sem impulso, respeitando a amplitude confortável.",
    "Retorne com controle e encerre a série se a técnica começar a se deteriorar.",
  ];
}

function buildCues(seed: ExerciseSeed) {
  const cues = ["Controle a fase de retorno.", "Mantenha a respiração organizada."];
  if (seed.region === "lower") cues.unshift("Distribua a pressão pelo pé inteiro e mantenha o joelho alinhado.");
  else if (seed.movement.includes("pull")) cues.unshift("Inicie com escápulas estáveis antes de puxar com os braços.");
  else if (seed.movement.includes("press")) cues.unshift("Crie uma base firme e mantenha punhos alinhados ao antebraço.");
  else cues.unshift(`Sinta ${seed.activation.toLowerCase()} conduzir o movimento.`);
  return cues;
}

function buildErrors(seed: ExerciseSeed) {
  const errors = ["Usar impulso para compensar a carga.", "Acelerar a fase de retorno e perder o controle."];
  if (seed.region === "lower") errors.unshift("Deixar joelhos colapsarem para dentro ou tirar o pé da base.");
  else if (seed.movement.includes("pull")) errors.unshift("Elevar os ombros e puxar com a lombar ou balanço.");
  else if (seed.movement.includes("press")) errors.unshift("Perder o alinhamento de punhos, cotovelos e ombros.");
  else errors.unshift("Reduzir a amplitude por falta de estabilidade.");
  return errors;
}

function buildPrescriptions(seed: ExerciseSeed, rest: number): CatalogExercise["prescriptions"] {
  const compound = compoundMovements.has(seed.movement) || seed.type === "calisthenics";
  const baseSets = compound ? "3–5" : "2–4";
  return {
    strength: { sets: baseSets, reps: compound ? "4–8" : "6–10", intensity: "RPE 7–9", note: `Descanse ${rest + 30}–${rest + 90}s e preserve a técnica.` },
    hypertrophy: { sets: "3–4", reps: compound ? "6–12" : "10–15", intensity: "RPE 7–8", note: `Descanse ${rest}–${rest + 30}s e controle a cadência.` },
    endurance: { sets: "2–3", reps: "12–20", intensity: "RPE 5–7", note: "Reduza a carga antes de perder amplitude ou alinhamento." },
  };
}

function assertSeedFile(value: SeedFile): asserts value is SeedFile {
  if (!value || !Array.isArray(value.exercises) || value.exercises.length === 0) {
    throw new Error("Exercise seed file is missing its exercises array.");
  }
  const seen = new Set<string>();
  for (const seed of value.exercises) {
    if (!seed.id || !seed.name || !seed.category || !seed.equipment || !seed.primary || !seed.secondary) {
      throw new Error("Every exercise seed must contain the legacy catalog fields.");
    }
    if (seen.has(seed.id)) throw new Error(`Duplicate exercise id: ${seed.id}`);
    seen.add(seed.id);
  }
}

assertSeedFile(seedFile);

// Keep the revision in the URL whenever the photographic library changes.
// This bypasses older browser/PWA caches that may still contain the former
// line-art covers under the same exercise filenames.
const EXERCISE_IMAGE_REVISION = "photos-20260721-v2";

const preparedCatalog = seedFile.exercises.map((seed): CatalogExercise => {
  const rest = restFor(seed);
  return {
    ...seed,
    favorite: Boolean(seed.favorite),
    best: seed.best || "Sem registro",
    accent: accentForCategory[seed.category] || "blue",
    image: `/media/exercises/olympus/${seed.id}.webp?v=${EXERCISE_IMAGE_REVISION}`,
    execution: buildExecution(seed),
    range: rangeFor(seed),
    breathing: breathingFor(seed),
    commonErrors: buildErrors(seed),
    cues: buildCues(seed),
    variations: [seed.equipmentAlternative, "Versão assistida ou com menor carga", "Variação com amplitude reduzida"],
    similar: [],
    care: careFor(seed),
    prescriptions: buildPrescriptions(seed, rest),
    rest,
    cadence: cadenceFor(seed),
  };
});

/** Complete upper/lower + calisthenics seed catalog, stable and read-only. */
export const exerciseCatalog: readonly CatalogExercise[] = preparedCatalog.map((exercise) => ({
  ...exercise,
  similar: preparedCatalog
    .filter((candidate) => candidate.id !== exercise.id && (candidate.category === exercise.category || candidate.movement === exercise.movement))
    .slice(0, 4)
    .map((candidate) => candidate.name),
}));

export const exerciseCatalogById: ReadonlyMap<string, CatalogExercise> = new Map(
  exerciseCatalog.map((exercise) => [exercise.id, exercise]),
);

export const exerciseCatalogCategories = Array.from(new Set(exerciseCatalog.map((exercise) => exercise.category)));

export function getCatalogExercise(id: string) {
  return exerciseCatalogById.get(id);
}

export function searchCatalogExercises(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedQuery) return exerciseCatalog;
  return exerciseCatalog.filter((exercise) => [
    exercise.name,
    exercise.nameEn,
    exercise.category,
    exercise.primary,
    exercise.secondary,
    exercise.equipment,
    exercise.equipmentAlternative,
    exercise.objective,
    exercise.movement,
    exercise.level,
    ...exercise.tags,
  ].join(" ").toLocaleLowerCase("pt-BR").includes(normalizedQuery));
}
