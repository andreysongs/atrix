"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Apple,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CalendarPlus,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clapperboard,
  Clock3,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Home,
  Menu,
  Moon,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Route,
  Search,
  Send,
  Settings,
  Sparkles,
  Smartphone,
  Sun,
  Timer,
  Trophy,
  UserRound,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aiInsights,
  coachReplies,
  exerciseLibrary,
  goals,
  metrics,
  monthEvents,
  personalRecords,
  profile,
  recentActivities,
  weeklyVolume,
  weekSchedule,
  weightTrend,
  workouts,
  type Workout,
  type WorkoutExercise,
} from "@/lib/demo-data";
import { flushWorkoutSessionQueue, queueWorkoutSession, saveWorkoutSession, type ApiSessionInput } from "@/lib/pulse-api";
import { initializePushNotifications } from "@/lib/push-notifications";
import { listOfflineGuides, removeOfflineGuide, saveOfflineGuide } from "@/lib/offline-content";
import { ProgramsView, PulseEditorialHero } from "@/components/training-media";
import { ForgeOnboarding, MobilityView, ProfileView, RunningView, TrainerView, type ForgeOnboardingData } from "@/components/forge-modules";

const loadExerciseMotionPlayer = () => import("@/components/exercise-human-3d-player").then((module) => module.ExerciseMotionPlayer);

const ExerciseMotionPlayer = dynamic(
  loadExerciseMotionPlayer,
  { ssr: false, loading: () => <div className="motion-player-loading" role="status"><span /> Preparando modelo articulado…</div> },
);

type ViewId = "dashboard" | "programs" | "workouts" | "library" | "progress" | "calendar" | "coach" | "profile" | "running" | "mobility" | "trainer";

type SetValue = {
  load: number;
  reps: number;
  rpe: number;
};

type SessionFeedback = "Fácil" | "Adequado" | "Difícil" | "Dor";

type ActiveSession = {
  workoutId: string;
  startedAt: number;
  pausedAt: number | null;
  pausedDuration: number;
  completed: string[];
  values: Record<string, SetValue>;
  restEndsAt: number | null;
  restTotalSeconds: number;
  skippedExerciseIds: string[];
  feedback: SessionFeedback;
};

type CompletedSession = {
  id: string;
  workoutId: string;
  name: string;
  startedAt: number;
  finishedAt: number;
  durationSeconds: number;
  completedSetIds: string[];
  values: Record<string, SetValue>;
  volumeKg: number;
  xp: number;
  skippedExerciseIds: string[];
  feedback: SessionFeedback;
};

type SessionSummary = {
  name: string;
  duration: number;
  volume: number;
  sets: number;
  xp: number;
  skippedExercises: number;
  feedback: SessionFeedback;
};

type ChatMessage = {
  id: number;
  from: "user" | "coach";
  text: string;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const navItems: { id: ViewId; label: string; description: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Início", description: "Seu dia", icon: Home },
  { id: "workouts", label: "Treinos", description: "Rotinas e agenda", icon: Dumbbell },
  { id: "programs", label: "Explorar", description: "Programas guiados", icon: Clapperboard },
  { id: "library", label: "Exercícios", description: "Catálogo completo", icon: BookOpen },
  { id: "progress", label: "Progresso", description: "Métricas e recordes", icon: ChartNoAxesCombined },
  { id: "coach", label: "OLYMPUS AI", description: "Treinador inteligente", icon: Sparkles },
  { id: "running", label: "Corrida", description: "Pace e distância", icon: Footprints },
  { id: "mobility", label: "Yoga & mobilidade", description: "Recuperação", icon: HeartPulse },
  { id: "calendar", label: "Calendário", description: "Planejamento", icon: CalendarDays },
  { id: "trainer", label: "Personal trainer", description: "Painel profissional", icon: UserRound },
  { id: "profile", label: "Perfil", description: "Preferências e conta", icon: Settings },
];

const viewTitles: Record<ViewId, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: { eyebrow: "SEGUNDA-FEIRA, 20 DE JULHO", title: "Boa tarde, Andrey", subtitle: "Você treinou 4 vezes esta semana. Continue construindo." },
  programs: { eyebrow: "OLYMPUS TRAINING", title: "Explorar", subtitle: "Programas e sessões guiadas para cada objetivo." },
  workouts: { eyebrow: "PROJETO HÍBRIDO · SEMANA 6", title: "Seus treinos", subtitle: "Estrutura inteligente para cada objetivo." },
  library: { eyebrow: "BIBLIOTECA", title: "Explore exercícios", subtitle: "Técnica, músculos e alternativas em um só lugar." },
  progress: { eyebrow: "ANÁLISE DE PERFORMANCE", title: "Seu progresso", subtitle: "Cada repetição conta uma parte da sua história." },
  calendar: { eyebrow: "PLANEJAMENTO", title: "Calendário", subtitle: "Consistência começa com uma semana bem planejada." },
  coach: { eyebrow: "OLYMPUS INTELLIGENCE", title: "OLYMPUS AI", subtitle: "Decisões melhores com base no seu histórico." },
  profile: { eyebrow: "SUA CONTA", title: "Perfil", subtitle: "Preferências, conquistas e segurança." },
  running: { eyebrow: "OLYMPUS RUN", title: "Corrida", subtitle: "Distância, pace e zonas cardíacas." },
  mobility: { eyebrow: "RECUPERAÇÃO", title: "Yoga & mobilidade", subtitle: "Mova-se melhor para evoluir sempre." },
  trainer: { eyebrow: "OLYMPUS PRO", title: "Personal trainer", subtitle: "Alunos, treinos e evolução em um só painel." },
};

const iconForMetric = {
  Flame,
  Timer,
  Route,
  Dumbbell,
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const chartTooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,.1)",
  borderRadius: 12,
  color: "#0f172a",
  boxShadow: "0 16px 42px rgba(15,23,42,.14)",
};

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatShortTime(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function parseReps(value: string) {
  return Number(value.split(/[–-]/)[0]) || 8;
}

function createSession(workout: Workout): ActiveSession {
  const values: Record<string, SetValue> = {};
  workout.exercises.forEach((exercise) => {
    Array.from({ length: exercise.sets }, (_, index) => {
      values[[exercise.id, index].join("-")] = { load: exercise.load, reps: parseReps(exercise.reps), rpe: exercise.rpe };
    });
  });
  return {
    workoutId: workout.id,
    startedAt: Date.now(),
    pausedAt: null,
    pausedDuration: 0,
    completed: [],
    values,
    restEndsAt: null,
    restTotalSeconds: 0,
    skippedExerciseIds: [],
    feedback: "Adequado",
  };
}

function isActiveSession(value: unknown): value is ActiveSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<ActiveSession>;
  return Boolean(
    typeof session.workoutId === "string" &&
    (workouts.some((workout) => workout.id === session.workoutId) || session.workoutId === "forge-next") &&
    typeof session.startedAt === "number" &&
    Array.isArray(session.completed) &&
    session.values &&
    typeof session.values === "object",
  );
}

function ProgressBar({ value, tone = "violet", label }: { value: number; tone?: string; label?: string }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <span className={"progress-fill tone-" + tone} style={{ width: Math.min(100, value) + "%" }} />
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"brand " + (compact ? "brand-compact" : "")} aria-label="OLYMPUS AI">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/branding/olympus-app-icon.png" alt="" width={42} height={42} priority />
      </span>
      {!compact && (
        <span className="brand-word">
          OLYMPUS <small>AI · TREINE COM INTELIGÊNCIA</small>
        </span>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action} <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

function MetricCard({ metric, index }: { metric: (typeof metrics)[number]; index: number }) {
  const Icon = iconForMetric[metric.icon as keyof typeof iconForMetric] || Activity;
  return (
    <motion.article
      className="metric-card card"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.08 + index * 0.04 }}
    >
      <div className="metric-card-top">
        <span className={"icon-box tone-" + metric.tone}><Icon size={18} /></span>
        <span className="trend positive"><ArrowUpRight size={13} /> {metric.trend}</span>
      </div>
      <p>{metric.label}</p>
      <strong>{metric.value}<small>{metric.unit}</small></strong>
      <ProgressBar value={metric.progress} tone={metric.tone} label={metric.label + ": " + metric.progress + "% da meta"} />
    </motion.article>
  );
}

function PageIntro({ view, athleteName }: { view: ViewId; athleteName?: string }) {
  const item = viewTitles[view];
  const title = view === "dashboard" && athleteName ? `Boa tarde, ${athleteName.split(/\s+/)[0]}` : item.title;
  return (
    <motion.header className="page-intro" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
      <p className="eyebrow">{item.eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-subtitle">{item.subtitle}</p>
    </motion.header>
  );
}

type LibraryExercise = (typeof exerciseLibrary)[number];

type DetailTabId = "technique" | "safety" | "progress";

const exerciseCategoryOrder = [
  "Peito", "Costas", "Ombros", "Trapézio", "Bíceps", "Tríceps", "Antebraços", "Antebraço",
  "Core", "Abdômen", "Oblíquos", "Lombar", "Pernas", "Quadríceps", "Posteriores", "Posterior",
  "Glúteos", "Panturrilhas", "Panturrilha", "Adutores e abdutores", "Pescoço", "Calistenia",
  "Mobilidade", "Alongamento", "Yoga", "Pilates", "Funcional", "HIIT", "Cross Training",
  "Corrida", "Caminhada", "Reabilitação",
];

const EXERCISES_PER_PAGE = 24;

function toExerciseTextList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value || typeof value !== "object") return [];
  const labels: Record<string, string> = { strength: "Força", hypertrophy: "Hipertrofia", endurance: "Resistência" };
  return Object.entries(value).map(([key, entry]) => {
    if (!entry || typeof entry !== "object") return `${labels[key] || key}: ${String(entry)}`;
    const prescription = entry as { sets?: string; reps?: string; intensity?: string; note?: string };
    const structure = [prescription.sets ? `${prescription.sets} séries` : "", prescription.reps ? `${prescription.reps} reps` : "", prescription.intensity || ""].filter(Boolean).join(" · ");
    return `${labels[key] || key}: ${structure}${prescription.note ? `. ${prescription.note}` : ""}`;
  });
}

function exerciseMetadataLabel(value: string) {
  const labels: Record<string, string> = {
    upper: "Membros superiores", lower: "Membros inferiores", full: "Corpo inteiro",
    compound: "Composto", isolation: "Isolado", calisthenics: "Calistenia", mobility: "Mobilidade",
    "horizontal-press": "Empurrar horizontal", "vertical-press": "Empurrar vertical",
    "horizontal-pull": "Puxar horizontal", "vertical-pull": "Puxar vertical",
    "knee-flexion": "Flexão de joelho", "knee-extension": "Extensão de joelho",
    "hip-abduction": "Abdução de quadril", "hip-extension": "Extensão de quadril",
    "ankle-extension": "Flexão plantar", "body-control": "Controle corporal",
    hinge: "Dobradiça de quadril", squat: "Agachamento", lunge: "Passada",
    fly: "Adução de ombro", curl: "Flexão de cotovelo", extension: "Extensão de cotovelo",
    raise: "Elevação de ombro", shrug: "Elevação escapular", rotation: "Rotação",
    carry: "Carregada", crunch: "Flexão de tronco", antirotation: "Anti-rotação",
  };
  return labels[value] || value;
}

function normalizeExerciseSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function createSavedWorkout(savedExerciseIds: string[]): Workout | null {
  const exercises = savedExerciseIds
    .map((id) => exerciseLibrary.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is LibraryExercise => Boolean(exercise))
    .map((exercise) => {
      const prescription = exercise.prescriptions.hypertrophy;
      const bodyweight = /peso corporal|faixa|elástico|mini band|banco|degrau/i.test(exercise.equipment) || exercise.category === "Calistenia";
      return {
        id: exercise.id,
        name: exercise.name,
        muscle: exercise.primary.split("·")[0].trim(),
        sets: Number(prescription.sets.match(/\d+/)?.[0] || 3),
        reps: prescription.reps,
        load: bodyweight ? 0 : 20,
        rest: exercise.rest,
        rpe: 7.5,
        note: "Adicionado da biblioteca OLYMPUS",
      };
    });

  if (exercises.length === 0) return null;
  return {
    id: "forge-next",
    name: "Meu treino OLYMPUS",
    subtitle: "Exercícios salvos da biblioteca",
    category: "Personalizado",
    duration: Math.max(20, exercises.length * 12),
    volume: 0,
    calories: Math.max(180, exercises.length * 70),
    accent: "blue",
    exercises,
  };
}

function guideForExercise(exercise: LibraryExercise) {
  const specialSafety = exercise.category === "Calistenia"
    ? "Use uma progressão compatível com sua força. Pare se houver desconforto articular em ombros, cotovelos ou punhos."
    : exercise.category === "Pernas"
      ? "Mantenha joelhos acompanhando a linha dos pés e reduza a amplitude se houver dor."
      : exercise.category === "Costas"
        ? "Mantenha o tronco estável e evite puxar com impulso ou compensar com a lombar."
        : "Priorize amplitude confortável, alinhamento e carga que permita controle total.";

  return {
    steps: [
      `Ajuste ${exercise.equipment.toLowerCase()} e encontre uma posição estável antes de começar.`,
      `Execute ${exercise.name.toLowerCase()} com ritmo controlado e o core ativo.`,
      "Retorne sem perder o alinhamento e encerre a série se a técnica se deteriorar.",
    ],
    breathing: "Inspire na fase de retorno; expire durante a fase de maior esforço, sem prender o ar por tempo excessivo.",
    errors: ["Usar impulso para compensar a carga.", "Perder a amplitude confortável.", "Acelerar a fase de retorno sem controle."],
    safety: specialSafety,
    alternative: exercise.category === "Calistenia" ? "Versão assistida, isometria ou redução de alavanca." : "Reduza a carga, altere o implemento ou escolha uma variação assistida.",
  };
}

function detailGuideForExercise(exercise: LibraryExercise) {
  const fallback = guideForExercise(exercise);
  const execution = toExerciseTextList(exercise.execution);
  const commonErrors = toExerciseTextList(exercise.commonErrors);
  const care = toExerciseTextList(exercise.care);
  const variations = toExerciseTextList(exercise.variations);

  return {
    ...fallback,
    steps: execution.length ? execution : fallback.steps,
    range: exercise.range || "Use uma amplitude confortável, estável e compatível com a sua mobilidade.",
    breathing: exercise.breathing || fallback.breathing,
    errors: commonErrors.length ? commonErrors : fallback.errors,
    cues: toExerciseTextList(exercise.cues),
    variations: variations.length ? variations : [fallback.alternative],
    similar: toExerciseTextList(exercise.similar),
    care: care.length ? care : [fallback.safety],
    prescriptions: toExerciseTextList(exercise.prescriptions),
    rest: typeof exercise.rest === "number" ? `${exercise.rest} s` : exercise.rest || "Conforme a prescrição",
    cadence: exercise.cadence || "Ritmo controlado, sem impulso.",
    activation: exercise.activation || "Core ativo e articulações alinhadas.",
    equipmentAlternative: toExerciseTextList(exercise.equipmentAlternative),
    type: exerciseMetadataLabel(exercise.type || "Força e controle"),
    region: exerciseMetadataLabel(exercise.region || exercise.category),
    movement: exerciseMetadataLabel(exercise.movement || "Movimento guiado"),
    objective: toExerciseTextList(exercise.objective),
    tags: toExerciseTextList(exercise.tags),
  };
}

function DetailCollection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <section className="detail-collection" aria-label={title}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}
      </ul>
    </section>
  );
}

