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
  ]
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly filePath = join(process.cwd(), "data", "pulse-db.json");
  private data: PulseDatabase = structuredClone(seed);

  async onModuleInit() {
    try {
      this.data = JSON.parse(await readFile(this.filePath, "utf8")) as PulseDatabase;
    } catch {
      await this.persist();
    }
  }

  snapshot() { return structuredClone(this.data); }
  profile() { return structuredClone(this.data.profile); }
  exercises() { return structuredClone(this.data.exercises); }
  workouts() { return structuredClone(this.data.workouts); }
  sessions() { return structuredClone(this.data.sessions); }
  goals() { return structuredClone(this.data.goals); }

  async updateProfile<T extends object>(input: T) {
    this.data.profile = { ...this.data.profile, ...input, updatedAt: new Date().toISOString() };
    await this.persist();
    return this.profile();
  }

  async add<T extends object>(collection: "exercises" | "workouts" | "sessions" | "goals", input: T) {
    const record = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.data[collection].push(record);
    await this.persist();
    return structuredClone(record);
  }

  workout(id: string) { return structuredClone(this.data.workouts.find((item) => item.id === id)); }

  private async persist() {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporary = this.filePath + ".tmp";
    await writeFile(temporary, JSON.stringify(this.data, null, 2), "utf8");
    await rename(temporary, this.filePath);
  }
}
