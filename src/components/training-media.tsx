"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Dumbbell,
  Gauge,
  Layers3,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { guidedSessions, trainingPrograms, type GuidedSession, type TrainingProgram } from "@/lib/guided-content";
import { workouts, type Workout } from "@/lib/demo-data";

function formatClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function sessionWorkout(session: GuidedSession) {
  return workouts.find((item) => item.id === session.workoutId) ?? workouts[0];
}

export function PulseEditorialHero({ workout, onStart, onExplore }: { workout: Workout; onStart: () => void; onExplore: () => void }) {
  return (
    <motion.section className="pulse-editorial-hero" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Image src="/media/pulse-training-hero.webp" alt="Atleta treinando com kettlebell em estúdio escuro" fill priority sizes="(max-width: 720px) 100vw, 80vw" />
      <div className="pulse-editorial-scrim" />
      <div className="pulse-editorial-copy">
        <span className="editorial-kicker"><i /> PROGRAMA EM DESTAQUE</span>
        <h1>Treine com<br />intenção.</h1>
        <p>Força, mobilidade e condicionamento conectados em uma experiência guiada pelo seu ritmo.</p>
        <div className="editorial-meta"><span><Clock3 size={15} /> {workout.duration} min</span><span><Dumbbell size={15} /> {workout.exercises.length} movimentos</span><span><Gauge size={15} /> Intermediário</span></div>
        <div className="editorial-actions">
          <button className="editorial-primary" onClick={onStart}><Play size={17} fill="currentColor" /> Começar agora</button>
          <button className="editorial-secondary" onClick={onExplore}>Ver programas <ArrowRight size={16} /></button>
        </div>
      </div>
      <div className="editorial-progress"><span>SEMANA 6</span><i><b style={{ width: "68%" }} /></i><strong>68%</strong></div>
    </motion.section>
  );
}

function MediaCard({ session, onPlay, downloaded, onDownload }: { session: GuidedSession; onPlay: () => void; downloaded: boolean; onDownload: () => void }) {
  return (
    <article className="guided-media-card">
      <button className="guided-media-poster" onClick={onPlay} aria-label={`Assistir ${session.title}`}>
        <Image src={session.poster} alt="" fill sizes="(max-width: 720px) 70vw, (max-width: 1100px) 42vw, 20vw" />
        <span className="media-tint" />
        <span className="media-play"><Play size={21} fill="currentColor" /></span>
        <span className="media-duration">{session.duration} MIN</span>
      </button>
      <div className="guided-media-copy">
        <div><span>{session.focus}</span><h3>{session.title}</h3><p>{session.subtitle}</p></div>
        <button className={downloaded ? "downloaded" : ""} onClick={onDownload} aria-label={downloaded ? "Conteúdo disponível offline" : "Baixar conteúdo"}>{downloaded ? <Check size={17} /> : <Download size={17} />}</button>
      </div>
      <div className="guided-media-stats"><span>{session.level}</span><span>{session.calories} kcal</span></div>
    </article>
  );
}

function ProgramCard({ program, onOpen }: { program: TrainingProgram; onOpen: () => void }) {
  return (
    <button className={`program-card program-${program.accent}`} onClick={onOpen}>
      <span className="program-no">0{program.weeks}</span>
      <span className="program-icon"><Layers3 size={21} /></span>
      <span className="program-copy"><small>{program.eyebrow}</small><strong>{program.title}</strong><em>{program.description}</em></span>
      <span className="program-foot"><i>{program.sessionsPerWeek}x por semana</i><ChevronRight size={18} /></span>
    </button>
  );
}

