# OLYMPUS AI — Treine com inteligência. Evolua sem limites.

Demo web premium de um sistema unificado para planejamento, execução e análise de treinos. O recorte atual prioriza uma jornada de musculação completa e demonstrável, com dados coerentes de corrida, mobilidade e bem-estar para comunicar a visão futura do produto.

> **Importante:** esta versão é uma demonstração de produto. Ela não oferece diagnóstico, prescrição médica ou recomendação clínica e não deve ser usada como fonte única para decisões de saúde.

## O que a demo entrega

- Dashboard responsivo com treino do dia, prontidão, metas, sequência, métricas e atividades recentes.
- Templates de treino e catálogo com 212 exercícios, fotografias individuais, técnica, segurança e progressões.
- Modo de treino focado para registrar séries, repetições, carga, RPE e descanso.
- Progresso com volume, peso, percentual de gordura e recordes pessoais.
- Calendário mensal com treinos realizados, planejados e recuperação.
- Experiência de "Coach IA" para demonstrar insights contextualizados.
- Onboarding com objetivo, local, limitações e preferências persistidas no perfil.
- Corrida, yoga & mobilidade, painel profissional e treino personalizado salvo da biblioteca.
- Interface clara por padrão, tema escuro opcional, animações, estados responsivos e navegação adaptada para desktop e mobile.

A jornada principal é:

```text
Dashboard -> selecionar treino -> iniciar sessão -> registrar séries -> concluir -> ver progresso
```

## Limites conhecidos

A demo é executada no cliente, com dados semeados em `src/lib/demo-data.ts` e, quando aplicável, persistência local no navegador. Nesta etapa:

- não há API NestJS, PostgreSQL, Prisma, login real ou sincronização entre dispositivos;
- o Coach IA usa respostas e regras demonstrativas, não um modelo generativo nem avaliação clínica;
- Google Fit, Apple Health, Garmin, Strava, Fitbit e outros provedores não estão conectados;
- GPS, mapas, upload em nuvem, notificações push, WebSocket, PDF/Excel e pagamentos não são reais;
- métricas de corrida, sono, frequência cardíaca, calorias e composição corporal são dados fictícios;
- limpar os dados do site/navegador pode apagar o estado local da sessão.

Nenhuma tela da demo deve ser interpretada como confirmação de integração, precisão de sensor ou recomendação individual de saúde.

## Tecnologias

- Next.js 15, React 19 e TypeScript
- Framer Motion, Lucide React e Recharts
- TanStack Query preparado para a futura camada de API
- exportação estática do Next.js para web/PWA e Capacitor
- Capacitor 7 para os contêineres Android e iOS

