export type WorkoutExercise = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  reps: string;
  load: number;
  rest: number;
  rpe: number;
  note?: string;
};

export type Workout = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  duration: number;
  volume: number;
  calories: number;
  accent: "violet" | "cyan" | "blue";
  exercises: WorkoutExercise[];
};

export const profile = {
  firstName: "Rafael",
  fullName: "Rafael Mendes",
  initials: "RM",
  level: 18,
  xp: 7420,
  nextLevelXp: 8000,
  streak: 12,
  weight: 79.4,
  bodyFat: 16.8,
  bmi: 25.1,
};

export const workouts: Workout[] = [
  {
    id: "push-a",
    name: "Push A",
    subtitle: "Peito, ombros e tríceps",
    category: "Musculação",
    duration: 62,
    volume: 7820,
    calories: 520,
    accent: "violet",
    exercises: [
      { id: "bench", name: "Supino reto com barra", muscle: "Peitoral", sets: 4, reps: "6–8", load: 82.5, rest: 150, rpe: 8, note: "Pausa de 1 segundo no peito" },
      { id: "incline", name: "Supino inclinado com halteres", muscle: "Peitoral superior", sets: 3, reps: "8–10", load: 30, rest: 105, rpe: 8 },
      { id: "military", name: "Desenvolvimento militar", muscle: "Ombros", sets: 3, reps: "8", load: 45, rest: 120, rpe: 8.5 },
      { id: "lateral", name: "Elevação lateral no cabo", muscle: "Deltoide lateral", sets: 3, reps: "12–15", load: 10, rest: 60, rpe: 9 },
    ],
  },
  {
    id: "lower-a",
    name: "Lower A",
    subtitle: "Quadríceps, posteriores e glúteos",
    category: "Musculação",
    duration: 73,
    volume: 12480,
    calories: 612,
    accent: "cyan",
    exercises: [
      { id: "squat", name: "Agachamento livre", muscle: "Quadríceps", sets: 4, reps: "5", load: 100, rest: 180, rpe: 8 },
      { id: "rdl", name: "Levantamento terra romeno", muscle: "Posteriores", sets: 3, reps: "8", load: 90, rest: 150, rpe: 8 },
      { id: "leg-press", name: "Leg press 45°", muscle: "Quadríceps", sets: 3, reps: "10", load: 180, rest: 120, rpe: 8.5 },
      { id: "leg-curl", name: "Mesa flexora", muscle: "Posteriores", sets: 3, reps: "12", load: 52, rest: 75, rpe: 9 },
    ],
  },
  {
    id: "pull-b",
    name: "Pull B",
    subtitle: "Costas, deltoide posterior e bíceps",
    category: "Musculação",
    duration: 66,
    volume: 8260,
    calories: 548,
    accent: "blue",
    exercises: [
      { id: "pullup", name: "Barra fixa pronada", muscle: "Dorsais", sets: 4, reps: "6–8", load: 0, rest: 150, rpe: 8 },
      { id: "row", name: "Remada curvada com barra", muscle: "Costas", sets: 4, reps: "8", load: 70, rest: 120, rpe: 8 },
      { id: "pulldown", name: "Puxada alta neutra", muscle: "Dorsais", sets: 3, reps: "10", load: 65, rest: 90, rpe: 8.5 },
      { id: "facepull", name: "Face pull", muscle: "Deltoide posterior", sets: 3, reps: "15", load: 25, rest: 60, rpe: 8 },
    ],
  },
];

