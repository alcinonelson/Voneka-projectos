# Deploy: API no Render, web no Vercel

So para o repositorio pessoal (`alcinonelson/Nexora`). O deploy do cPanel (`deploy-web.md`)
continua a existir e nao depende deste.

## Como as duas partes falam

O browser fala sempre com `/api` **na origem da web**. O Vercel reencaminha esse caminho para o
Render (`apps/web/vercel.json`). Assim o cookie de refresh (`path: /api/auth`,
`sameSite: strict`) e um cookie da propria web: nao ha CORS, nem cookies de terceiros que o
Safari bloquearia. O cliente web nao sabe que o Render existe.

```
browser -> web.vercel.app/api/...  --(rewrite)-->  voneka-api.onrender.com/api/...
```

## 1. API no Render

Blueprint em `render.yaml`. Num servico criado a mao, aplicar as mesmas definicoes:

| Campo | Valor |
|---|---|
| Root Directory | *vazio* (raiz do repositorio) |
| Build Command | `pnpm install --frozen-lockfile --prod=false && pnpm --filter @nexora/api build && pnpm --filter @nexora/api migrate:prod` |
| Start Command | `pnpm --filter @nexora/api start` |
| Health Check Path | `/api/health` |

A raiz tem de ficar vazia: em `apps/api` nao ha `pnpm-lock.yaml`, o Render cai para o yarn e o
build parte-se.

O build aplica as migracoes. Se uma migracao falhar, o deploy falha e a versao anterior continua
no ar.

Variaveis de ambiente:

| Variavel | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `HOST` | `0.0.0.0`. Sem isto, em producao a API escuta so em `127.0.0.1` (pensado para o cPanel) e o Render nao a encontra |
| `DATABASE_URL` | Supabase, *Session pooler* (porta 5432) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | 32+ caracteres cada, `openssl rand -base64 48`. Os de exemplo sao recusados |
| `WEB_ORIGIN` | URL da web no Vercel, sem barra final. Vai nas ligacoes dos emails |
| `TRUST_PROXY_HOPS` | `2` (Vercel + Render). Ver abaixo |
| `SMTP_*` | Opcional. Sem SMTP, as ligacoes de convite aparecem no log |

Os alertas de prazo (07:00) e a limpeza (03:30) sao `node-cron` dentro do processo. No plano
gratuito o Render adormece o servico sem trafego, e um servico a dormir nao corre crons.

## 2. Web no Vercel

| Campo | Valor |
|---|---|
| Root Directory | `apps/web` |
| Framework | Vite (o resto vem de `apps/web/vercel.json`) |

Depois do primeiro deploy do Render, trocar em `apps/web/vercel.json`:

```
https://SUBSTITUIR-PELO-URL-DO-RENDER.onrender.com
```

pelo URL real do servico, fazer commit e push. Enquanto o marcador estiver la, a landing abre e o
login falha.

As respostas de `/api` nao ficam na cache da CDN (`x-vercel-enable-rewrite-caching: 0`): sao
respostas autenticadas.

## 3. `TRUST_PROXY_HOPS`

O `req.ip` alimenta o rate limit (20 tentativas de login em 15 minutos). Com um salto a menos,
todos os utilizadores aparecem com o IP do Vercel e partilham o mesmo limite. Com um a mais, o
cliente escolhe o proprio IP pelo `X-Forwarded-For`.

Confirmar depois do deploy: fazer o mesmo pedido pela web a partir de duas redes (PC e telemovel
em dados moveis) e comparar o cabecalho `RateLimit` da resposta. Se as contagens forem
independentes, o valor esta certo; se descerem juntas, os saltos estao errados.

## Verificar

1. `https://<api>.onrender.com/api/health` -> 200
2. `https://<web>.vercel.app/api/health` -> 200 (o reencaminhamento funciona)
3. Entrar pela web, carregar F5: a sessao mantem-se (o cookie de refresh funciona)
