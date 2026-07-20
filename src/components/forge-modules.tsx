"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  Footprints,
  Gauge,
  HeartPulse,
  MessageSquare,
  Moon,
  Mountain,
  Play,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  Trophy,
  UserRound,
  Users,
  Wind,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const runTrend = [
  { week: "S1", distance: 12.4, pace: 5.52 },
  { week: "S2", distance: 15.2, pace: 5.43 },
  { week: "S3", distance: 16.8, pace: 5.35 },
  { week: "S4", distance: 21.1, pace: 5.18 },
  { week: "S5", distance: 23.7, pace: 5.12 },
  { week: "Agora", distance: 27.4, pace: 5.03 },
];

const students = [
  { name: "Marina Costa", initials: "MC", goal: "Hipertrofia", adherence: 94, status: "Treino hoje", alert: false },
  { name: "João Pedro", initials: "JP", goal: "Força", adherence: 87, status: "Carga revisada", alert: false },
  { name: "Carla Souza", initials: "CS", goal: "Reabilitação", adherence: 78, status: "Dor no joelho", alert: true },
  { name: "Lucas Alves", initials: "LA", goal: "Corrida 10K", adherence: 91, status: "Novo recorde", alert: false },
];

const onboardingGoals = ["Ganhar massa", "Perder gordura", "Ficar mais forte", "Correr melhor", "Mobilidade", "Saúde e longevidade"];
const trainingPlaces = ["Academia completa", "Academia de condomínio", "Em casa", "Ao ar livre"];
const limitations = ["Nenhuma limitação", "Joelho", "Lombar", "Ombro", "Mobilidade reduzida"];

export type ForgeOnboardingData = {
  name: string;
  goal: string;
  place: string;
  limitation: string;
};

