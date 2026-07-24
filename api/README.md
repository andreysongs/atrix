# OLYMPUS AI REST API

API NestJS local criada para substituir a dependência Firebase/Appy Pie observada no `Nike_Sports.apk`.

## Executar

```bash
cd api
npm install
npm run dev
```

Base URL local: `http://localhost:4000/api/v1`.

`GET /app-config` fornece configuracao remota e `POST /devices` registra tokens push Android/iOS. O envio real exige credenciais Firebase Admin/APNs proprias; segredos vinculados a APKs de terceiros nao devem ser reutilizados.

Principais recursos: `health`, `dashboard`, `profile`, `exercises`, `workouts`, `sessions` e `goals`. As mutações persistem atomicamente em `data/pulse-db.json`.

Para outro dispositivo na rede, use o IP do computador, por exemplo `http://10.0.0.133:4000/api/v1`.

Esta primeira versão é adequada para desenvolvimento local. Antes de produção, substituir o repositório JSON por PostgreSQL/Prisma e adicionar JWT/OAuth, rate limiting e controle de acesso por atleta.

## MuscleWiki

Crie o arquivo local de configuração e defina a chave somente no processo da
API:

```powershell
Copy-Item .env.example .env
# Edite .env e substitua mw_your_private_api_key pela chave recebida.
npm run dev
```

O endpoint `GET /api/v1/musclewiki/resolve` associa os nomes em inglês do
catálogo aos exercícios do MuscleWiki. Os endpoints de mídia funcionam como
proxy autenticado com suporte a `Range`; nenhum vídeo é salvo no servidor ou
exposto por URL direta. A chave não deve usar o prefixo `NEXT_PUBLIC_` e nunca
deve ser versionada.

Exercise data and videos provided by MuscleWiki.com