export const exerciseLibrary = [
  { id: "bench", name: "Supino reto com barra", category: "Peito", equipment: "Barra", level: "Intermediário", favorite: true, accent: "violet", primary: "Peitoral maior", secondary: "Tríceps · Deltoide anterior", best: "92,5 kg" },
  { id: "incline", name: "Supino inclinado com halteres", category: "Peito", equipment: "Halteres", level: "Intermediário", favorite: true, accent: "violet", primary: "Peitoral superior", secondary: "Tríceps · Deltoide anterior", best: "32 kg" },
  { id: "squat", name: "Agachamento livre", category: "Pernas", equipment: "Barra", level: "Avançado", favorite: true, accent: "cyan", primary: "Quadríceps · Glúteos", secondary: "Core · Adutores", best: "120 kg" },
  { id: "rdl", name: "Levantamento terra romeno", category: "Pernas", equipment: "Barra", level: "Intermediário", favorite: true, accent: "cyan", primary: "Posteriores · Glúteos", secondary: "Eretores · Antebraços", best: "105 kg" },
  { id: "pullup", name: "Barra fixa pronada", category: "Costas", equipment: "Peso corporal", level: "Intermediário", favorite: true, accent: "blue", primary: "Latíssimo do dorso", secondary: "Bíceps · Core", best: "12 reps" },
  { id: "row", name: "Remada curvada com barra", category: "Costas", equipment: "Barra", level: "Intermediário", favorite: false, accent: "blue", primary: "Dorsais · Romboides", secondary: "Bíceps · Core", best: "82,5 kg" },
  { id: "military", name: "Desenvolvimento militar", category: "Ombros", equipment: "Barra", level: "Intermediário", favorite: false, accent: "orange", primary: "Deltoides", secondary: "Tríceps · Core", best: "57,5 kg" },
  { id: "lateral", name: "Elevação lateral no cabo", category: "Ombros", equipment: "Polia", level: "Iniciante", favorite: false, accent: "orange", primary: "Deltoide lateral", secondary: "Trapézio superior", best: "14 kg" },
];

export const metrics = [
  { label: "Calorias ativas", value: "428", unit: "kcal", trend: "+12%", icon: "Flame", tone: "cyan", progress: 61 },
  { label: "Tempo ativo", value: "42", unit: "min", trend: "+8 min", icon: "Timer", tone: "violet", progress: 70 },
  { label: "Distância", value: "4,8", unit: "km", trend: "+0,9 km", icon: "Route", tone: "blue", progress: 60 },
  { label: "Volume semanal", value: "42,8", unit: "t", trend: "+15,9%", icon: "Dumbbell", tone: "green", progress: 68 },
];

export const weeklyVolume = [
  { week: "25 mai", volume: 31.2 },
  { week: "1 jun", volume: 33.8 },
  { week: "8 jun", volume: 35.1 },
  { week: "15 jun", volume: 32.9 },
  { week: "22 jun", volume: 37.2 },
  { week: "29 jun", volume: 38.6 },
  { week: "6 jul", volume: 40.2 },
  { week: "Agora", volume: 42.8 },
];

export const weightTrend = [
  { date: "Abr", weight: 82.6, fat: 18.3 },
  { date: "15 Abr", weight: 82.0, fat: 18.0 },
  { date: "Mai", weight: 81.7, fat: 17.8 },
  { date: "15 Mai", weight: 81.1, fat: 17.5 },
  { date: "Jun", weight: 80.6, fat: 17.2 },
  { date: "15 Jun", weight: 80.1, fat: 17.0 },
  { date: "Jul", weight: 79.8, fat: 16.9 },
  { date: "Hoje", weight: 79.4, fat: 16.8 },
];

export const recentActivities = [
  { title: "Mobilidade de quadril", type: "Mobilidade", when: "Ontem, 20:04", duration: "24 min", stat: "108 kcal", icon: "StretchHorizontal", tone: "violet" },
  { title: "Corrida progressiva 5K", type: "Corrida", when: "Terça, 06:38", duration: "27 min", stat: "5:11 /km", icon: "Footprints", tone: "green" },
  { title: "Lower A", type: "Musculação", when: "Segunda, 18:26", duration: "1h 13min", stat: "12,4 t", icon: "Dumbbell", tone: "cyan" },
];

export const weekSchedule = [
  { day: "SEG", date: 13, name: "Lower A", status: "done", tone: "cyan" },
  { day: "TER", date: 14, name: "Corrida 5K", status: "done", tone: "green" },
  { day: "QUA", date: 15, name: "Mobilidade", status: "done", tone: "violet" },
  { day: "QUI", date: 16, name: "Push A", status: "today", tone: "violet" },
  { day: "SEX", date: 17, name: "Bike Z2", status: "planned", tone: "green" },
  { day: "SÁB", date: 18, name: "Pull B", status: "planned", tone: "blue" },
  { day: "DOM", date: 19, name: "Recuperação", status: "recovery", tone: "slate" },
];

