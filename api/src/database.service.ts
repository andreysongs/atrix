import { Injectable, OnModuleInit } from "@nestjs/common";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type PulseDatabase = {
  profile: Record<string, unknown>;
  exercises: Array<Record<string, unknown>>;
  workouts: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  devices: Array<Record<string, unknown>>;
};

const seed: PulseDatabase = {
  profile: { id: "athlete-demo", name: "Rafael Mendes", heightCm: 178, weightKg: 79.4, bodyFatPercentage: 16.8, objective: "Performance e definição", level: 18, xp: 7420 },
  exercises: [
    { id: "bench", name: "Supino reto com barra", category: "Peito", equipment: "Barra", primaryMuscle: "Peitoral maior", secondaryMuscles: ["Tríceps", "Deltoide anterior"] },
    { id: "squat", name: "Agachamento livre", category: "Pernas", equipment: "Barra", primaryMuscle: "Quadríceps", secondaryMuscles: ["Glúteos", "Core"] },
    { id: "row", name: "Remada curvada com barra", category: "Costas", equipment: "Barra", primaryMuscle: "Dorsais", secondaryMuscles: ["Bíceps", "Romboides"] }
  ],
  workouts: [
    { id: "push-a", name: "Push A", subtitle: "Peito, ombros e tríceps", category: "Musculação", exercises: [
      { exerciseId: "bench", sets: 4, reps: "6–8", loadKg: 82.5, restSeconds: 150 }
    ] }
  ],
  sessions: [],
  goals: [
    { id: "weekly-5", title: "Treinar 5x na semana", category: "consistency", current: 3, target: 5, unit: "treinos", deadline: "2026-07-19" }
  ],
  devices: []
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly filePath = join(process.cwd(), "data", "pulse-db.json");
  private data: PulseDatabase = structuredClone(seed);

  async onModuleInit() {
    const catalogExercises = await this.loadSharedExerciseCatalog();
    try {
      const stored = JSON.parse(await readFile(this.filePath, "utf8")) as Partial<PulseDatabase>;
      this.data = { ...structuredClone(seed), ...stored, devices: stored.devices ?? [] };
      this.data.exercises = this.mergeExercises(catalogExercises, stored.exercises ?? []);
    } catch {
      this.data.exercises = catalogExercises;
      await this.persist();
    }
  }

  snapshot() { return structuredClone(this.data); }
  profile() { return structuredClone(this.data.profile); }
  exercises() { return structuredClone(this.data.exercises); }
  workouts() { return structuredClone(this.data.workouts); }
  sessions() { return structuredClone(this.data.sessions); }
  goals() { return structuredClone(this.data.goals); }
  devices() { return structuredClone(this.data.devices); }

  async registerDevice(input: { token: string; platform: string; appVersion?: string; locale?: string }) {
    const existing = this.data.devices.find((item) => item.token === input.token);
    if (existing) {
      Object.assign(existing, input, { updatedAt: new Date().toISOString(), active: true });
      await this.persist();
      return structuredClone(existing);
    }
    const record = { id: randomUUID(), ...input, active: true, createdAt: new Date().toISOString() };
    this.data.devices.push(record);
    await this.persist();
    return structuredClone(record);
  }

  async unregisterDevice(token: string) {
    const existing = this.data.devices.find((item) => item.token === token);
    if (existing) Object.assign(existing, { active: false, updatedAt: new Date().toISOString() });
    await this.persist();
    return { success: true };
  }

  async updateProfile<T extends object>(input: T) {
    this.data.profile = { ...this.data.profile, ...input, updatedAt: new Date().toISOString() };
    await this.persist();
    return this.profile();
  }

  async add<T extends object>(collection: "exercises" | "workouts" | "sessions" | "goals", input: T) {
    const id = randomUUID();
    const record = {
      id,
      ...input,
      ...(collection === "exercises" ? { animationFile: `${id}.motion3d`, animationEngine: "olympus-human-webgl2-v1" } : {}),
      createdAt: new Date().toISOString(),
    };
    this.data[collection].push(record);
    await this.persist();
    return structuredClone(record);
  }

  workout(id: string) { return structuredClone(this.data.workouts.find((item) => item.id === id)); }

  private async loadSharedExerciseCatalog() {
    const candidates = [
      join(process.cwd(), "..", "src", "data", "exercise-seeds.json"),
      join(process.cwd(), "src", "data", "exercise-seeds.json"),
    ];
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(await readFile(candidate, "utf8")) as { exercises?: Array<Record<string, unknown>> };
        if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
          return parsed.exercises.map((exercise) => ({
            ...exercise,
            primaryMuscle: exercise.primary,
            secondaryMuscles: String(exercise.secondary || "").split("·").map((item) => item.trim()).filter(Boolean),
            image: `/media/exercises/olympus/${String(exercise.id)}.webp?v=photos-20260721-v3`,
            animationFile: `${String(exercise.id)}.motion3d`,
            animationEngine: "olympus-human-webgl2-v1",
          }));
        }
      } catch {
        // Standalone API deployments may not include the shared web catalog.
      }
    }
    return structuredClone(seed.exercises).map((exercise) => ({
      ...exercise,
      animationFile: `${String(exercise.id)}.motion3d`,
      animationEngine: "olympus-human-webgl2-v1",
    }));
  }

  private mergeExercises(catalog: Array<Record<string, unknown>>, stored: Array<Record<string, unknown>>) {
    const catalogIds = new Set(catalog.map((exercise) => String(exercise.id)));
    return [...catalog, ...stored.filter((exercise) => !catalogIds.has(String(exercise.id)))];
  }

  private async persist() {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = this.filePath + ".tmp";
    await writeFile(temporary, JSON.stringify(this.data, null, 2), "utf8");
    await rename(temporary, this.filePath);
  }
}