function GuidedPlayer({ session, onClose, onRegister }: { session: GuidedSession; onClose: () => void; onRegister: () => void }) {
  const totalSeconds = useMemo(() => session.segments.reduce((total, item) => total + item.seconds, 0), [session]);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const currentSegment = useMemo(() => {
    let cursor = 0;
    for (let index = 0; index < session.segments.length; index += 1) {
      const segment = session.segments[index];
      if (elapsed < cursor + segment.seconds) return { ...segment, index, remaining: cursor + segment.seconds - elapsed };
      cursor += segment.seconds;
    }
    return { ...session.segments.at(-1)!, index: session.segments.length - 1, remaining: 0 };
  }, [elapsed, session]);

  useEffect(() => {
    if (!playing || elapsed >= totalSeconds) return;
    const timer = window.setInterval(() => setElapsed((value) => Math.min(totalSeconds, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [elapsed, playing, totalSeconds]);

  return (
    <motion.div className="guided-player-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section className="guided-player" initial={{ scale: .98, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .98, y: 18 }}>
        <header><button onClick={onClose}><ChevronLeft size={20} /> Sair</button><span>SESSÃO GUIADA</span><button aria-label="Tela cheia" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 size={18} /></button></header>
        <div className="guided-stage">
          {session.videoSrc ? <video src={session.videoSrc} poster={session.poster} controls autoPlay playsInline /> : <><Image src={session.poster} alt="Demonstração do movimento" fill sizes="100vw" /><div className={`motion-silhouette ${playing ? "is-playing" : ""}`}><i /><b /></div></>}
          <div className="guided-stage-shade" />
          <div className="guided-title"><small>AGORA</small><h2>{currentSegment.label}</h2><p>Movimento controlado · mantenha o core ativo</p></div>
          <div className="guided-countdown"><strong>{currentSegment.remaining}</strong><span>SEG</span></div>
        </div>
        <div className="guided-timeline"><i><b style={{ width: `${(elapsed / totalSeconds) * 100}%` }} /></i><span>{formatClock(elapsed)} / {formatClock(totalSeconds)}</span></div>
        <div className="guided-controls">
          <button onClick={() => setElapsed(0)} aria-label="Reiniciar"><RotateCcw size={19} /></button>
          <button className="guided-main-control" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pausar" : "Reproduzir"}>{playing ? <Pause size={25} fill="currentColor" /> : <Play size={25} fill="currentColor" />}</button>
          <button aria-label="Som"><Volume2 size={20} /></button>
        </div>
        <footer><div><small>PRÓXIMO</small><strong>{session.segments[currentSegment.index + 1]?.label ?? "Finalizar sessão"}</strong></div><button onClick={onRegister}>Abrir modo de registro <ArrowRight size={16} /></button></footer>
      </motion.section>
    </motion.div>
  );
}

export function ProgramsView({ onStart, toast }: { onStart: (workout: Workout) => void; toast: (message: string) => void }) {
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [playingSession, setPlayingSession] = useState<GuidedSession | null>(null);
  const [downloads, setDownloads] = useState<string[]>([]);

  useEffect(() => {
    try { setDownloads(JSON.parse(localStorage.getItem("olympus-guided-downloads") || localStorage.getItem("forge-guided-downloads") || localStorage.getItem("pulse-guided-downloads") || "[]") as string[]); } catch { setDownloads([]); }
  }, []);

  const toggleDownload = async (session: GuidedSession) => {
    const exists = downloads.includes(session.id);
    const next = exists ? downloads.filter((id) => id !== session.id) : [...downloads, session.id];
    setDownloads(next);
    localStorage.setItem("olympus-guided-downloads", JSON.stringify(next));
    if (!exists && "caches" in window) {
      const cache = await caches.open("olympus-guided-media-v1");
      await cache.add(session.poster).catch(() => undefined);
      if (session.videoSrc) await cache.add(session.videoSrc).catch(() => undefined);
    } else if (exists && "caches" in window) {
      const cache = await caches.open("olympus-guided-media-v1");
      await cache.delete(session.poster);
      if (session.videoSrc) await cache.delete(session.videoSrc);
    }
    toast(exists ? "Treino removido dos downloads." : "Treino e guia preparados para acesso offline.");
  };

  const registerSession = (session: GuidedSession) => {
    setPlayingSession(null);
    onStart(sessionWorkout(session));
  };

  return (
    <div className="programs-view">
      <section className="programs-masthead">
        <Image src="/media/pulse-training-hero.webp" alt="Atleta em sessão de força" fill priority sizes="(max-width: 720px) 100vw, 80vw" />
        <span className="programs-masthead-shade" />
        <div><span className="editorial-kicker"><i /> OLYMPUS TRAINING</span><h1>Movimento que<br />muda você.</h1><p>Programas progressivos, sessões guiadas e técnica para cada fase da sua evolução.</p><button onClick={() => setPlayingSession(guidedSessions[0])}><Play size={17} fill="currentColor" /> Assistir treino</button></div>
      </section>

      <section className="editorial-section">
        <div className="editorial-section-head"><div><span>ESCOLHA UM CAMINHO</span><h2>Programas para evoluir</h2></div><p>Planos estruturados que combinam força, mobilidade e condicionamento.</p></div>
        <div className="program-grid">{trainingPrograms.map((program) => <ProgramCard key={program.id} program={program} onOpen={() => setSelectedProgram(program)} />)}</div>
      </section>

      <section className="editorial-section">
        <div className="editorial-section-head"><div><span>TREINE AGORA</span><h2>Sessões guiadas</h2></div><button onClick={() => toast("Novas sessões chegam toda semana.")}>Ver todas <ArrowRight size={16} /></button></div>
        <div className="guided-media-grid">{guidedSessions.map((session) => <MediaCard key={session.id} session={session} onPlay={() => setPlayingSession(session)} downloaded={downloads.includes(session.id)} onDownload={() => void toggleDownload(session)} />)}</div>
      </section>

      <section className="training-principles"><span><Sparkles size={20} /></span><div><small>INTELIGÊNCIA APLICADA</small><h2>Seu treino se adapta ao seu histórico.</h2><p>Volume, esforço e recuperação trabalham juntos para indicar a próxima melhor sessão.</p></div><button onClick={() => toast("Análise de treino atualizada.")}>Ver recomendação <ArrowRight size={16} /></button></section>

      <AnimatePresence>{selectedProgram && <motion.div className="program-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setSelectedProgram(null)}><motion.aside className="program-sheet" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} onMouseDown={(event) => event.stopPropagation()}><button className="program-sheet-close" onClick={() => setSelectedProgram(null)}><X size={19} /></button><span className="editorial-kicker"><i /> {selectedProgram.eyebrow}</span><h2>{selectedProgram.title}</h2><p>{selectedProgram.description}</p><div className="program-sheet-stats"><span><strong>{selectedProgram.weeks}</strong><small>semanas</small></span><span><strong>{selectedProgram.sessionsPerWeek}</strong><small>sessões/semana</small></span><span><strong>3</strong><small>níveis</small></span></div><h3>Dentro do programa</h3>{selectedProgram.sessionIds.map((id, index) => { const session = guidedSessions.find((item) => item.id === id)!; return <button className="program-sheet-session" key={id} onClick={() => setPlayingSession(session)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{session.title}</strong><small>{session.duration} min · {session.focus}</small></div><Play size={17} /></button>; })}<button className="editorial-primary full-program-button" onClick={() => registerSession(guidedSessions.find((item) => item.id === selectedProgram.sessionIds[0])!)}>Começar programa <ArrowRight size={17} /></button></motion.aside></motion.div>}</AnimatePresence>
      <AnimatePresence>{playingSession && <GuidedPlayer session={playingSession} onClose={() => setPlayingSession(null)} onRegister={() => registerSession(playingSession)} />}</AnimatePresence>
    </div>
  );
}
