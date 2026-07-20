export type GuidedSession = {
  id: string;
  title: string;
  subtitle: string;
  duration: number;
  level: "Iniciante" | "Intermediário" | "Avançado";
  focus: string;
  calories: number;
  workoutId: string;
  poster: string;
  videoSrc?: string;
  segments: { label: string; seconds: number }[];
};

export type TrainingProgram = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  weeks: number;
  sessionsPerWeek: number;
  accent: "volt" | "ice" | "ember";
  sessionIds: string[];
};

export const guidedSessions: GuidedSession[] = [
  {
    id: "power-foundation",
    title: "Força essencial",
    subtitle: "Movimentos fundamentais com ritmo guiado",
    duration: 32,
    level: "Intermediário",
    focus: "Corpo inteiro",
    calories: 286,
    workoutId: "push-a",
    poster: "/media/pulse-training-hero.webp",
    segments: [
      { label: "Ativação", seconds: 40 },
      { label: "Kettlebell press", seconds: 50 },
      { label: "Recuperação", seconds: 20 },
      { label: "Agachamento", seconds: 50 },
    ],
  },
  {
    id: "hiit-20",
    title: "HIIT sem limites",
    subtitle: "Explosão, controle e condicionamento",
    duration: 20,
    level: "Avançado",
    focus: "Condicionamento",
    calories: 248,
    workoutId: "lower-a",
    poster: "/media/pulse-training-hero.webp",
    segments: [
      { label: "Preparação", seconds: 30 },
      { label: "Power clean", seconds: 40 },
      { label: "Recuperação", seconds: 20 },
      { label: "Mountain climber", seconds: 40 },
    ],
  },
  {
    id: "mobility-reset",
    title: "Mobility reset",
    subtitle: "Recupere amplitude e termine mais leve",
    duration: 16,
    level: "Iniciante",
    focus: "Mobilidade",
    calories: 92,
    workoutId: "pull-b",
    poster: "/media/pulse-training-hero.webp",
    segments: [
      { label: "Respiração", seconds: 45 },
      { label: "Quadril 90/90", seconds: 60 },
      { label: "Rotação torácica", seconds: 60 },
      { label: "Relaxamento", seconds: 45 },
    ],
  },
  {
    id: "upper-engine",
    title: "Upper engine",
    subtitle: "Força e resistência para membros superiores",
    duration: 38,
    level: "Intermediário",
    focus: "Upper body",
    calories: 318,
    workoutId: "push-a",
    poster: "/media/pulse-training-hero.webp",
    segments: [
      { label: "Mobilidade de ombros", seconds: 40 },
      { label: "Supino", seconds: 55 },
      { label: "Remada", seconds: 55 },
      { label: "Core", seconds: 45 },
    ],
  },
];

export const trainingPrograms: TrainingProgram[] = [
  {
    id: "build-strong",
    title: "Construa sua força",
    eyebrow: "PROGRAMA DE 6 SEMANAS",
    description: "Progressão inteligente de carga, técnica e recuperação para criar uma base realmente sólida.",
    weeks: 6,
    sessionsPerWeek: 4,
    accent: "volt",
    sessionIds: ["power-foundation", "upper-engine", "hiit-20"],
  },
  {
    id: "move-better",
    title: "Mova-se melhor",
    eyebrow: "PROGRAMA DE 4 SEMANAS",
    description: "Mobilidade diária e força funcional para treinar com mais liberdade e consistência.",
    weeks: 4,
    sessionsPerWeek: 3,
    accent: "ice",
    sessionIds: ["mobility-reset", "power-foundation"],
  },
  {
    id: "engine-30",
    title: "Engine 30",
    eyebrow: "PROGRAMA DE 5 SEMANAS",
    description: "Sessões compactas de condicionamento para elevar potência, ritmo e capacidade de trabalho.",
    weeks: 5,
    sessionsPerWeek: 4,
    accent: "ember",
    sessionIds: ["hiit-20", "upper-engine"],
  },
];