function DashboardView({
  onStart,
  navigate,
  history,
  athleteName,
}: {
  onStart: (workout: Workout) => void;
  navigate: (view: ViewId) => void;
  history: CompletedSession[];
  athleteName: string;
}) {
  const today = workouts[0];
  const completedVolume = history.reduce((sum, item) => sum + item.volumeKg, 0);
  const displayMetrics = metrics.map((metric) => metric.label === "Volume semanal"
    ? { ...metric, value: (42.8 + completedVolume / 1000).toFixed(1).replace(".", ",") }
    : metric);
  return (
    <div className="view-stack">
      <div className="dashboard-editorial-head"><PageIntro view="dashboard" athleteName={athleteName} /><button className="editorial-text-link" onClick={() => navigate("programs")}>Explorar treinos <ArrowRight size={16} /></button></div>
      <PulseEditorialHero workout={today} onStart={() => onStart(today)} onExplore={() => navigate("programs")} />

      <section className="forge-quick-modules" aria-label="Modalidades e serviços">
        <button onClick={() => navigate("running")}><span className="tone-blue"><Footprints size={20} /></span><strong>Corrida</strong><small>Pace, distância e planos</small><ArrowRight size={16} /></button>
        <button onClick={() => navigate("mobility")}><span className="tone-green"><HeartPulse size={20} /></span><strong>Yoga & mobilidade</strong><small>Recupere e mova-se melhor</small><ArrowRight size={16} /></button>
        <button onClick={() => navigate("coach")}><span className="tone-violet"><Sparkles size={20} /></span><strong>OLYMPUS AI</strong><small>Recomendação personalizada</small><ArrowRight size={16} /></button>
        <button onClick={() => navigate("trainer")}><span className="tone-orange"><UserRound size={20} /></span><strong>Área profissional</strong><small>Gestão de alunos</small><ArrowRight size={16} /></button>
      </section>

      <section className="dashboard-grid hero-grid" aria-label="Resumo de hoje">
        <motion.article
          className="hero-card recovery-hero card grid-span-7"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="orb orb-one" />
          <div className="hero-copy">
            <span className="status-pill"><Zap size={14} /> Pronto para treinar</span>
            <h2>Recuperação acima<br />da sua média.</h2>
            <p>Sono consistente e baixa frequência de repouso indicam uma ótima janela para performance.</p>
            <div className="recovery-stats">
              <div><Moon size={15} /><span><strong>7h 42</strong><small>Sono</small></span></div>
              <div><HeartPulse size={15} /><span><strong>56 bpm</strong><small>Repouso</small></span></div>
              <div><Gauge size={15} /><span><strong>8,4/10</strong><small>Energia</small></span></div>
            </div>
          </div>
          <div className="readiness-ring" style={{ "--score": "86%" } as React.CSSProperties}>
            <div><strong>86</strong><span>/100</span><small>PRONTIDÃO</small></div>
          </div>
        </motion.article>

        <motion.article
          className="today-workout card grid-span-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="workout-card-header">
            <span className="eyebrow"><span className="live-dot" /> TREINO DE HOJE</span>
            <button className="icon-button ghost" aria-label="Mais opções"><MoreHorizontal size={19} /></button>
          </div>
          <div>
            <h2>{today.name}</h2>
            <p>{today.subtitle}</p>
          </div>
          <div className="workout-meta">
            <span><Clock3 size={14} /> {today.duration} min</span>
            <span><Dumbbell size={14} /> {today.exercises.length} exercícios</span>
            <span><Flame size={14} /> Intenso</span>
          </div>
          <div className="exercise-preview">
            {today.exercises.slice(0, 3).map((exercise, index) => (
              <div key={exercise.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{exercise.name}<small>{exercise.sets} × {exercise.reps} · {exercise.load} kg</small></p>
              </div>
            ))}
          </div>
          <button className="primary-button full-button" onClick={() => onStart(today)}>
            <Play size={17} fill="currentColor" /> Iniciar treino
          </button>
        </motion.article>
      </section>

      <section className="metric-grid" aria-label="Métricas do dia">
        {displayMetrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} />)}
      </section>

      <section className="dashboard-grid">
        <article className="card chart-card grid-span-8">
          <div className="card-heading-row">
            <div><p className="eyebrow">ÚLTIMAS 8 SEMANAS</p><h2>Evolução de volume</h2></div>
            <div className="segmented"><button className="active">Volume</button><button>Carga</button><button>Distância</button></div>
          </div>
          <div className="chart-summary">
            <strong>42,8 <small>ton</small></strong>
            <span className="trend positive"><ArrowUpRight size={13} /> 15,9% este mês</span>
          </div>
          <div className="chart-container" role="img" aria-label="Volume semanal subiu de 31,2 para 42,8 toneladas nas últimas oito semanas.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyVolume} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#697486", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#697486", fontSize: 11 }} domain={[20, 50]} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [String(value).replace(".", ",") + " t", "Volume"]} />
                <Area type="monotone" dataKey="volume" stroke="#8b72ff" strokeWidth={2.5} fill="url(#volumeFill)" activeDot={{ r: 5, fill: "#48dfff", stroke: "#080b11", strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card weekly-goal grid-span-4">
          <div className="card-heading-row">
            <div><p className="eyebrow">META SEMANAL</p><h2>Seu ritmo</h2></div>
            <span className="streak-badge"><Flame size={15} /> 12 dias</span>
          </div>
          <div className="goal-number"><strong>3</strong><span>/5</span><small>treinos completos</small></div>
          <div className="week-dots">
            {weekSchedule.map((day) => (
              <div key={day.day} className={day.status}>
                <span>{day.day.slice(0, 1)}</span>
                <i>{day.status === "done" ? <Check size={12} /> : day.date}</i>
              </div>
            ))}
          </div>
          <ProgressBar value={60} tone="violet" label="3 de 5 treinos concluídos" />
          <p className="supporting-copy"><Sparkles size={15} /> Faltam apenas 2 sessões para superar sua média.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card recent-card grid-span-7">
          <SectionHeading title="Atividades recentes" action="Ver histórico" onAction={() => navigate("progress")} />
          <div className="activity-list">
            {history.slice(0, 1).map((activity) => (
              <button className="activity-row" key={activity.id}>
                <span className="activity-icon tone-green"><CircleCheck size={18} /></span>
                <span className="activity-name"><strong>{activity.name}</strong><small>Musculação · concluído agora</small></span>
                <span className="activity-value"><strong>{Math.max(1, Math.round(activity.durationSeconds / 60))} min</strong><small>{activity.volumeKg.toLocaleString("pt-BR")} kg</small></span>
                <ChevronRight size={17} />
              </button>
            ))}
            {recentActivities.map((activity) => {
              const ActivityIcon = activity.icon === "Dumbbell" ? Dumbbell : activity.icon === "Footprints" ? Footprints : Activity;
              return (
                <button className="activity-row" key={activity.title}>
                  <span className={"activity-icon tone-" + activity.tone}><ActivityIcon size={18} /></span>
                  <span className="activity-name"><strong>{activity.title}</strong><small>{activity.type} · {activity.when}</small></span>
                  <span className="activity-value"><strong>{activity.duration}</strong><small>{activity.stat}</small></span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </article>

        <article className="card ai-card grid-span-5">
          <div className="ai-card-top"><span className="ai-icon"><Sparkles size={19} /></span><span className="eyebrow">INSIGHT DO OLYMPUS AI</span></div>
          <h2>Você está pronto para subir a carga.</h2>
          <p>Seu supino atingiu o topo da faixa nas últimas 3 sessões com RPE médio de 7,8.</p>
          <div className="recommendation"><TrendingMini /><span><strong>+2,5 kg no supino</strong><small>92% de confiança · baseado em 3 sessões</small></span></div>
          <button className="secondary-button full-button" onClick={() => navigate("coach")}>Ver análise completa <ArrowRight size={16} /></button>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card body-card grid-span-5">
          <div className="card-heading-row"><div><p className="eyebrow">COMPOSIÇÃO CORPORAL</p><h2>Seu corpo</h2></div><span className="muted-label">Atualizado hoje</span></div>
          <div className="body-metrics">
            <div><span>Peso</span><strong>79,4<small> kg</small></strong><em>−0,4 kg</em></div>
            <div><span>Gordura</span><strong>16,8<small>%</small></strong><em>−0,1%</em></div>
            <div><span>IMC</span><strong>25,1</strong><em className="neutral">Estável</em></div>
          </div>
          <button className="text-button" onClick={() => navigate("progress")}>Abrir composição <ArrowRight size={15} /></button>
        </article>
        <article className="card hydration-card grid-span-3">
          <div className="card-heading-row"><span className="icon-box tone-blue"><Droplets size={18} /></span><span className="muted-label">HOJE</span></div>
          <p>Hidratação</p><strong>2,1 <small>/ 3,2 L</small></strong>
          <ProgressBar value={66} tone="blue" label="Hidratação: 66% da meta" />
          <span className="muted-label">Faltam 1,1 L</span>
        </article>
        <article className="card achievement-card grid-span-4">
          <div className="achievement-glow" />
          <span className="trophy-orb"><Trophy size={24} /></span>
          <div><p className="eyebrow">NOVA CONQUISTA</p><h2>Volume Titã</h2><p>Mais de 100 toneladas movimentadas este mês.</p></div>
          <span className="xp-chip">+800 XP</span>
        </article>
      </section>
    </div>
  );
}

function TrendingMini() {
  return (
    <span className="trend-graphic" aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

function WorkoutsView({ onStart, toast, availableWorkouts }: { onStart: (workout: Workout) => void; toast: (message: string) => void; availableWorkouts: Workout[] }) {
  return (
    <div className="view-stack">
      <div className="page-intro-row">
        <PageIntro view="workouts" />
        <button className="primary-button" onClick={() => toast("Novo treino criado como rascunho.")}><Plus size={17} /> Criar treino</button>
      </div>
      <article className="card program-card">
        <div className="program-copy">
          <span className="status-pill"><Sparkles size={14} /> Programa ativo</span>
          <h2>Projeto Híbrido — 12 Semanas</h2>
          <p>Força, hipertrofia e condicionamento sem perder mobilidade.</p>
          <div className="program-meta"><span>Semana <strong>6 de 12</strong></span><span>Fase <strong>Construção</strong></span><span>Aderência <strong>92%</strong></span><span>Próximo deload <strong>Semana 8</strong></span></div>
        </div>
        <div className="program-progress">
          <div className="readiness-ring small-ring" style={{ "--score": "50%" } as React.CSSProperties}><div><strong>50</strong><span>%</span><small>CONCLUÍDO</small></div></div>
        </div>
      </article>
      <div className="section-heading-row">
        <SectionHeading title="Rotinas da semana" />
        <div className="segmented"><button className="active">Todas</button><button>Força</button><button>Cardio</button></div>
      </div>
      <section className="workout-grid">
        {availableWorkouts.map((workout, index) => (
          <motion.article
            className={"card workout-template accent-" + workout.accent}
            key={workout.id}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: index * 0.05 }}
          >
            <div className="template-top"><span className={"template-icon tone-" + workout.accent}><Dumbbell size={21} /></span><button className="icon-button ghost" aria-label={"Opções de " + workout.name}><MoreHorizontal size={19} /></button></div>
            <span className="muted-label">{workout.category.toUpperCase()}</span>
            <h2>{workout.name}</h2>
            <p>{workout.subtitle}</p>
            <div className="template-stats"><span><Clock3 size={14} /> {workout.duration} min</span><span><Activity size={14} /> {workout.exercises.length} exercícios</span><span><Gauge size={14} /> RPE 8</span></div>
            <div className="template-exercises">
              {workout.exercises.slice(0, 3).map((exercise) => <span key={exercise.id}>{exercise.name}<small>{exercise.sets} × {exercise.reps}</small></span>)}
              <span className="more-exercises">+ {Math.max(0, workout.exercises.length - 3)} exercício</span>
            </div>
            <button className="secondary-button full-button" onClick={() => onStart(workout)}><Play size={16} fill="currentColor" /> Iniciar rotina</button>
          </motion.article>
        ))}
        <button className="add-workout-card" onClick={() => toast("Escolha um objetivo para gerar sua próxima rotina.")}>
          <span><Plus size={22} /></span><strong>Nova rotina</strong><small>Crie do zero ou use o OLYMPUS AI</small>
        </button>
      </section>
      <article className="card planner-card">
        <div><span className="icon-box tone-violet"><CalendarPlus size={19} /></span><div><p className="eyebrow">PRÓXIMOS 7 DIAS</p><h2>Sua semana, em um olhar</h2></div></div>
        <div className="week-planner">
          {weekSchedule.map((item) => (
            <button key={item.day} className={"planner-day " + item.status}>
              <span>{item.day}</span><strong>{item.date}</strong><i className={"tone-" + item.tone} /><small>{item.name}</small>
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}

function LibraryView({ savedExerciseIds, onAddToNextWorkout, onToast, initialQuery }: { savedExerciseIds: string[]; onAddToNextWorkout: (exercise: LibraryExercise) => void; onToast: (message: string) => void; initialQuery: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [selected, setSelected] = useState<LibraryExercise | null>(null);
  const [offlineIds, setOfflineIds] = useState<string[]>([]);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(EXERCISES_PER_PAGE);
  const [detailTab, setDetailTab] = useState<DetailTabId>("technique");
  const drawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const selectedTriggerRef = useRef<HTMLButtonElement>(null);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    exerciseLibrary.forEach((exercise) => counts.set(exercise.category, (counts.get(exercise.category) || 0) + 1));
    const availableCategories = Array.from(counts.keys());
    const categories = [
      "Todos",
      ...exerciseCategoryOrder.filter((category) => counts.has(category)),
      ...availableCategories
        .filter((category) => !exerciseCategoryOrder.includes(category))
        .sort((left, right) => left.localeCompare(right, "pt-BR")),
    ];
    return { categories, counts };
  }, []);

  const indexedExercises = useMemo(() => exerciseLibrary.map((entry) => {
    const exercise = entry as LibraryExercise;
    const searchable = [
      exercise.name,
      exercise.category,
      exercise.equipment,
      exercise.primary,
      exercise.secondary,
      exercise.level,
      exercise.region,
      exerciseMetadataLabel(exercise.region),
      exercise.movement,
      exerciseMetadataLabel(exercise.movement),
      exercise.type,
      exerciseMetadataLabel(exercise.type),
      ...toExerciseTextList(exercise.objective),
      ...toExerciseTextList(exercise.tags),
    ].join(" ");
    return { exercise, searchIndex: normalizeExerciseSearch(searchable) };
  }), []);

  const normalizedQuery = normalizeExerciseSearch(query);
  const filtered = useMemo(() => indexedExercises
    .filter(({ exercise, searchIndex }) => (
      searchIndex.includes(normalizedQuery)
      && (filter === "Todos" || exercise.category === filter)
      && (!offlineOnly || offlineIds.includes(exercise.id))
    ))
    .map(({ exercise }) => exercise), [filter, indexedExercises, normalizedQuery, offlineIds, offlineOnly]);
  const visibleExercises = filtered.slice(0, visibleCount);
  const remainingExercises = Math.max(0, filtered.length - visibleExercises.length);
  const selectedGuide = useMemo(() => (selected ? detailGuideForExercise(selected) : null), [selected]);
  const selectedMetadata = useMemo(() => {
    if (!selectedGuide) return [];
    return Array.from(new Set([
      selectedGuide.type,
      selectedGuide.region,
      selectedGuide.movement,
      ...selectedGuide.objective,
      ...selectedGuide.tags,
    ].filter((item): item is string => Boolean(item))));
  }, [selectedGuide]);

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => { setVisibleCount(EXERCISES_PER_PAGE); }, [query, filter, offlineOnly, offlineIds]);
  useEffect(() => {
    if (!selected) return;
    const focusTimer = window.setTimeout(() => drawerCloseButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [selected]);
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selected]);
  useEffect(() => { void listOfflineGuides().then((items) => setOfflineIds(items.map((item) => item.id))).catch(() => undefined); }, []);

  const closeDrawer = () => {
    setSelected(null);
    window.setTimeout(() => selectedTriggerRef.current?.focus(), 0);
  };

  const handleDetailTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTab: DetailTabId) => {
    const tabs: { id: DetailTabId; tabId: string }[] = [
      { id: "technique", tabId: "exercise-technique-tab" },
      { id: "safety", tabId: "exercise-safety-tab" },
      { id: "progress", tabId: "exercise-progress-tab" },
    ];
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const nextIndex = event.key === "ArrowRight" ? (currentIndex + 1) % tabs.length
      : event.key === "ArrowLeft" ? (currentIndex + tabs.length - 1) % tabs.length
        : event.key === "Home" ? 0
          : event.key === "End" ? tabs.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setDetailTab(nextTab.id);
    window.setTimeout(() => document.getElementById(nextTab.tabId)?.focus(), 0);
  };

  const toggleOffline = async () => {
    if (!selected) return;
    try {
      if (offlineIds.includes(selected.id)) {
        await removeOfflineGuide(selected.id);
        setOfflineIds((current) => current.filter((id) => id !== selected.id));
        return;
      }
      await saveOfflineGuide({ ...selected, steps: detailGuideForExercise(selected).steps, savedAt: new Date().toISOString() });
      setOfflineIds((current) => [...current, selected.id]);
    } catch {
      onToast("Não foi possível atualizar o guia offline. Tente novamente.");
    }
  };

  return (
    <div className="view-stack">
      <PageIntro view="library" />
      <div className="library-toolbar card">
        <label className="search-field large-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar exercício, músculo, objetivo ou equipamento..." aria-label="Buscar exercício, músculo, objetivo ou equipamento" /></label>
        <div className="filter-pills" role="group" aria-label="Filtrar por categoria">
          {categoryStats.categories.map((category) => {
            const count = category === "Todos" ? exerciseLibrary.length : categoryStats.counts.get(category) || 0;
            return <button key={category} type="button" aria-label={`${category}: ${count} exercícios`} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}><span>{category}</span><small className="filter-count" aria-hidden="true">{count}</small></button>;
          })}
        </div>
        <button type="button" className={"secondary-button offline-filter " + (offlineOnly ? "active" : "")} onClick={() => setOfflineOnly((value) => !value)}><Download size={16} /> Offline ({offlineIds.length})</button>
      </div>
      <div className="library-results-row"><p aria-live="polite"><strong>{filtered.length}</strong> exercícios encontrados</p><span className="library-result-scope">Exibindo {visibleExercises.length} de {filtered.length}</span></div>
      {filtered.length > 0 ? (
        <>
          <section className="exercise-grid" aria-label="Exercícios encontrados">
            {visibleExercises.map((exercise, index) => (
              <motion.article
                className="card exercise-card"
                key={exercise.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: Math.min(index, 7) * 0.035 }}
              >
                <button type="button" className="exercise-card-open" aria-label={`Abrir detalhes de ${exercise.name}`} onClick={(event) => { selectedTriggerRef.current = event.currentTarget; setSelected(exercise); setDetailTab("technique"); }}>
                  <div className={"exercise-visual accent-" + exercise.accent}>
                    <Image src={exercise.image} alt={`Fotografia de ${exercise.name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                    <span className="exercise-image-shade" aria-hidden="true" />
                    <span className="favorite">{exercise.favorite ? "★" : "☆"}</span>
                    <span className="level-pill">{exercise.level}</span>
                  </div>
                  <div className="exercise-copy">
                    <p className="eyebrow">{exercise.category} · {exercise.equipment}</p>
                    <h2>{exercise.name}</h2>
                    <p><strong>{exercise.primary}</strong><small>{exercise.secondary}</small></p>
                    <span>Melhor marca <strong>{exercise.best}</strong></span><em className="accessibility-chip">{exercise.level === "Avançado" ? "Progressão necessária" : "Adaptável"}</em>
                  </div>
                </button>
                <button type="button" className="exercise-execution-cta" onClick={(event) => { selectedTriggerRef.current = event.currentTarget; setSelected(exercise); setDetailTab("technique"); }}>
                  <span className="exercise-execution-icon"><Play size={14} fill="currentColor" /></span>
                  <span><strong>Ver execução 3D</strong><small>Atleta humano · câmera 360°</small></span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </motion.article>
            ))}
          </section>
          {remainingExercises > 0 && <button type="button" className="secondary-button library-load-more" onClick={() => setVisibleCount((count) => Math.min(count + EXERCISES_PER_PAGE, filtered.length))}>Mostrar mais <small>{remainingExercises} restantes</small></button>}
        </>
      ) : (
        <div className="empty-state card"><Search size={28} /><h2>Nenhum exercício encontrado</h2><p>Tente outro termo ou remova um filtro.</p><button type="button" className="secondary-button" onClick={() => { setQuery(""); setFilter("Todos"); setOfflineOnly(false); }}>Limpar filtros</button></div>
      )}
      <AnimatePresence>
        {selected && selectedGuide && (
          <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={closeDrawer}>
            <motion.aside className="detail-drawer exercise-detail-screen" role="dialog" aria-modal="true" aria-labelledby="exercise-detail-title" initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 18 }} transition={{ type: "spring", damping: 30, stiffness: 300 }} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeDrawer(); return; } trapDialogFocus(event); }}>
              <header className="detail-screen-header">
                <button ref={drawerCloseButtonRef} type="button" className="drawer-back-button" onClick={closeDrawer}><ChevronLeft size={18} /> Voltar</button>
                <div><p className="eyebrow">{selected.category} · {selected.equipment}</p><h2 id="exercise-detail-title">{selected.name}</h2></div>
                <span className="detail-level-chip">{selected.level}</span>
              </header>
              <div className="detail-screen-body">
                <section className="detail-motion-column" aria-label="Demonstração visual">
                  <ExerciseMotionPlayer key={selected.id} exercise={selected} />
                  <p className="drawer-description">Modelo humano 3D interativo carregado pelo perfil <code>{selected.animationFile}</code>. Gire em 360°, ajuste o zoom e use como referência visual, respeitando seus limites de mobilidade.</p>
                  <div className="drawer-stat-grid"><div><span>Músculo principal</span><strong>{selected.primary}</strong></div><div><span>Secundários</span><strong>{selected.secondary}</strong></div><div><span>Nível</span><strong>{selected.level}</strong></div><div><span>Seu recorde</span><strong>{selected.best}</strong></div></div>
                </section>
                <section className="detail-guidance-column" aria-label="Orientações do exercício">
                  <div className="detail-context-chips" aria-label="Classificação do exercício">{selectedMetadata.map((item) => <span key={item}>{item}</span>)}</div>
                  <div className="detail-tabs" role="tablist" aria-label="Conteúdo do exercício">
                {([[
                  "technique", "Técnica", "exercise-technique-tab"],
                  ["safety", "Segurança", "exercise-safety-tab"],
                  ["progress", "Evolução", "exercise-progress-tab"],
                ] as const).map(([tab, label, tabId]) => <button key={tab} id={tabId} type="button" role="tab" aria-controls="exercise-detail-panel" aria-selected={detailTab === tab} tabIndex={detailTab === tab ? 0 : -1} className={detailTab === tab ? "active" : ""} onClick={() => setDetailTab(tab)} onKeyDown={(event) => handleDetailTabKeyDown(event, tab)}>{label}</button>)}
              </div>
              {detailTab === "technique" && <div id="exercise-detail-panel" role="tabpanel" aria-labelledby="exercise-technique-tab" className="exercise-detail-panel"><h3>Execução</h3><ol className="execution-steps">{selectedGuide.steps.map((step, index) => <li key={`execution-${index}`}>{step}</li>)}</ol><div className="breathing-note"><Activity size={17} /><span><strong>Respiração</strong><small>{selectedGuide.breathing}</small></span></div><div className="detail-fact-grid" aria-label="Parâmetros de execução"><div><span>Amplitude</span><strong>{selectedGuide.range}</strong></div><div><span>Cadência</span><strong>{selectedGuide.cadence}</strong></div><div><span>Ativação</span><strong>{selectedGuide.activation}</strong></div><div><span>Descanso</span><strong>{selectedGuide.rest}</strong></div></div><DetailCollection title="Cues de execução" items={selectedGuide.cues} /></div>}
              {detailTab === "safety" && <div id="exercise-detail-panel" role="tabpanel" aria-labelledby="exercise-safety-tab" className="exercise-detail-panel"><h3>Segurança e erros comuns</h3><ul className="detail-bullet-list">{selectedGuide.errors.map((error, index) => <li key={`error-${index}`}><X size={15} /> {error}</li>)}</ul><div className="warning-note"><Gauge size={18} /><span><strong>Priorize conforto e técnica</strong><small>{selectedGuide.care.join(" ")}</small></span></div>{selectedGuide.equipmentAlternative.length > 0 && <div className="equipment-note"><Dumbbell size={17} /><span><strong>Alternativas de equipamento</strong><small>{selectedGuide.equipmentAlternative.join(" · ")}</small></span></div>}</div>}
              {detailTab === "progress" && <div id="exercise-detail-panel" role="tabpanel" aria-labelledby="exercise-progress-tab" className="exercise-detail-panel"><h3>Variações e progressão</h3><div className="detail-collection-grid"><DetailCollection title="Variações" items={selectedGuide.variations} /><DetailCollection title="Prescrição" items={selectedGuide.prescriptions} /><DetailCollection title="Exercícios similares" items={selectedGuide.similar} /></div></div>}
                  <div className="detail-screen-actions">
                    <button type="button" className="secondary-button full-button" onClick={() => void toggleOffline()}>{offlineIds.includes(selected.id) ? <><Check size={17} /> Disponível offline</> : <><Download size={17} /> Baixar guia offline</>}</button>
                    <button type="button" className="primary-button full-button" onClick={() => onAddToNextWorkout(selected)}>{savedExerciseIds.includes(selected.id) ? <><Check size={17} /> No próximo treino</> : <><Plus size={17} /> Adicionar ao treino</>}</button>
                  </div>
                </section>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressView({ history }: { history: CompletedSession[] }) {
  const [metric, setMetric] = useState<"weight" | "fat">("weight");
  const addedVolume = history.reduce((sum, item) => sum + item.volumeKg, 0);
  return (
    <div className="view-stack">
      <div className="page-intro-row"><PageIntro view="progress" /><div className="segmented period-switch"><button>4S</button><button className="active">3M</button><button>1A</button><button>Tudo</button></div></div>
      <section className="progress-kpis">
        <article className="card"><span className="icon-box tone-violet"><Dumbbell size={18} /></span><p>Volume no mês</p><strong>{(102.4 + addedVolume / 1000).toFixed(1).replace(".", ",")} <small>t</small></strong><span className="trend positive"><ArrowUpRight size={13} /> incluindo sessões registradas</span></article>
        <article className="card"><span className="icon-box tone-cyan"><Activity size={18} /></span><p>Treinos</p><strong>{14 + history.length}</strong><span className="trend positive"><ArrowUpRight size={13} /> {2 + history.length} a mais</span></article>
        <article className="card"><span className="icon-box tone-green"><Clock3 size={18} /></span><p>Tempo ativo</p><strong>11h <small>42min</small></strong><span className="trend positive"><ArrowUpRight size={13} /> 9,5%</span></article>
        <article className="card"><span className="icon-box tone-orange"><Trophy size={18} /></span><p>Novos recordes</p><strong>5</strong><span className="trend neutral">Neste mês</span></article>
      </section>
      <section className="dashboard-grid">
        <article className="card chart-card grid-span-8">
          <div className="card-heading-row">
            <div><p className="eyebrow">COMPOSIÇÃO CORPORAL</p><h2>{metric === "weight" ? "Peso corporal" : "Percentual de gordura"}</h2></div>
            <div className="segmented"><button className={metric === "weight" ? "active" : ""} onClick={() => setMetric("weight")}>Peso</button><button className={metric === "fat" ? "active" : ""} onClick={() => setMetric("fat")}>Gordura</button></div>
          </div>
          <div className="chart-summary"><strong>{metric === "weight" ? "79,4" : "16,8"} <small>{metric === "weight" ? "kg" : "%"}</small></strong><span className="trend positive">{metric === "weight" ? "−3,2 kg em 3 meses" : "−1,5% em 3 meses"}</span></div>
          <div className="chart-container tall-chart" role="img" aria-label="Evolução descendente e controlada da composição corporal nos últimos três meses.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightTrend} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,.055)" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#697486", fontSize: 11 }} />
                <YAxis domain={metric === "weight" ? [78, 84] : [16, 19]} axisLine={false} tickLine={false} tick={{ fill: "#697486", fontSize: 11 }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [String(value).replace(".", ",") + (metric === "weight" ? " kg" : "%"), metric === "weight" ? "Peso" : "Gordura"]} />
                <Line type="monotone" dataKey={metric} stroke={metric === "weight" ? "#8b72ff" : "#42d7ff"} strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#42d7ff", stroke: "#080b11", strokeWidth: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="card records-card grid-span-4">
          <div className="card-heading-row"><div><p className="eyebrow">DESTAQUES</p><h2>Recordes pessoais</h2></div><Trophy size={19} className="accent-icon" /></div>
          <div className="records-list">
            {personalRecords.map((record, index) => (
              <div key={record.label}><span className="record-rank">{String(index + 1).padStart(2, "0")}</span><span><strong>{record.label}</strong><small>{record.date}</small></span><span><strong>{record.value}</strong><small className="positive">{record.change}</small></span></div>
            ))}
          </div>
        </article>
      </section>
      <section className="dashboard-grid">
        <article className="card grid-span-7 consistency-card">
          <div className="card-heading-row"><div><p className="eyebrow">ÚLTIMAS 16 SEMANAS</p><h2>Consistência</h2></div><span className="streak-badge"><Flame size={15} /> 12 dias</span></div>
          <div className="heatmap" aria-label="Mapa de consistência com maior frequência nas semanas recentes">
            {Array.from({ length: 112 }, (_, index) => <i key={index} className={"heat-" + ((index * 7 + Math.floor(index / 5)) % 5)} title={"Dia ativo · intensidade " + ((index % 4) + 1)} />)}
          </div>
          <div className="heatmap-legend"><span>Menos</span><i className="heat-1" /><i className="heat-2" /><i className="heat-3" /><i className="heat-4" /><span>Mais</span></div>
        </article>
        <article className="card grid-span-5 goal-list-card">
          <SectionHeading title="Metas em andamento" />
          {goals.map((goal) => <div className="compact-goal" key={goal.title}><div><strong>{goal.title}</strong><span>{goal.detail}</span></div><strong>{goal.value}%</strong><ProgressBar value={goal.value} tone={goal.tone} label={goal.title + ": " + goal.value + "%"} /><small>{goal.due}</small></div>)}
        </article>
      </section>
    </div>
  );
}

function CalendarView({ onStart }: { onStart: (workout: Workout) => void }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1);
  return (
    <div className="view-stack">
      <div className="page-intro-row"><PageIntro view="calendar" /><button className="primary-button"><Plus size={17} /> Agendar treino</button></div>
      <section className="calendar-summary">
        <div><span className="status-dot done" /><p>Realizados<strong>14</strong></p></div>
        <div><span className="status-dot planned" /><p>Agendados<strong>9</strong></p></div>
        <div><span className="status-dot recovery" /><p>Recuperação<strong>4</strong></p></div>
        <div><span className="status-dot missed" /><p>Perdidos<strong>1</strong></p></div>
      </section>
      <article className="card calendar-card">
        <div className="calendar-toolbar"><div><button className="icon-button" aria-label="Mês anterior"><ChevronLeft size={18} /></button><h2>Julho de 2026</h2><button className="icon-button" aria-label="Próximo mês"><ChevronRight size={18} /></button></div><div className="segmented"><button className="active">Mês</button><button>Semana</button><button>Agenda</button></div></div>
        <div className="calendar-weekdays">{["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">
          <div className="calendar-day empty" /><div className="calendar-day empty" />
          {days.map((day) => (
            <button key={day} className={"calendar-day " + (day === 16 ? "today" : "")}>
              <span>{day}</span>
              <div>
                {(monthEvents[day] || []).map((event, index) => <i className={"event-chip tone-" + event.tone + " " + event.status} key={event.name + index}>{event.status === "done" && <Check size={10} />}{event.name}</i>)}
              </div>
            </button>
          ))}
        </div>
      </article>
      <article className="card next-session">
        <div className="next-session-date"><span>HOJE</span><strong>16</strong><small>JUL</small></div>
        <div><span className="status-pill"><Clock3 size={13} /> 18:30</span><h2>Push A — Peito, ombros e tríceps</h2><p>62 min · 4 exercícios · intensidade alta</p></div>
        <button className="primary-button" onClick={() => onStart(workouts[0])}><Play size={16} fill="currentColor" /> Iniciar</button>
      </article>
    </div>
  );
}

function CoachView({ onStart }: { onStart: (workout: Workout) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, from: "coach", text: "Bom dia, Rafael. Sua prontidão está em 86/100 e eu já analisei o Push A de hoje. Em que posso ajudar?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messageEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { messageEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const sendMessage = (value: string) => {
    const clean = value.trim();
    if (!clean || typing) return;
    setMessages((current) => [...current, { id: Date.now(), from: "user", text: clean }]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      const normalized = clean.toLowerCase();
      const key = Object.keys(coachReplies).find((item) => item !== "default" && normalized.includes(item));
      setMessages((current) => [...current, { id: Date.now() + 1, from: "coach", text: coachReplies[key || "default"] }]);
      setTyping(false);
    }, 650);
  };
  return (
    <div className="view-stack coach-page">
      <PageIntro view="coach" />
      <section className="coach-layout">
        <aside className="coach-context">
          <article className="card coach-status">
            <div className="coach-avatar"><BrainCircuit size={25} /><span /></div>
            <div><p className="eyebrow">OLYMPUS AI</p><h2>Seu copiloto de performance</h2><span className="online-label"><i /> Modelo demonstrativo local</span></div>
          </article>
          <article className="card coach-insight-list">
            <p className="eyebrow">ANÁLISES PRIORITÁRIAS</p>
            {aiInsights.map((insight, index) => <button key={insight.title}><span className={"insight-number tone-" + insight.tone}>{String(index + 1).padStart(2, "0")}</span><span><strong>{insight.title}</strong><small>{insight.confidence}% de confiança</small></span><ChevronRight size={16} /></button>)}
          </article>
          <article className="card data-sources">
            <p className="eyebrow">DADOS CONSIDERADOS</p>
            <div><span><Dumbbell size={15} /> 43 sessões</span><span><Moon size={15} /> 28 noites</span><span><HeartPulse size={15} /> Saúde diária</span></div>
          </article>
        </aside>
        <article className="card coach-chat">
          <div className="chat-header"><div><span className="ai-icon"><Sparkles size={18} /></span><span><strong>Conversa com o Coach</strong><small>Respostas baseadas nos seus dados de demonstração</small></span></div><button className="icon-button" aria-label="Opções da conversa"><MoreHorizontal size={18} /></button></div>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message) => <div className={"chat-message " + message.from} key={message.id}>{message.from === "coach" && <span className="mini-coach"><Sparkles size={13} /></span>}<div>{message.text}</div>{message.from === "user" && <span className="mini-user">{profile.initials}</span>}</div>)}
            {typing && <div className="chat-message coach"><span className="mini-coach"><Sparkles size={13} /></span><div className="typing"><i /><i /><i /></div></div>}
            <div ref={messageEnd} />
          </div>
          <div className="quick-prompts">
            <button onClick={() => sendMessage("Devo aumentar a carga hoje?")}>Devo aumentar a carga?</button>
            <button onClick={() => sendMessage("Como está minha recuperação?")}>Como está minha recuperação?</button>
            <button onClick={() => sendMessage("Analise meu treino")}>Analise meu treino</button>
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte sobre seu treino, recuperação ou metas..." aria-label="Mensagem para o Coach" />
            <button type="submit" aria-label="Enviar mensagem" disabled={!input.trim() || typing}><Send size={17} /></button>
          </form>
          <p className="ai-disclaimer">O OLYMPUS AI demonstra recomendações; decisões de saúde exigem avaliação profissional.</p>
        </article>
      </section>
      <article className="coach-action-banner">
        <span className="icon-box tone-green"><Zap size={18} /></span><div><strong>Recomendação pronta para hoje</strong><p>Teste 85 kg no supino se mantiver RPE ≤ 8 nas duas primeiras séries.</p></div><button className="secondary-button" onClick={() => onStart(workouts[0])}>Abrir Push A <ArrowRight size={15} /></button>
      </article>
    </div>
  );
}

function WorkoutSession({
  session,
  workout,
  now,
  onChange,
  onTogglePause,
  onMinimize,
  onFinish,
  onDiscard,
  onToast,
}: {
  session: ActiveSession;
  workout: Workout;
  now: number;
  onChange: (session: ActiveSession) => void;
  onTogglePause: () => void;
  onMinimize: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onToast: (message: string) => void;
}) {
  const [showFinish, setShowFinish] = useState(false);
  const sessionDialogRef = useRef<HTMLDivElement>(null);
  const finishDialogRef = useRef<HTMLDivElement>(null);
  const finishTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { sessionDialogRef.current?.focus(); }, []);
  useEffect(() => {
    if (!showFinish) return;
    const focusTimer = window.setTimeout(() => finishDialogRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [showFinish]);
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const skippedExerciseIds = session.skippedExerciseIds || [];
  const completedSetCount = workout.exercises.reduce((sum, exercise) => sum + Array.from({ length: exercise.sets }, (_, index) => session.completed.includes([exercise.id, index].join("-"))).filter(Boolean).length, 0);
  const creditedSetCount = workout.exercises.reduce((sum, exercise) => {
    if (skippedExerciseIds.includes(exercise.id)) return sum + exercise.sets;
    return sum + Array.from({ length: exercise.sets }, (_, index) => session.completed.includes([exercise.id, index].join("-"))).filter(Boolean).length;
  }, 0);
  const progress = totalSets > 0 ? (creditedSetCount / totalSets) * 100 : 0;
  const pausedCurrent = session.pausedAt ? now - session.pausedAt : 0;
  const elapsed = Math.floor((now - session.startedAt - session.pausedDuration - pausedCurrent) / 1000);
  const rest = session.restEndsAt ? Math.max(0, Math.ceil((session.restEndsAt - now) / 1000)) : 0;

  const toggleSet = (exercise: WorkoutExercise, index: number) => {
    const id = [exercise.id, index].join("-");
    const done = session.completed.includes(id);
    if (done) {
      onChange({ ...session, completed: session.completed.filter((item) => item !== id) });
    } else {
      onChange({
        ...session,
        completed: [...session.completed, id],
        restEndsAt: Date.now() + exercise.rest * 1000,
        restTotalSeconds: exercise.rest,
      });
      if (navigator.vibrate) navigator.vibrate(35);
    }
  };

  const updateValue = (id: string, field: keyof SetValue, value: number) => {
    onChange({ ...session, values: { ...session.values, [id]: { ...session.values[id], [field]: value } } });
  };

  const toggleSkipExercise = (exercise: WorkoutExercise) => {
    const skipped = skippedExerciseIds.includes(exercise.id);
    onChange({
      ...session,
      skippedExerciseIds: skipped ? skippedExerciseIds.filter((id) => id !== exercise.id) : [...skippedExerciseIds, exercise.id],
    });
    onToast(skipped ? `${exercise.name} voltou para o treino.` : `${exercise.name} foi pulado e mantido no seu registro.`);
  };
  const closeFinishModal = () => {
    setShowFinish(false);
    window.setTimeout(() => finishTriggerRef.current?.focus(), 0);
  };

  return (
    <motion.div ref={sessionDialogRef} className="session-screen" role="dialog" aria-modal="true" aria-label={"Treino em andamento: " + workout.name} tabIndex={-1} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onMinimize(); return; } trapDialogFocus(event); }}>
      <header className="session-header">
        <div className="session-header-left"><button className="icon-button" onClick={onMinimize} aria-label="Minimizar treino"><ChevronLeft size={20} /></button><div><p className="eyebrow">TREINO EM ANDAMENTO</p><h1>{workout.name}</h1></div></div>
        <div className="session-timer"><span>{session.pausedAt ? "PAUSADO" : "TEMPO TOTAL"}</span><strong>{formatTime(elapsed)}</strong></div>
        <div className="session-actions"><button className="secondary-button compact-button" onClick={onTogglePause}>{session.pausedAt ? <Play size={16} /> : <Pause size={16} />}{session.pausedAt ? "Continuar" : "Pausar"}</button><button ref={finishTriggerRef} className="success-button compact-button" onClick={() => setShowFinish(true)}><Check size={16} /> Finalizar</button></div>
      </header>
      <div className="session-progress" role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={creditedSetCount}><span style={{ width: progress + "%" }} /><p>{creditedSetCount} de {totalSets} séries <strong>{Math.round(progress)}%</strong></p></div>
      <main className="session-content">
        <div className="session-intro"><div><span className="status-pill"><Dumbbell size={13} /> {workout.subtitle}</span><h2>Foco, controle e intenção.</h2></div><div className="session-volume"><span>Volume atual</span><strong>{Object.entries(session.values).reduce((sum, [id, value]) => session.completed.includes(id) ? sum + value.load * value.reps : sum, 0).toLocaleString("pt-BR")} <small>kg</small></strong></div></div>
        <div className="session-feedback" aria-label="Registrar sensação do treino"><span>Como está a sessão?</span>{(["Fácil", "Adequado", "Difícil", "Dor"] as const).map((option) => <button key={option} className={(session.feedback === option ? "active " : "") + (option === "Dor" ? "pain" : "")} onClick={() => { onChange({ ...session, feedback: option }); if (option === "Dor") onToast("Dor registrada. Reduza a carga e considere uma substituição segura."); }}>{option}</button>)}</div>
        <div className="session-exercises">
          {workout.exercises.map((exercise, exerciseIndex) => {
            const completedForExercise = Array.from({ length: exercise.sets }, (_, index) => session.completed.includes([exercise.id, index].join("-"))).filter(Boolean).length;
            const exerciseVisual = exerciseLibrary.find((item) => item.id === exercise.id);
            const skipped = skippedExerciseIds.includes(exercise.id);
            return (
              <article className={"session-exercise card " + (skipped ? "skipped-exercise" : "")} key={exercise.id}>
                <div className="session-exercise-head">
                  <span className="exercise-order">{String(exerciseIndex + 1).padStart(2, "0")}</span>
                  {exerciseVisual && <span className="session-exercise-thumb"><Image src={exerciseVisual.image} alt="" fill sizes="68px" /></span>}
                  <div><h2>{exercise.name}</h2><p>{exercise.muscle} · {exercise.note || "Controle total da amplitude"}</p></div>
                  <div className="exercise-complete"><strong>{completedForExercise}/{exercise.sets}</strong><small>séries</small></div>
                  <div className="session-exercise-actions"><button onClick={() => onToast(`Alternativa para ${exercise.name}: reduza a carga, use versão assistida ou ajuste o equipamento.`)}>Alternativa</button><button onClick={() => toggleSkipExercise(exercise)}>{skipped ? "Retomar" : "Pular"}</button></div>
                </div>
                {skipped ? <div className="skipped-exercise-note"><Check size={17} /><span><strong>Exercício pulado</strong><small>O OLYMPUS preservou esse registro. Você pode retomar quando quiser.</small></span></div> : <><div className="set-table-head"><span>SÉRIE</span><span>ANTERIOR</span><span>CARGA (KG)</span><span>REPS</span><span>RPE</span><span>FEITO</span></div>
                <div className="set-list">
                  {Array.from({ length: exercise.sets }, (_, setIndex) => {
                    const id = [exercise.id, setIndex].join("-");
                    const value = session.values[id];
                    const done = session.completed.includes(id);
                    return (
                      <div className={"set-row " + (done ? "done" : "")} key={id}>
                        <strong className="set-number">{setIndex + 1}</strong>
                        <span className="previous-value">{Math.max(0, exercise.load - (setIndex === exercise.sets - 1 ? 2.5 : 0))} × {parseReps(exercise.reps)}</span>
                        <label><span className="mobile-field-label">Carga</span><input type="number" inputMode="decimal" min="0" value={value.load} step="0.5" onChange={(event) => updateValue(id, "load", Math.max(0, Number(event.target.value)))} aria-label={"Carga, série " + (setIndex + 1) + " de " + exercise.name} /></label>
                        <label><span className="mobile-field-label">Reps</span><input type="number" inputMode="numeric" min="0" step="1" value={value.reps} onChange={(event) => updateValue(id, "reps", Math.max(0, Math.round(Number(event.target.value))))} aria-label={"Repetições, série " + (setIndex + 1) + " de " + exercise.name} /></label>
                        <label><span className="mobile-field-label">RPE</span><input type="number" inputMode="decimal" min="1" max="10" step="0.5" value={value.rpe} onChange={(event) => updateValue(id, "rpe", Number(event.target.value))} aria-label={"RPE, série " + (setIndex + 1) + " de " + exercise.name} /></label>
                        <button className="set-check" onClick={() => toggleSet(exercise, setIndex)} aria-label={(done ? "Desmarcar" : "Concluir") + " série " + (setIndex + 1)} aria-pressed={done}>{done && <Check size={18} strokeWidth={3} />}</button>
                      </div>
                    );
                  })}
                </div>
                <button className="add-set-button" onClick={() => onToast("Série extra preparada para a próxima edição do treino.")}><Plus size={15} /> Adicionar série</button></>}
              </article>
            );
          })}
        </div>
      </main>
      <AnimatePresence>
        {rest > 0 && (
          <motion.div className="rest-timer" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}>
            <button className="icon-button ghost" onClick={() => onChange({ ...session, restEndsAt: null, restTotalSeconds: 0 })} aria-label="Fechar descanso"><X size={18} /></button>
            <div className="rest-ring" style={{ "--rest": Math.min(100, (rest / Math.max(1, session.restTotalSeconds)) * 100) + "%" } as React.CSSProperties}><Timer size={18} /></div>
            <div><span>DESCANSO</span><strong>{formatShortTime(rest)}</strong></div>
            <div className="rest-controls"><button onClick={() => onChange({ ...session, restEndsAt: Math.max(Date.now(), (session.restEndsAt || Date.now()) - 15000) })}>−15s</button><button onClick={() => onChange({ ...session, restEndsAt: (session.restEndsAt || Date.now()) + 15000, restTotalSeconds: session.restTotalSeconds + 15 })}>+15s</button><button className="skip-rest" onClick={() => onChange({ ...session, restEndsAt: null, restTotalSeconds: 0 })}>Pular</button></div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {session.pausedAt && (
          <motion.div className="paused-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div><Pause size={30} /><p className="eyebrow">TREINO PAUSADO</p><h2>Respire. Seu progresso está salvo.</h2><button className="primary-button" onClick={onTogglePause}><Play size={17} fill="currentColor" /> Continuar treino</button></div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFinish && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div ref={finishDialogRef} className="confirm-modal card" role="alertdialog" aria-modal="true" aria-labelledby="finish-title" tabIndex={-1} initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); closeFinishModal(); return; } trapDialogFocus(event); }}>
              <span className="finish-icon"><Trophy size={27} /></span><p className="eyebrow">FINALIZAR SESSÃO</p><h2 id="finish-title">Treino concluído?</h2><p>Você concluiu {completedSetCount} de {totalSets} séries{skippedExerciseIds.length > 0 ? ` e pulou ${skippedExerciseIds.length} exercício${skippedExerciseIds.length > 1 ? "s" : ""}` : ""}. Os dados serão salvos no seu progresso.</p>
              <button className="discard-button" onClick={() => { if (window.confirm("Descartar todo o progresso desta sessão?")) onDiscard(); }}>Descartar sessão</button>
              <div className="modal-actions"><button className="secondary-button" onClick={closeFinishModal}>Continuar treino</button><button className="success-button" onClick={onFinish} disabled={creditedSetCount === 0}><Check size={16} /> Finalizar agora</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SummaryModal({ summary, onClose, athleteName }: { summary: SessionSummary; onClose: () => void; athleteName: string }) {
  const remainingXp = Math.max(0, profile.nextLevelXp - (profile.xp + summary.xp));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, []);
  return (
    <motion.div className="modal-backdrop summary-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.article className="summary-modal card" role="dialog" aria-modal="true" aria-labelledby="summary-title" tabIndex={-1} initial={{ scale: 0.92, y: 18 }} animate={{ scale: 1, y: 0 }} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); return; } trapDialogFocus(event); }}>
        <div className="summary-burst"><span><Trophy size={30} /></span><i /><i /><i /><i /></div>
        <p className="eyebrow">SESSÃO CONCLUÍDA</p><h2 id="summary-title">Excelente trabalho, {athleteName.split(/\s+/)[0]}.</h2><p>{summary.name} entrou para seu histórico. {summary.skippedExercises > 0 ? `${summary.skippedExercises} exercício${summary.skippedExercises > 1 ? "s foram" : " foi"} marcado para revisão.` : "Sua consistência continua crescendo."}</p>
        <div className="summary-stats"><div><Timer size={17} /><strong>{Math.max(1, Math.round(summary.duration / 60))} min</strong><span>Duração</span></div><div><Dumbbell size={17} /><strong>{summary.volume.toLocaleString("pt-BR")} kg</strong><span>Volume</span></div><div><CircleCheck size={17} /><strong>{summary.sets}</strong><span>Séries</span></div></div>
        <div className="xp-earned"><Sparkles size={17} /><span><strong>+{summary.xp} XP conquistados</strong><small>{remainingXp > 0 ? "Faltam " + remainingXp + " XP para o nível 19" : "Nível 19 desbloqueado"}</small></span></div>
        <button ref={closeButtonRef} className="primary-button full-button" onClick={onClose}>Ver meu progresso <ArrowRight size={16} /></button>
      </motion.article>
    </motion.div>
  );
}

const defaultProfileSettings: ForgeOnboardingData = {
  name: profile.fullName,
  goal: "Performance e definição",
  place: "Academia completa",
  limitation: "Nenhuma limitação",
};

function isProfileSettings(value: unknown): value is ForgeOnboardingData {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<ForgeOnboardingData>;
  return [settings.name, settings.goal, settings.place, settings.limitation].every((item) => typeof item === "string");
}

function isSessionFeedback(value: unknown): value is SessionFeedback {
  return value === "Fácil" || value === "Adequado" || value === "Difícil" || value === "Dor";
}

function initialsFromName(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || profile.initials;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
    .filter((element) => element.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function PerformanceApp() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionVisible, setSessionVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [profileSettings, setProfileSettings] = useState<ForgeOnboardingData>(defaultProfileSettings);
  const [savedExerciseIds, setSavedExerciseIds] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const globalSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedSession = window.localStorage.getItem("olympus-active-session") || window.localStorage.getItem("forge-active-session") || window.localStorage.getItem("pulse-active-session");
      const savedHistory = window.localStorage.getItem("olympus-workout-history") || window.localStorage.getItem("forge-workout-history") || window.localStorage.getItem("pulse-workout-history");
      const savedProfileSettings = window.localStorage.getItem("olympus-profile-settings") || window.localStorage.getItem("forge-profile-settings");
      const savedExerciseQueue = window.localStorage.getItem("olympus-next-workout-exercises") || window.localStorage.getItem("forge-next-workout-exercises");
      const savedView = (window.localStorage.getItem("olympus-view") || window.localStorage.getItem("forge-view") || window.localStorage.getItem("pulse-view")) as ViewId | null;
      const storedTheme = window.localStorage.getItem("olympus-theme") || window.localStorage.getItem("forge-theme");
      const savedTheme = storedTheme === "dark" ? "dark" : "light";
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
      let hasValidSession = false;
      if (savedSession) {
        const parsedSession: unknown = JSON.parse(savedSession);
        if (isActiveSession(parsedSession)) {
          setActiveSession({
            ...parsedSession,
            restEndsAt: typeof parsedSession.restEndsAt === "number" ? parsedSession.restEndsAt : null,
            restTotalSeconds: typeof parsedSession.restTotalSeconds === "number" ? parsedSession.restTotalSeconds : 0,
            skippedExerciseIds: Array.isArray(parsedSession.skippedExerciseIds) ? parsedSession.skippedExerciseIds : [],
            feedback: isSessionFeedback(parsedSession.feedback) ? parsedSession.feedback : "Adequado",
          });
          hasValidSession = true;
        } else {
          window.localStorage.removeItem("olympus-active-session");
          window.localStorage.removeItem("forge-active-session");
          window.localStorage.removeItem("pulse-active-session");
        }
      }
      if (savedHistory) {
        const parsedHistory: unknown = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) setHistory(parsedHistory as CompletedSession[]);
      }
      if (savedProfileSettings) {
        const parsedProfileSettings: unknown = JSON.parse(savedProfileSettings);
        if (isProfileSettings(parsedProfileSettings)) setProfileSettings({ ...defaultProfileSettings, ...parsedProfileSettings, name: parsedProfileSettings.name.trim() || defaultProfileSettings.name });
      }
      if (savedExerciseQueue) {
        const parsedExerciseQueue: unknown = JSON.parse(savedExerciseQueue);
        if (Array.isArray(parsedExerciseQueue)) setSavedExerciseIds(parsedExerciseQueue.filter((id): id is string => typeof id === "string" && exerciseLibrary.some((exercise) => exercise.id === id)));
      }
      if (savedView && navItems.some((item) => item.id === savedView)) setView(savedView);
      const shortcut = new URLSearchParams(window.location.search);
      const onboardingComplete = window.localStorage.getItem("olympus-onboarding-complete") || window.localStorage.getItem("forge-onboarding-complete");
      setOnboardingOpen(shortcut.get("onboarding") === "1" || (shortcut.get("onboarding") !== "0" && !onboardingComplete));
      const shortcutView = shortcut.get("view") as ViewId | null;
      if (shortcutView && navItems.some((item) => item.id === shortcutView)) setView(shortcutView);
      if (shortcut.get("action") === "start-workout") {
        if (hasValidSession) {
          setSessionVisible(true);
        } else {
          setActiveSession(createSession(workouts[0]));
          setSessionVisible(true);
        }
        shortcut.delete("action");
        const query = shortcut.toString();
        window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
      }
    } catch {
      window.localStorage.removeItem("olympus-active-session");
      window.localStorage.removeItem("forge-active-session");
      window.localStorage.removeItem("pulse-active-session");
    }
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const syncRouteFromHistory = () => {
      const nextView = new URLSearchParams(window.location.search).get("view") as ViewId | null;
      setView(nextView && navItems.some((item) => item.id === nextView) ? nextView : "dashboard");
    };
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("popstate", syncRouteFromHistory);
    window.addEventListener("beforeinstallprompt", captureInstall);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    void flushWorkoutSessionQueue();
    void initializePushNotifications();
    setIsHydrated(true);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("popstate", syncRouteFromHistory);
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (view === "library") {
      // The player is an optional, client-only chunk. Offline on a first visit the
      // preload may fail before the service worker has ever cached it; consuming
      // the rejection prevents an unhandled promise without blocking the library.
      void loadExerciseMotionPlayer().catch(() => undefined);
    }
  }, [view]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem("olympus-view", view);
    window.localStorage.removeItem("forge-view");
    window.localStorage.removeItem("pulse-view");
  }, [isHydrated, view]);

  useEffect(() => {
    if (!isHydrated) return;
    if (activeSession) window.localStorage.setItem("olympus-active-session", JSON.stringify(activeSession));
    else window.localStorage.removeItem("olympus-active-session");
    window.localStorage.removeItem("forge-active-session");
    window.localStorage.removeItem("pulse-active-session");
  }, [activeSession, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem("olympus-workout-history", JSON.stringify(history));
    window.localStorage.removeItem("forge-workout-history");
    window.localStorage.removeItem("pulse-workout-history");
  }, [history, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem("olympus-next-workout-exercises", JSON.stringify(savedExerciseIds));
    window.localStorage.removeItem("forge-next-workout-exercises");
  }, [isHydrated, savedExerciseIds]);

  useEffect(() => {
    if (!isHydrated) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("olympus-theme", theme);
    window.localStorage.removeItem("forge-theme");
  }, [isHydrated, theme]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const availableWorkouts = useMemo(() => {
    const savedWorkout = createSavedWorkout(savedExerciseIds);
    return savedWorkout ? [savedWorkout, ...workouts] : workouts;
  }, [savedExerciseIds]);
  const athlete = useMemo(() => {
    const fullName = profileSettings.name.trim() || profile.fullName;
    return { ...profile, fullName, firstName: fullName.split(/\s+/)[0] || profile.firstName, initials: initialsFromName(fullName) };
  }, [profileSettings.name]);
  const currentWorkout = useMemo(() => activeSession ? availableWorkouts.find((item) => item.id === activeSession.workoutId) || null : null, [activeSession, availableWorkouts]);
  const elapsed = activeSession ? Math.floor((now - activeSession.startedAt - activeSession.pausedDuration - (activeSession.pausedAt ? now - activeSession.pausedAt : 0)) / 1000) : 0;

  const navigate = (nextView: ViewId) => {
    setView(nextView);
    setMobileMenu(false);
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    url.searchParams.delete("onboarding");
    window.history.pushState({ view: nextView }, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitGlobalSearch = () => {
    setLibrarySearch(globalSearch.trim());
    navigate("library");
  };

  const completeOnboarding = (data: ForgeOnboardingData) => {
    window.localStorage.setItem("olympus-onboarding-complete", "true");
    window.localStorage.setItem("olympus-profile-settings", JSON.stringify(data));
    window.localStorage.removeItem("forge-onboarding-complete");
    window.localStorage.removeItem("forge-profile-settings");
    setProfileSettings(data);
    setOnboardingOpen(false);
    navigate("dashboard");
  };

  const resetOnboarding = () => {
    window.localStorage.removeItem("olympus-onboarding-complete");
    window.localStorage.removeItem("forge-onboarding-complete");
    const url = new URL(window.location.href);
    url.searchParams.set("onboarding", "1");
    window.history.replaceState({ onboarding: true }, "", url);
    setOnboardingOpen(true);
  };

  const addToNextWorkout = (exercise: LibraryExercise) => {
    if (activeSession?.workoutId === "forge-next") {
      setToastMessage("Finalize seu treino OLYMPUS atual antes de alterar os exercícios salvos.");
      return;
    }
    if (savedExerciseIds.includes(exercise.id)) {
      setToastMessage(`${exercise.name} já está no seu próximo treino.`);
      return;
    }
    setSavedExerciseIds((current) => [...current, exercise.id]);
    setToastMessage(`${exercise.name} foi adicionado ao seu próximo treino.`);
  };

  const startWorkout = (workout: Workout) => {
    if (activeSession && activeSession.workoutId === workout.id) {
      setSessionVisible(true);
      return;
    }
    if (activeSession) {
      setToastMessage("Finalize o treino atual antes de iniciar outro.");
      setSessionVisible(true);
      return;
    }
    setActiveSession(createSession(workout));
    setSessionVisible(true);
  };

  const togglePause = () => {
    if (!activeSession) return;
    const timestamp = Date.now();
    if (activeSession.pausedAt) {
      setActiveSession({ ...activeSession, pausedDuration: activeSession.pausedDuration + (timestamp - activeSession.pausedAt), pausedAt: null });
    } else {
      setActiveSession({ ...activeSession, pausedAt: timestamp });
    }
  };

  const finishWorkout = () => {
    if (!activeSession || !currentWorkout || (activeSession.completed.length === 0 && activeSession.skippedExerciseIds.length === 0)) return;
    const volume = Object.entries(activeSession.values).reduce((sum, [id, value]) => activeSession.completed.includes(id) ? sum + value.load * value.reps : sum, 0);
    const totalSets = currentWorkout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
    const xp = Math.round(200 * (activeSession.completed.length / totalSets)) + activeSession.completed.length * 10;
    const record: CompletedSession = {
      id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : String(Date.now()),
      workoutId: currentWorkout.id,
      name: currentWorkout.name,
      startedAt: activeSession.startedAt,
      finishedAt: Date.now(),
      durationSeconds: elapsed,
      completedSetIds: [...activeSession.completed],
      values: Object.fromEntries(Object.entries(activeSession.values).filter(([id]) => activeSession.completed.includes(id))),
      volumeKg: Math.round(volume),
      xp,
      skippedExerciseIds: [...activeSession.skippedExerciseIds],
      feedback: activeSession.feedback,
    };
    const apiSession: ApiSessionInput = {
      localId: record.id,
      workoutId: record.workoutId,
      startedAt: new Date(record.startedAt).toISOString(),
      finishedAt: new Date(record.finishedAt).toISOString(),
      durationSeconds: record.durationSeconds,
      sets: record.completedSetIds.flatMap((setId) => {
        const exercise = currentWorkout.exercises.find((item) => setId.startsWith(item.id + "-"));
        const value = record.values[setId];
        if (!exercise || !value) return [];
        return [{ exerciseId: exercise.id, setNumber: Number(setId.slice(exercise.id.length + 1)) + 1, loadKg: value.load, reps: value.reps, rpe: value.rpe }];
      }),
    };
    void saveWorkoutSession(apiSession).catch(() => queueWorkoutSession(apiSession));
    setHistory((current) => [record, ...current]);
    setSummary({ name: record.name, duration: record.durationSeconds, volume: record.volumeKg, sets: record.completedSetIds.length, xp: record.xp, skippedExercises: record.skippedExerciseIds.length, feedback: record.feedback });
    setActiveSession(null);
    setSessionVisible(false);
    navigate("dashboard");
  };

  const discardWorkout = () => {
    setActiveSession(null);
    setSessionVisible(false);
    setToastMessage("Sessão descartada.");
  };

  const installApp = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    const isApple = /iPad|iPhone|Macintosh/.test(navigator.userAgent);
    setToastMessage(isApple ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início." : "Use o menu do navegador e escolha Instalar aplicativo.");
  };

  if (onboardingOpen) return <ForgeOnboarding onComplete={completeOnboarding} />;

  return (
    <div className={"app-shell " + (sidebarCompact ? "sidebar-compact" : "")}>
      <aside className="sidebar">
        <div className="sidebar-brand"><BrandMark compact={sidebarCompact} /></div>
        <nav aria-label="Navegação principal">
          <span className="nav-group-label">{sidebarCompact ? "" : "PRINCIPAL"}</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={view === item.id ? "active" : ""} aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)} title={sidebarCompact ? item.label : undefined}><Icon size={19} /><span><strong>{item.label}</strong>{!sidebarCompact && <small>{item.description}</small>}</span></button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="xp-panel">
            <div className="xp-top"><span className="level-badge">{athlete.level}</span>{!sidebarCompact && <span><strong>Nível {athlete.level}</strong><small>{athlete.xp.toLocaleString("pt-BR")} / {athlete.nextLevelXp.toLocaleString("pt-BR")} XP</small></span>}</div>
            {!sidebarCompact && <ProgressBar value={(athlete.xp / athlete.nextLevelXp) * 100} tone="violet" label="Progresso para o nível 19" />}
          </div>
          <button className="profile-nav" onClick={() => navigate("profile")}><span className="avatar">{athlete.initials}<i /></span>{!sidebarCompact && <span><strong>{athlete.fullName}</strong><small>Atleta · Nível {athlete.level}</small></span>}<Settings size={17} /></button>
        </div>
        <button className="collapse-button" onClick={() => setSidebarCompact(!sidebarCompact)} aria-label={sidebarCompact ? "Expandir menu" : "Recolher menu"}><ChevronLeft size={15} /></button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="mobile-brand"><BrandMark compact /><button className="icon-button menu-button" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu size={20} /></button></div>
          <form className="search-field global-search" onSubmit={(event) => { event.preventDefault(); submitGlobalSearch(); }}><Search size={17} /><input ref={globalSearchRef} value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar treino, exercício ou métrica..." aria-label="Buscar no OLYMPUS AI" /><kbd>⌘ K</kbd></form>
          <div className="topbar-actions">
            {!online && <span className="offline-badge"><WifiOff size={14} /> Offline</span>}
            <button className="platform-button" onClick={installApp}><Download size={16} /><span>Instalar app</span></button>
            <button className="icon-button theme-toggle" onClick={() => setTheme((value) => value === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button>
            <div className="popover-anchor">
              <button className="icon-button" onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }} aria-label="Notificações"><Bell size={18} /><i className="notification-dot" /></button>
              <AnimatePresence>
                {notificationsOpen && <motion.div className="popover notification-popover" initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}><div className="popover-title"><strong>Notificações</strong><button onClick={() => setNotificationsOpen(false)}>Marcar como lidas</button></div><button><span className="icon-box tone-violet"><Dumbbell size={16} /></span><span><strong>Push A às 18:30</strong><small>Seu treino começa hoje à noite.</small></span><i /></button><button><span className="icon-box tone-blue"><Droplets size={16} /></span><span><strong>Hora de hidratar</strong><small>Faltam 1,1 L para sua meta.</small></span><i /></button><button><span className="icon-box tone-orange"><Trophy size={16} /></span><span><strong>Volume Titã</strong><small>Conquista desbloqueada.</small></span></button></motion.div>}
              </AnimatePresence>
            </div>
            <div className="popover-anchor">
              <button className="top-profile" onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false); }}><span className="avatar">{athlete.initials}<i /></span><span><strong>{athlete.firstName}</strong><small>Nível {athlete.level}</small></span></button>
              <AnimatePresence>
                {profileOpen && <motion.div className="popover profile-popover" initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }}><div className="profile-summary"><span className="avatar large-avatar">{athlete.initials}</span><span><strong>{athlete.fullName}</strong><small>{profileSettings.goal}</small></span></div><button onClick={() => { navigate("profile"); setProfileOpen(false); }}><UserRound size={16} /> Meu perfil</button><button onClick={installApp}><Smartphone size={16} /> Instalar no celular</button><button onClick={() => { navigate("profile"); setProfileOpen(false); }}><Settings size={16} /> Configurações</button><div className="native-labels"><span><Smartphone size={13} /> Android</span><span><Apple size={13} /> iOS</span></div></motion.div>}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
              {view === "dashboard" && <DashboardView onStart={startWorkout} navigate={navigate} history={history} athleteName={athlete.fullName} />}
              {view === "programs" && <ProgramsView onStart={startWorkout} toast={setToastMessage} />}
              {view === "workouts" && <WorkoutsView onStart={startWorkout} toast={setToastMessage} availableWorkouts={availableWorkouts} />}
              {view === "library" && <LibraryView savedExerciseIds={savedExerciseIds} onAddToNextWorkout={addToNextWorkout} onToast={setToastMessage} initialQuery={librarySearch} />}
              {view === "progress" && <ProgressView history={history} />}
              {view === "calendar" && <CalendarView onStart={startWorkout} />}
              {view === "coach" && <CoachView onStart={startWorkout} />}
              {view === "running" && <RunningView toast={setToastMessage} />}
              {view === "mobility" && <MobilityView toast={setToastMessage} />}
              {view === "trainer" && <TrainerView toast={setToastMessage} />}
              {view === "profile" && <ProfileView theme={theme} onThemeChange={setTheme} onResetOnboarding={resetOnboarding} toast={setToastMessage} profileName={athlete.fullName} initials={athlete.initials} goal={profileSettings.goal} place={profileSettings.place} limitation={profileSettings.limitation} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}><Home size={19} /><span>Início</span></button>
        <button className={view === "workouts" ? "active" : ""} onClick={() => navigate("workouts")}><Dumbbell size={19} /><span>Treinos</span></button>
        <button className="train-fab" onClick={() => activeSession ? setSessionVisible(true) : startWorkout(workouts[0])}><span>{activeSession ? <Timer size={23} /> : <Play size={23} fill="currentColor" />}</span><small>{activeSession ? "Retomar" : "Treinar"}</small></button>
        <button className={view === "programs" || view === "library" ? "active" : ""} onClick={() => navigate("programs")}><Clapperboard size={19} /><span>Explorar</span></button>
        <button className={view === "progress" ? "active" : ""} onClick={() => navigate("progress")}><ChartNoAxesCombined size={19} /><span>Progresso</span></button>
        <button className={view === "profile" ? "active" : ""} onClick={() => navigate("profile")}><UserRound size={19} /><span>Perfil</span></button>
      </nav>

      {activeSession && !sessionVisible && currentWorkout && (
        <button className="resume-workout" onClick={() => setSessionVisible(true)}><span className="resume-pulse"><Play size={15} fill="currentColor" /></span><span><small>TREINO EM ANDAMENTO</small><strong>{currentWorkout.name} · {formatTime(elapsed)}</strong></span><span>{activeSession.completed.length} séries <ChevronRight size={16} /></span></button>
      )}

      <AnimatePresence>
        {sessionVisible && activeSession && currentWorkout && <WorkoutSession session={activeSession} workout={currentWorkout} now={now} onChange={setActiveSession} onTogglePause={togglePause} onMinimize={() => setSessionVisible(false)} onFinish={finishWorkout} onDiscard={discardWorkout} onToast={setToastMessage} />}
      </AnimatePresence>
      <AnimatePresence>{summary && <SummaryModal summary={summary} athleteName={athlete.fullName} onClose={() => { setSummary(null); navigate("progress"); }} />}</AnimatePresence>
      <AnimatePresence>
        {mobileMenu && (
          <motion.div className="mobile-menu-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setMobileMenu(false)}>
            <motion.aside className="mobile-menu-sheet" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }} onMouseDown={(event) => event.stopPropagation()}>
              <div className="mobile-menu-head"><BrandMark /><button className="icon-button" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X size={19} /></button></div>
              <div className="mobile-profile"><span className="avatar large-avatar">{athlete.initials}<i /></span><span><strong>{athlete.fullName}</strong><small>Nível {athlete.level} · {profileSettings.goal}</small></span></div>
              <nav>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={16} /></button>; })}</nav>
              <button className="install-mobile-button" onClick={installApp}><Download size={18} /><span><strong>Instalar OLYMPUS AI</strong><small>Android e iOS · acesso rápido</small></span></button>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{toastMessage && <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><CircleCheck size={18} /> {toastMessage}</motion.div>}</AnimatePresence>
    </div>
  );
}
