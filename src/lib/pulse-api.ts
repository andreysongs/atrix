export type ApiPerformedSet = {
  exerciseId: string;
  setNumber: number;
  loadKg: number;
  reps: number;
  rpe: number;
};

export type ApiSessionInput = {
  localId: string;
  workoutId: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  sets: ApiPerformedSet[];
};

const pendingKey = "pulse-api-pending-sessions";

export function apiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_FORGE_API_URL || process.env.NEXT_PUBLIC_PULSE_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)) {
    return window.location.protocol + "//" + window.location.hostname + ":4000/api/v1";
  }
  return "http://localhost:4000/api/v1";
}

export async function saveWorkoutSession(session: ApiSessionInput) {
  const response = await fetch(apiBaseUrl() + "/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!response.ok) throw new Error("API returned " + response.status);
  return response.json() as Promise<Record<string, unknown>>;
}

export async function registerPushDevice(input: { token: string; platform: "android" | "ios" | "web"; appVersion?: string; locale?: string }) {
  const response = await fetch(apiBaseUrl() + "/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("API returned " + response.status);
  return response.json() as Promise<Record<string, unknown>>;
}

export function queueWorkoutSession(session: ApiSessionInput) {
  if (typeof window === "undefined") return;
  const current = JSON.parse(window.localStorage.getItem(pendingKey) || "[]") as ApiSessionInput[];
  if (!current.some((item) => item.localId === session.localId)) {
    window.localStorage.setItem(pendingKey, JSON.stringify([...current, session]));
  }
}

export async function flushWorkoutSessionQueue() {
  if (typeof window === "undefined") return 0;
  const current = JSON.parse(window.localStorage.getItem(pendingKey) || "[]") as ApiSessionInput[];
  const remaining: ApiSessionInput[] = [];
  let synced = 0;
  for (const session of current) {
    try {
      await saveWorkoutSession(session);
      synced += 1;
    } catch {
      remaining.push(session);
    }
  }
  window.localStorage.setItem(pendingKey, JSON.stringify(remaining));
  return synced;
}