export const monthEvents: Record<number, { name: string; tone: string; status: string }[]> = {
  1: [{ name: "Push B", tone: "violet", status: "done" }],
  2: [{ name: "Corrida Z2", tone: "green", status: "done" }],
  4: [{ name: "Lower B", tone: "cyan", status: "done" }],
  6: [{ name: "Bike", tone: "green", status: "done" }],
  7: [{ name: "Pull A", tone: "blue", status: "done" }],
  8: [{ name: "Yoga", tone: "violet", status: "done" }],
  9: [{ name: "Push A", tone: "violet", status: "done" }],
  10: [{ name: "Corrida", tone: "green", status: "done" }],
  11: [{ name: "Lower A", tone: "cyan", status: "done" }],
  13: [{ name: "Lower A", tone: "cyan", status: "done" }],
  14: [{ name: "Corrida 5K", tone: "green", status: "done" }],
  15: [{ name: "Mobilidade", tone: "violet", status: "done" }],
  16: [{ name: "Push A · 18:30", tone: "violet", status: "today" }],
  17: [{ name: "Bike Z2", tone: "green", status: "planned" }],
  18: [{ name: "Pull B", tone: "blue", status: "planned" }],
  19: [{ name: "Recuperação", tone: "slate", status: "planned" }],
  21: [{ name: "Lower B", tone: "cyan", status: "planned" }],
  23: [{ name: "Push B", tone: "violet", status: "planned" }],
  25: [{ name: "Longão 10K", tone: "green", status: "planned" }],
  28: [{ name: "Pull A", tone: "blue", status: "planned" }],
};

export const goals = [
  { title: "Treinar 5x na semana", detail: "3 de 5 treinos", value: 60, tone: "violet", due: "Faltam 2 treinos" },
  { title: "10K abaixo de 52min", detail: "Projeção: 51:43", value: 72, tone: "green", due: "Meta em 67 dias" },
  { title: "Agachamento 140 kg", detail: "Atual: 120 kg", value: 71, tone: "cyan", due: "+20 kg para a meta" },
];

export const personalRecords = [
  { label: "Agachamento", value: "120 kg", change: "+5 kg", date: "13 jul" },
  { label: "Supino reto", value: "92,5 kg", change: "+2,5 kg", date: "2 jul" },
  { label: "Levantamento terra", value: "150 kg", change: "+10 kg", date: "19 jun" },
  { label: "Melhor 5K", value: "24:38", change: "−42 s", date: "28 jun" },
];

export const aiInsights = [
  {
    title: "Você está pronto para subir a carga no supino",
    detail: "Nas últimas 3 sessões você atingiu o topo da faixa com RPE médio de 7,8.",
    action: "Se as duas primeiras séries saírem limpas, avance de 82,5 kg para 85 kg.",
    confidence: 92,
    tone: "green",
  },
  {
    title: "Seu 10K sub-52 está ao alcance",
    detail: "O ritmo das últimas quatro corridas projeta 51min43s para a distância.",
    action: "Inclua 3 × 8 minutos a 5:05/km na próxima terça-feira.",
    confidence: 84,
    tone: "violet",
  },
  {
    title: "Deload previsto em 14 dias",
    detail: "Sua carga acumulada cresce há seis semanas e está dentro do planejado.",
    action: "Na semana 8, reduza o volume em 35% e mantenha 80% das cargas.",
    confidence: 90,
    tone: "orange",
  },
];

export const coachReplies: Record<string, string> = {
  carga: "Pelos seus últimos treinos, o melhor ajuste hoje é testar 85 kg no supino somente se as duas primeiras séries ficarem em RPE 8 ou menor. Preserve a amplitude e volte a 82,5 kg se a velocidade cair.",
  recuperação: "Sua prontidão está em 86/100: sono de 7h42, FC de repouso 2 bpm abaixo da base e energia alta. Você pode manter a sessão intensa, com aquecimento específico de 8 minutos.",
  treino: "Seu Push A está equilibrado em 13 séries efetivas. Eu manteria o volume e progrediria apenas o supino. Na semana 8, programe um deload de 35% no volume.",
  default: "Cruzei sua recuperação, consistência e carga recente. Hoje você está bem recuperado e pode executar o Push A como planejado. Quer analisar carga, recuperação ou estrutura do treino?",
};
