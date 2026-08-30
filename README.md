# Voneka Projectos

Sistema corporativo multi-empresa de gestao e acompanhamento de projectos. O eixo do produto e o
follow-up a Direccao e o mini relatorio escrito — nao uma percentagem.

Monorepo pnpm: API Node + Express + Drizzle + PostgreSQL; web React + Vite; regras partilhadas em
`packages/shared`. Os modulos internos mantem o scope `@nexora/*`.

## Arranque local

```
pnpm install
pnpm db:up          # Postgres em Docker, porta 5434
pnpm tables         # aplica migracoes (nao gera SQL novo)
pnpm seed:admin     # empresa real + conta de Administrador (nao apaga nada)
pnpm dev            # API :4000 e web :5173
```

Uma empresa a serio tambem nasce em `/criar-empresa`, na pagina publica.

### Gerar SQL novo

`pnpm tables` so aplica o que ja esta em `apps/api/drizzle/`. Para escrever uma migracao nova:

```
pnpm --filter @nexora/api generate
pnpm tables
```

### Seed de demonstracao

`pnpm seed` **apaga a base** e recria a empresa de demonstracao. Recusa correr em `NODE_ENV=production`.
Nao use isto contra a base da casa.

## Base de dados

Dois caminhos:

| | |
|---|---|
| Local | `pnpm db:up` → `postgresql://nexora:nexora@localhost:5434/nexora_projectos` |
| Supabase | ligacao **Session pooler** (porta 5432). O host directo `db.<ref>.supabase.co` e so IPv6 |

A *Transaction pooler* (porta 6543) nao serve para as migracoes do Drizzle: nao suporta instrucoes
preparadas. Use o pooler de sessao ou o host directo.

`DATABASE_URL` vive em `apps/api/.env`. Modelo em `apps/api/.env.example`.

## Recuperar o acesso de Administrador

```
pnpm seed:admin                         # gera e imprime uma palavra-passe forte
ADMIN_PASSWORD="..." pnpm seed:admin    # ou define a sua
```

Idempotente: nao apaga dados. Quem perdeu a palavra-passe de uma conta normal usa `/recuperar`.

## Producao

- `NODE_ENV=production` recusa os segredos JWT de exemplo do `.env.example`.
- `GET /api/health` faz `select 1` e devolve 503 se a base nao responder.
- O historico (`audit_log`) retém 24 meses; o cron das 03:30 de Maputo apaga o resto, juntamente
  com as sessoes expiradas.
- Sem SMTP, convites e recuperacao de palavra-passe escrevem a ligacao no log.

## Verificar

```
pnpm typecheck
pnpm --filter @nexora/shared test
pnpm --filter @nexora/api test
```

Os testes de integracao da API precisam de `DATABASE_URL`. Os de isolamento e palavra-passe criam
empresas pela porta publica e nao dependem do seed.