export function ForgeOnboarding({ onComplete }: { onComplete: (data: ForgeOnboardingData) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Andrey");
  const [goal, setGoal] = useState("Ganhar massa");
  const [place, setPlace] = useState("Academia completa");
  const [limitation, setLimitation] = useState("Nenhuma limitação");

  return (
    <motion.div className="forge-onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="onboarding-visual">
        <Image src="/media/pulse-training-hero.webp" alt="Atleta treinando com foco" fill priority sizes="(max-width: 820px) 100vw, 48vw" />
        <span className="onboarding-visual-shade" />
        <div className="onboarding-visual-copy">
          <span className="forge-mini-brand"><i><Image src="/branding/olympus-app-icon.png" alt="" width={36} height={36} /></i> OLYMPUS AI</span>
          <h1>Treine com<br />inteligência.</h1>
          <p>Evolua sem limites com treino, recuperação e progresso conectados em uma experiência feita para você.</p>
          <div><span><ShieldCheck size={17} /> Recomendações seguras</span><span><Sparkles size={17} /> Evolução inteligente</span></div>
        </div>
      </section>

      <section className="onboarding-panel">
        <header><span>ETAPA {step + 1} DE 3</span><i><b style={{ width: `${((step + 1) / 3) * 100}%` }} /></i><button onClick={() => onComplete({ name, goal, place, limitation })}>Explorar demo</button></header>
        {step === 0 && (
          <motion.div className="onboarding-step" initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <span className="onboarding-icon"><Dumbbell size={23} /></span>
            <p className="eyebrow">BEM-VINDO AO OLYMPUS AI</p>
            <h2>Seu plano começa com o que importa.</h2>
            <p>Conte seu objetivo e o OLYMPUS AI organiza treino, progressão e recuperação em uma jornada simples.</p>
            <label><span>Seu nome</span><input value={name} onChange={(event) => setName(event.target.value)} aria-label="Seu nome" /></label>
            <label><span>E-mail</span><input type="email" defaultValue="andrey@exemplo.com" aria-label="Seu e-mail" /></label>
            <button className="forge-main-action" onClick={() => setStep(1)}>Criar minha experiência <ArrowRight size={18} /></button>
            <small>Ao continuar, você concorda com os termos e a política de privacidade.</small>
          </motion.div>
        )}
        {step === 1 && (
          <motion.div className="onboarding-step" initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <span className="onboarding-icon"><Trophy size={23} /></span>
            <p className="eyebrow">SEU OBJETIVO</p>
            <h2>O que você quer conquistar primeiro?</h2>
            <p>Isso ajusta a frequência, o volume e as recomendações iniciais.</p>
            <div className="onboarding-options">{onboardingGoals.map((item) => <button key={item} className={goal === item ? "selected" : ""} onClick={() => setGoal(item)}>{goal === item && <Check size={15} />}{item}</button>)}</div>
            <div className="onboarding-actions"><button onClick={() => setStep(0)}>Voltar</button><button className="forge-main-action" onClick={() => setStep(2)}>Continuar <ArrowRight size={18} /></button></div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div className="onboarding-step" initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
            <span className="onboarding-icon"><ShieldCheck size={23} /></span>
            <p className="eyebrow">TREINO SEGURO</p>
            <h2>Onde você treina e o que devemos respeitar?</h2>
            <p>Você poderá mudar tudo depois. O OLYMPUS AI não substitui avaliação profissional.</p>
            <fieldset><legend>Local principal</legend><div className="onboarding-options compact">{trainingPlaces.map((item) => <button key={item} className={place === item ? "selected" : ""} onClick={() => setPlace(item)}>{item}</button>)}</div></fieldset>
            <fieldset><legend>Limitações atuais</legend><div className="onboarding-options compact">{limitations.map((item) => <button key={item} className={limitation === item ? "selected" : ""} onClick={() => setLimitation(item)}>{item}</button>)}</div></fieldset>
            <div className="onboarding-actions"><button onClick={() => setStep(1)}>Voltar</button><button className="forge-main-action" onClick={() => onComplete({ name, goal, place, limitation })}>Entrar no OLYMPUS <ArrowRight size={18} /></button></div>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}

export function RunningView({ toast }: { toast: (message: string) => void }) {
  const [period, setPeriod] = useState("6S");
  return (
    <div className="forge-module-view">
      <header className="module-heading"><div><p className="eyebrow">OLYMPUS RUN</p><h1>Sua corrida, mais inteligente.</h1><p>Ritmo, volume e recuperação em uma visão que ajuda você a avançar.</p></div><button className="forge-main-action" onClick={() => toast("GPS preparado. Inicie quando estiver pronto.")}><Footprints size={18} /> Iniciar corrida</button></header>
      <section className="run-hero card">
        <div className="run-map" aria-label="Mapa ilustrativo do percurso"><span className="route-line"><i /><b /><em /></span><span className="map-pin start">INÍCIO</span><span className="map-pin finish">5,2 KM</span></div>
        <div className="run-summary"><span className="status-chip"><HeartPulse size={14} /> PRONTO PARA CORRER</span><h2>Progressivo 5K</h2><p>Comece confortável e termine os últimos 2 km próximo ao ritmo de prova.</p><div><span><strong>5,2</strong><small>km</small><em>Distância</em></span><span><strong>27:08</strong><em>Tempo estimado</em></span><span><strong>5:13</strong><small>/km</small><em>Pace alvo</em></span></div></div>
      </section>
      <section className="module-kpis">
        <article className="card"><span><Route size={18} /></span><p>Distância no mês</p><strong>84,6 <small>km</small></strong><em>+18% vs. junho</em></article>
        <article className="card"><span><Timer size={18} /></span><p>Melhor pace 5K</p><strong>4:56 <small>/km</small></strong><em>recorde há 6 dias</em></article>
        <article className="card"><span><HeartPulse size={18} /></span><p>FC média</p><strong>148 <small>bpm</small></strong><em>zona aeróbica</em></article>
        <article className="card"><span><Mountain size={18} /></span><p>Elevação</p><strong>386 <small>m</small></strong><em>últimas 4 semanas</em></article>
      </section>
      <section className="module-split">
        <article className="card forge-chart-card"><div className="card-title-row"><div><p className="eyebrow">EVOLUÇÃO</p><h2>Volume de corrida</h2></div><div className="mini-tabs">{["6S", "3M", "1A"].map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="run-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={runTrend}><defs><linearGradient id="runArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(100,116,139,.13)" /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis hide domain={[0, 32]} /><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 16px 35px rgba(15,23,42,.12)" }} /><Area type="monotone" dataKey="distance" stroke="#2563eb" strokeWidth={3} fill="url(#runArea)" /></AreaChart></ResponsiveContainer></div></article>
        <article className="card run-zones"><div className="card-title-row"><div><p className="eyebrow">RECUPERAÇÃO</p><h2>Zonas cardíacas</h2></div><Gauge size={20} /></div>{[{ label: "Z1 · Recuperação", value: 18, tone: "#38bdf8" }, { label: "Z2 · Aeróbica", value: 46, tone: "#2563eb" }, { label: "Z3 · Ritmo", value: 24, tone: "#84cc16" }, { label: "Z4 · Limiar", value: 10, tone: "#f97316" }, { label: "Z5 · Máxima", value: 2, tone: "#ef4444" }].map((zone) => <div key={zone.label}><span><strong>{zone.label}</strong><small>{zone.value}%</small></span><i><b style={{ width: `${zone.value}%`, background: zone.tone }} /></i></div>)}</article>
      </section>
    </div>
  );
}

export function MobilityView({ toast }: { toast: (message: string) => void }) {
  const [breathing, setBreathing] = useState(false);
  const sessions = [
    { title: "Mobilidade matinal", detail: "12 min · corpo inteiro", tone: "sky", icon: Sun },
    { title: "Quadris sem tensão", detail: "18 min · nível leve", tone: "lime", icon: Activity },
    { title: "Yoga para recuperação", detail: "24 min · fluxo suave", tone: "violet", icon: Wind },
  ];
  return (
    <div className="forge-module-view mobility-view">
      <header className="module-heading"><div><p className="eyebrow">YOGA & MOBILIDADE</p><h1>Movimente-se com leveza.</h1><p>Respiração, amplitude e recuperação para sustentar sua evolução.</p></div><button className="secondary-button" onClick={() => toast("Sua sequência foi ajustada para 15 minutos.")}><Sparkles size={17} /> Personalizar sessão</button></header>
      <section className="mobility-hero card"><div><span className="status-chip"><Wind size={14} /> SESSÃO RECOMENDADA</span><h2>Reset de corpo inteiro</h2><p>Uma sequência tranquila para aliviar quadris, coluna torácica e ombros após um dia intenso.</p><div><span><Clock3 size={16} /> 15 minutos</span><span><Activity size={16} /> Baixo impacto</span></div><button className="forge-main-action" onClick={() => toast("Sessão de mobilidade iniciada.")}><Play size={17} fill="currentColor" /> Começar agora</button></div><div className={`breathing-orb ${breathing ? "active" : ""}`}><button onClick={() => setBreathing((value) => !value)}><span>{breathing ? "Inspire" : "Respirar"}</span><small>{breathing ? "4 segundos" : "toque para iniciar"}</small></button></div></section>
      <section><div className="card-title-row module-section-title"><div><p className="eyebrow">PARA HOJE</p><h2>Escolha sua prática</h2></div><button onClick={() => toast("Todas as 36 práticas estão disponíveis.")}>Ver todas <ArrowRight size={15} /></button></div><div className="mobility-session-grid">{sessions.map((session) => { const Icon = session.icon; return <button key={session.title} className={`card mobility-session tone-${session.tone}`} onClick={() => toast(`${session.title} preparada.`)}><span><Icon size={22} /></span><div><strong>{session.title}</strong><small>{session.detail}</small></div><Play size={17} /></button>; })}</div></section>
      <section className="module-split"><article className="card pose-card"><p className="eyebrow">POSIÇÃO EM DESTAQUE</p><h2>Adho Mukha Svanasana</h2><p>Cachorro olhando para baixo</p><div className="pose-illustration"><span /><i /><b /></div><ul><li><Check size={15} /> Alongue a coluna antes de estender os joelhos.</li><li><Check size={15} /> Respire de forma lenta e confortável.</li><li><ShieldCheck size={15} /> Reduza a amplitude se houver dor.</li></ul></article><article className="card recovery-plan"><p className="eyebrow">SEU PLANO DE RECUPERAÇÃO</p><h2>3 práticas nesta semana</h2><div className="recovery-days"><span className="done">SEG <Check size={14} /></span><span>TER</span><span className="today">QUA <i /></span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div><div className="recovery-score"><strong>82</strong><span><b>Boa mobilidade</b><small>+6 pontos nas últimas duas semanas</small></span></div><button className="secondary-button" onClick={() => toast("Avaliação de mobilidade aberta.")}>Reavaliar mobilidade</button></article></section>
    </div>
  );
}

export function TrainerView({ toast }: { toast: (message: string) => void }) {
  const [selected, setSelected] = useState(students[0]);
  const [query, setQuery] = useState("");
  const visibleStudents = useMemo(() => students.filter((student) => student.name.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <div className="forge-module-view trainer-view">
      <header className="module-heading"><div><p className="eyebrow">OLYMPUS PRO</p><h1>Bom trabalho, Andrey.</h1><p>Seus alunos estão com 88% de aderência média nesta semana.</p></div><button className="forge-main-action" onClick={() => toast("Cadastro de aluno preparado.")}><Plus size={18} /> Novo aluno</button></header>
      <section className="module-kpis trainer-kpis"><article className="card"><span><Users size={18} /></span><p>Alunos ativos</p><strong>24</strong><em>+3 este mês</em></article><article className="card"><span><ClipboardCheck size={18} /></span><p>Treinos concluídos</p><strong>86</strong><em>nesta semana</em></article><article className="card"><span><CalendarDays size={18} /></span><p>Avaliações</p><strong>7</strong><em>próximos 14 dias</em></article><article className="card"><span><MessageSquare size={18} /></span><p>Mensagens</p><strong>5</strong><em>2 prioritárias</em></article></section>
      <section className="trainer-layout">
        <article className="card student-list"><div className="card-title-row"><div><p className="eyebrow">ALUNOS</p><h2>Acompanhamento</h2></div><button><Plus size={16} /></button></div><label className="module-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar aluno" aria-label="Buscar aluno" /></label><div>{visibleStudents.map((student) => <button key={student.name} className={selected.name === student.name ? "active" : ""} onClick={() => setSelected(student)}><span className="student-avatar">{student.initials}</span><span><strong>{student.name}</strong><small>{student.goal}</small></span><em className={student.alert ? "alert" : ""}>{student.status}</em><ChevronRight size={15} /></button>)}</div></article>
        <article className="card student-detail"><header><span className="student-avatar large">{selected.initials}</span><div><p className="eyebrow">ALUNO ATIVO</p><h2>{selected.name}</h2><span>{selected.goal} · 4x por semana</span></div><button onClick={() => toast(`Mensagem para ${selected.name} preparada.`)}><MessageSquare size={17} /></button></header>{selected.alert && <div className="student-alert"><ShieldCheck size={18} /><span><strong>Desconforto relatado</strong><small>Revise o treino de pernas antes da próxima sessão.</small></span><button onClick={() => toast("Relato aberto para revisão.")}>Revisar</button></div>}<div className="student-progress"><div><span><strong>{selected.adherence}%</strong><small>Aderência</small></span><i><b style={{ width: `${selected.adherence}%` }} /></i></div><div><span><strong>+12%</strong><small>Volume em 30 dias</small></span><i><b style={{ width: "72%" }} /></i></div><div><span><strong>7h18</strong><small>Sono médio</small></span><i><b style={{ width: "81%" }} /></i></div></div><div className="student-week"><h3>Agenda desta semana</h3>{["Lower A · concluído", "Corrida Z2 · concluída", "Push B · hoje", "Mobilidade · sábado"].map((item, index) => <span key={item} className={index < 2 ? "done" : index === 2 ? "today" : ""}><i>{index < 2 ? <Check size={13} /> : index + 1}</i>{item}<button onClick={() => toast("Treino aberto para edição.")}>Abrir</button></span>)}</div><button className="forge-main-action" onClick={() => toast(`Novo treino para ${selected.name} criado.`)}><Dumbbell size={17} /> Criar treino</button></article>
      </section>
    </div>
  );
}

export function ProfileView({ theme, onThemeChange, onResetOnboarding, toast, profileName, initials, goal, place, limitation }: { theme: "light" | "dark"; onThemeChange: (theme: "light" | "dark") => void; onResetOnboarding: () => void; toast: (message: string) => void; profileName: string; initials: string; goal: string; place: string; limitation: string }) {
  return (
    <div className="forge-module-view profile-view">
      <header className="profile-hero card"><span className="profile-avatar-xl">{initials}<i /></span><div><p className="eyebrow">NÍVEL 18 · ATLETA</p><h1>{profileName}</h1><p>{goal} · membro desde março de 2025</p><div><span><Trophy size={15} /> 14 conquistas</span><span><Dumbbell size={15} /> 128 treinos</span><span><Activity size={15} /> 12 dias de sequência</span></div></div><button className="secondary-button" onClick={() => toast("Edição de perfil aberta.")}><UserRound size={17} /> Editar perfil</button></header>
      <section className="profile-grid"><article className="card profile-level"><div><span>18</span><div><p className="eyebrow">PRÓXIMO NÍVEL</p><h2>Atleta Elite</h2><small>580 XP para evoluir</small></div></div><i><b style={{ width: "86%" }} /></i><p>Continue sua sequência para ganhar um bônus de 250 XP.</p></article><article className="card profile-program"><p className="eyebrow">PROGRAMA ATUAL</p><h2>Projeto Híbrido</h2><p>Força + corrida · semana 6 de 8</p><i><b style={{ width: "68%" }} /></i><span><strong>68%</strong><small>18 de 26 sessões</small></span></article></section>
      <section className="profile-settings-grid"><article className="card"><div className="card-title-row"><div><p className="eyebrow">PREFERÊNCIAS</p><h2>Aparência e experiência</h2></div><Sun size={20} /></div><div className="theme-picker"><button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")}><Sun size={18} /><span><strong>Claro</strong><small>Mais leve para uso diário</small></span>{theme === "light" && <Check size={16} />}</button><button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")}><Moon size={18} /><span><strong>Escuro</strong><small>Ideal para pouca luz</small></span>{theme === "dark" && <Check size={16} />}</button></div><button className="settings-row" onClick={onResetOnboarding}><Sparkles size={17} /><span><strong>Refazer configuração inicial</strong><small>Objetivo, local e limitações</small></span><ChevronRight size={16} /></button></article><article className="card"><div className="card-title-row"><div><p className="eyebrow">SEGURANÇA</p><h2>Limitações e cuidados</h2></div><ShieldCheck size={20} /></div><div className="limitation-tags"><span>{limitation === "Nenhuma limitação" ? "Sem limitações ativas" : limitation}</span><button onClick={() => toast("Configuração de limitações aberta.")}><Plus size={14} /> Adicionar</button></div><p className="health-note">O OLYMPUS AI adapta sugestões, mas não realiza diagnósticos. Procure um profissional de saúde em caso de dor ou lesão.</p><button className="settings-row" onClick={() => toast("Equipamentos disponíveis abertos.")}><Dumbbell size={17} /><span><strong>Equipamentos disponíveis</strong><small>{place}</small></span><ChevronRight size={16} /></button><button className="settings-row" onClick={() => toast("Privacidade e dados abertos.")}><ShieldCheck size={17} /><span><strong>Privacidade e dados</strong><small>Fotos, saúde e permissões</small></span><ChevronRight size={16} /></button></article></section>
    </div>
  );
}