A arquitetura de produção prevista usa NestJS, Prisma e PostgreSQL como um monólito modular. Consulte [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Executar localmente

### API REST

O backend NestJS fica em `api/` e substitui a dependência Firebase/Appy Pie observada no APK de referência.

```bash
npm run api:install
npm run api:dev
```

O frontend usa `http://<host>:4000/api/v1` por padrão e mantém sessões pendentes no dispositivo quando a API está offline. Para Android/iOS, defina `NEXT_PUBLIC_OLYMPUS_API_URL` com a URL HTTPS pública da API antes do build; `NEXT_PUBLIC_FORGE_API_URL` e `NEXT_PUBLIC_PULSE_API_URL` permanecem como aliases de compatibilidade.

### Pré-requisitos

- Node.js 20 ou superior
- npm 10 ou superior

Instale e inicie o ambiente de desenvolvimento:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Para visualizar exatamente o artefato estático gerado:

```bash
npm run build
npm run preview
```

Abra `http://localhost:4173`.

O preview estático aceita conexões na rede local e informa o IP disponível ao iniciar. Abra o endereço exibido, por exemplo `http://10.0.0.124:4173`, no celular conectado à mesma rede.

Validações disponíveis:

```bash
npm run typecheck
npm run lint
npm run build
```

O build usa `output: "export"` e gera o artefato estático em `.next-build/`. Por isso, `npm run dev` é a forma recomendada de visualizar localmente durante o desenvolvimento; o diretório `.next-build/` é o artefato consumido por hospedagem estática e pelo Capacitor.

## PWA

A aplicação web é responsiva e instalável como PWA. O service worker armazena o app shell, os chunks iniciais do build, ícones e mídia essencial. As fotografias dos exercícios são cacheadas durante a navegação ou quando o usuário salva um guia offline; os dados de sessão permanecem no dispositivo quando a API está indisponível.

Antes de chamar uma entrega de PWA pronta para produção, devem ser validados no build final:

- manifesto, ícones e experiência de instalação;
- service worker e estratégia de atualização;
- página de fallback offline;
- comportamento em Safari/iOS e Chrome/Android;
- ausência de cache de respostas sensíveis;
- migração do estado persistente e recuperação após atualização.

Sincronização em segundo plano não deve ser pressuposta, sobretudo no iOS. A arquitetura futura usa uma fila local em IndexedDB e sincroniza também na abertura e retomada do app.

## Android e iOS com Capacitor

O arquivo `capacitor.config.ts` aponta `webDir` para `.next-build`, então todo sync nativo começa por um build web.

Os projetos nativos já estão versionados em `android/` e `ios/`. Para atualizar os dois com o build web mais recente:

```bash
npm run mobile:sync
```

Para abrir o Android:

```bash
npm run mobile:android
```

Requisitos: Android Studio, Android SDK e JDK compatível. O comando abre o projeto Android para execução, assinatura e publicação.

Para abrir o iOS, execute **em um Mac**:

```bash
npm run mobile:ios
```

O build iOS requer macOS, Xcode e as ferramentas nativas da Apple. Um computador Windows pode desenvolver e validar a aplicação web, mas não compilar, assinar nem publicar o aplicativo iOS.

Os diretórios `android/` e `ios/` incluem os assets OLYMPUS AI gerados a partir do emblema oficial. Para recriar o lockup, ícones PWA e splash, execute `npm run assets:olympus`; para os derivados nativos, execute `npm run assets:generate` e confira o manifesto antes de publicar. Plugins de sensores, notificações, deep links e armazenamento seguro deverão ficar atrás de adapters para manter o domínio independente do Capacitor.

## Dados e privacidade

Use somente dados fictícios nesta demo. Uma versão com usuários reais deverá incluir consentimento explícito, minimização de dados, exportação e exclusão, trilha de auditoria, política de retenção e controles compatíveis com a LGPD.

Tokens de sessão ou integrações nunca devem ser gravados em `localStorage`. Na arquitetura futura, a web usa cookies seguros e o mobile usa Keychain/Keystore; tokens de provedores ficam criptografados no servidor.

## Roadmap resumido

1. Consolidar a demo, acessibilidade, testes e PWA instalável.
2. Criar API NestJS, Prisma/PostgreSQL, autenticação e perfil do atleta.
3. Persistir templates, sessões, calendário, metas e recordes com sync offline idempotente.
4. Empacotar Android/iOS e adicionar notificações e armazenamento seguro.
5. Integrar provedores um a um, começando por OAuth, importação e reconciliação.
6. Adicionar analytics assíncrono, relatórios e Coach IA com evidências e guardrails.
7. Evoluir para modos Coach/Aluno, consentimento granular e gamificação.

O detalhamento das fronteiras, entidades, fluxos e controles está em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Programas guiados e mídia

A tela **Explorar** oferece programas, sessões guiadas, intervalos, modo de registro e cache offline. O pôster em `public/media/pulse-training-hero.webp` é um ativo original do projeto OLYMPUS AI.

O APK usado como referência não contém os vídeos de treino: eles são entregues por serviços remotos protegidos e não fazem parte do arquivo instalável. Por isso, nenhum vídeo, token, URL privada, logotipo ou mídia da Nike é distribuído neste projeto.

Para adicionar vídeos próprios ou licenciados:

1. coloque o arquivo MP4 (H.264 + AAC) em `public/media/guided/`;
2. preencha `videoSrc` na sessão correspondente em `src/lib/guided-content.ts`;
3. mantenha `poster`, duração e direitos de uso documentados;
4. execute `npm run build` e `npm run mobile:sync`.

Arquivos MP4 próprios são suportados diretamente pelo player e pelo cache solicitado pelo usuário. HLS/DASH, legendas, DRM e Chromecast exigem uma camada de mídia e um receiver próprios antes de serem habilitados em produção.

### Fotografias dos exercícios

Cada um dos 212 exercícios possui uma capa individual em WebP dentro de `public/media/exercises/olympus/`. As 19 fotografias originais aprovadas foram preservadas e o restante foi produzido no mesmo padrão editorial: atleta realista, academia escura, equipamento visível e luz dourada discreta. Os ativos estão integrados aos cards, ao painel de detalhes, ao modo de treino e aos guias offline.

`npm run assets:exercises` valida a cobertura dos 212 arquivos e, quando as folhas-fonte estão disponíveis em `tmp/olympus-photo-sheets/`, refaz os recortes em 1280 × 720. Nenhuma mídia da Nike ou de outro aplicativo é distribuída no catálogo.

### Execução com atleta humano 3D

Ao abrir **Ver execução 3D**, o app inicializa um personagem articulado em WebGL2 usando Three.js. O exercício **Supino no chão com halteres** já usa o atleta oficial OLYMPUS AI em GLB: corpo humano rigado, roupa esportiva, halteres e um clip esquelético próprio em 60 FPS. O arquivo é enquadrado automaticamente e reproduzido em loop pelo `AnimationMixer`, com Play/Pause, velocidade, câmera orbital em 360°, zoom e tela cheia.

Os 212 exercícios possuem identificadores `.motion3d` estáveis e continuam cobertos pelo motor procedural enquanto cada clip específico do atleta oficial é produzido e validado. O manifesto `src/data/exercise-3d-manifest.json` ativa um GLB somente quando o exercício tem uma animação compatível; se o arquivo ou o clip não existir, o fallback é informado na própria tela. As fotografias continuam sendo usadas apenas nas capas dos cards; não existem GIFs ou vídeos dentro do visualizador de execução.

Valide o pacote 3D real e a cobertura do catálogo com:

```bash
npm run athlete3d:validate
npm run motion:validate
```

A referência visual aprovada está em `design/athlete-3d/`. O atleta publicado
é derivado do `Sports_Male_04` da biblioteca Microsoft Rocketbox (licença MIT)
e recebeu texturas, proporções, equipamentos, destaques musculares e animação
próprios do Olympus AI. O pipeline reprodutível do Blender e a proveniência
estão documentados em `scripts/3d/README.md` e
`public/3d/athlete/ASSET-NOTICE.md`.
