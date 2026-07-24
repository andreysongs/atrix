"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Film, Pause, Play, RefreshCw, ShieldCheck } from "lucide-react";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { apiBaseUrl } from "@/lib/pulse-api";

type MotionExercise = Pick<CatalogExercise, "id" | "name" | "nameEn" | "equipment">;

type Match = { id: number; name: string; query: string };
type Video = { filename: string; stream: "branded" | "unbranded"; label: string };
type Detail = { id: number; name: string; steps: string[]; videos: Video[] };

type PlayerState =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "unmatched" }
  | { kind: "error"; message: string }
  | { kind: "ready"; match: Match; detail: Detail };

function endpoint(pathname: string, params?: Record<string, string>) {
  const url = new URL(apiBaseUrl() + pathname);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function readJson<T>(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null) as T & { message?: string; code?: string } | null;
  if (!response.ok) {
    const error = new Error(data?.message || `Erro ${response.status}`) as Error & { code?: string };
    error.code = data?.code;
    throw error;
  }
  return data as T;
}

/**
 * Media is fetched only when an athlete opens an exercise. The API key remains
 * server-side and the direct MuscleWiki URL is never exposed to the device.
 */
export function ExerciseMuscleWikiPlayer({ exercise }: { exercise: MotionExercise }) {
  const [state, setState] = useState<PlayerState>({ kind: "loading" });
  const [activeVideo, setActiveVideo] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    setActiveVideo(0);
    setPlaying(false);
    setMediaError(false);

    void (async () => {
      try {
        const resolved = await readJson<{ configured: boolean; match: Match | null }>(
          endpoint("/musclewiki/resolve", {
            localId: exercise.id,
            name: exercise.name,
            nameEn: exercise.nameEn,
            equipment: exercise.equipment,
          }),
          controller.signal,
        );
        if (!resolved.configured) {
          setState({ kind: "not-configured" });
          return;
        }
        if (!resolved.match) {
          setState({ kind: "unmatched" });
          return;
        }
        const detail = await readJson<Detail>(endpoint(`/musclewiki/exercises/${resolved.match.id}`), controller.signal);
        setState({ kind: "ready", match: resolved.match, detail });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "Não foi possível carregar a demonstração.";
        setState((error as Error & { code?: string }).code === "MUSCLEWIKI_NOT_CONFIGURED" ? { kind: "not-configured" } : { kind: "error", message });
      }
    })();
    return () => controller.abort();
  }, [exercise.equipment, exercise.id, exercise.name, exercise.nameEn]);

  const active = state.kind === "ready" ? state.detail.videos[activeVideo] : undefined;
  const videoSrc = useMemo(() => active
    ? endpoint(`/musclewiki/media/video/${active.stream}/${encodeURIComponent(active.filename)}`)
    : "", [active]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
    setMediaError(false);
  }, [videoSrc]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <section className="exercise-musclewiki-player" aria-label={`Demonstração MuscleWiki de ${exercise.name}`}>
      <header className="musclewiki-player-heading">
        <div><Film size={17} /><p><strong>DEMONSTRAÇÃO MUSCLEWIKI</strong><small>{state.kind === "ready" ? state.match.name : exercise.name}</small></p></div>
        <span>Vídeo licenciado</span>
      </header>
      <div className="musclewiki-stage">
        {state.kind === "loading" && <div className="musclewiki-state"><RefreshCw size={22} /><strong>Localizando demonstração</strong><small>Buscando a ilustração correspondente no MuscleWiki.</small></div>}
        {state.kind === "not-configured" && <div className="musclewiki-state warning"><ShieldCheck size={22} /><strong>Conexão MuscleWiki pendente</strong><small>Defina <code>MUSCLEWIKI_API_KEY</code> no servidor para ativar as demonstrações autorizadas.</small></div>}
        {state.kind === "unmatched" && <div className="musclewiki-state"><CircleAlert size={22} /><strong>Demonstração ainda não localizada</strong><small>Este exercício será revisado no mapeamento MuscleWiki; o guia técnico continua disponível ao lado.</small></div>}
        {state.kind === "error" && <div className="musclewiki-state warning"><CircleAlert size={22} /><strong>Não foi possível abrir o MuscleWiki</strong><small>{state.message}</small></div>}
        {state.kind === "ready" && active && !mediaError && (
          <>
            <video ref={videoRef} key={videoSrc} src={videoSrc} muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setMediaError(true)} aria-label={`${active.label}: ${exercise.name}`} />
            <div className="musclewiki-video-gradient" aria-hidden="true" />
            <button type="button" className="musclewiki-play" onClick={() => void togglePlayback()} aria-label={playing ? "Pausar demonstração" : "Reproduzir demonstração"}>{playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button>
            <span className="musclewiki-video-label">{active.label}</span>
          </>
        )}
        {state.kind === "ready" && active && mediaError && <div className="musclewiki-state warning"><CircleAlert size={22} /><strong>Não foi possível reproduzir este vídeo</strong><small>Verifique a chave e a cota da MuscleWiki no servidor e tente novamente.</small></div>}
        {state.kind === "ready" && !active && <div className="musclewiki-state"><CircleAlert size={22} /><strong>Sem vídeo disponível para esta variação</strong><small>A ficha MuscleWiki foi encontrada, porém não retornou uma demonstração compatível.</small></div>}
      </div>
      {state.kind === "ready" && state.detail.videos.length > 1 && <div className="musclewiki-angle-selector" role="group" aria-label="Ângulo da demonstração">{state.detail.videos.map((video, index) => <button key={`${video.stream}-${video.filename}`} type="button" className={index === activeVideo ? "active" : ""} onClick={() => setActiveVideo(index)}>{video.label}</button>)}</div>}
      {state.kind === "ready" && state.detail.steps.length > 0 && <p className="musclewiki-source-step">{state.detail.steps[0]}</p>}
      <footer className="musclewiki-attribution">Exercise data and videos provided by <a href="https://musclewiki.com" target="_blank" rel="noreferrer">MuscleWiki.com</a><a href="/legal.html" target="_blank" rel="noreferrer">Privacidade e termos</a></footer>
    </section>
  );
}
