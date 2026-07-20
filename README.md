# FORGE — Build Your Best

Demo web premium de um sistema unificado para planejamento, execução e análise de treinos. O recorte atual prioriza uma jornada de musculação completa e demonstrável, com dados coerentes de corrida, mobilidade e bem-estar para comunicar a visão futura do produto.

> **Importante:** esta versão é uma demonstração de produto. Ela não oferece diagnóstico, prescrição médica ou recomendação clínica e não deve ser usada como fonte única para decisões de saúde.

## O que a demo entrega

- Dashboard responsivo com treino do dia, prontidão, metas, sequência, métricas e atividades recentes.
- Templates de treino e biblioteca de exercícios com dados demonstrativos.
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

O frontend usa `http://<host>:4000/api/v1` por padrão e mantém sessões pendentes no dispositivo quando a API está offline. Para Android/iOS, defina `NEXT_PUBLIC_FORGE_API_URL` com a URL HTTPS pública da API antes do build; `NEXT_PUBLIC_PULSE_API_URL` permanece como alias de compatibilidade.

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

O build usa `output: "export"` e gera o artefato estático em `out/`. Por isso, `npm run dev` é a forma recomendada de visualizar localmente durante o desenvolvimento; o diretório `out/` é o artefato consumido por hospedagem estática e pelo Capacitor.

## PWA

A aplicação web é responsiva e instalável como PWA. O service worker armazena o app shell, os chunks iniciais do build, ícones, mídia pública e as ilustrações da biblioteca; os dados de sessão permanecem no dispositivo quando a API está indisponível. Não existe ainda sincronização offline confiável com servidor.

Antes de chamar uma entrega de PWA pronta para produção, devem ser validados no build final:

- manifesto, ícones e experiência de instalação;
- service worker e estratégia de atualização;
- página de fallback offline;
- comportamento em Safari/iOS e Chrome/Android;
- ausência de cache de respostas sensíveis;
- migração do estado persistente e recuperação após atualização.

Sincronização em segundo plano não deve ser pressuposta, sobretudo no iOS. A arquitetura futura usa uma fila local em IndexedDB e sincroniza também na abertura e retomada do app.

## Android e iOS com Capacitor

O arquivo `capacitor.config.ts` aponta `webDir` para `out`, então todo sync nativo começa por um build web.

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

Os diretórios `android/` e `ios/` já incluem os assets FORGE gerados a partir de `assets/logo.svg`. Para regenerá-los após uma mudança de marca, execute `npm run assets:generate` e confira o manifesto PWA antes de publicar. Os ícones PWA podem ser recriados com `npm run assets:forge`. Plugins de sensores, notificações, deep links e armazenamento seguro deverão ficar atrás de adapters para manter o domínio independente do Capacitor.

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

A tela **Explorar** oferece programas, sessões guiadas, intervalos, modo de registro e cache offline. O pôster em `public/media/pulse-training-hero.webp` é um ativo original do FORGE.

O APK usado como referência não contém os vídeos de treino: eles são entregues por serviços remotos protegidos e não fazem parte do arquivo instalável. Por isso, nenhum vídeo, token, URL privada, logotipo ou mídia da Nike é distribuído neste projeto.

Para adicionar vídeos próprios ou licenciados:

1. coloque o arquivo MP4 (H.264 + AAC) em `public/media/guided/`;
2. preencha `videoSrc` na sessão correspondente em `src/lib/guided-content.ts`;
3. mantenha `poster`, duração e direitos de uso documentados;
4. execute `npm run build` e `npm run mobile:sync`.

Arquivos MP4 próprios são suportados diretamente pelo player e pelo cache solicitado pelo usuário. HLS/DASH, legendas, DRM e Chromecast exigem uma camada de mídia e um receiver próprios antes de serem habilitados em produção.

### Ilustrações dos exercícios

Os 19 exercícios da biblioteca possuem imagens educacionais originais em `public/media/exercises/`. Elas foram geradas especificamente para o FORGE, otimizadas em WebP e integradas aos cards, ao painel de detalhes e ao modo de treino. As imagens também fazem parte do precache offline da PWA. A coleção cobre todos os movimentos usados nas rotinas atuais e todos os movimentos de calistenia nomeados explicitamente no documento de expansão: pull-up, muscle-up, front lever, back lever, planche, bandeira humana, L-sit e parada de mãos.
