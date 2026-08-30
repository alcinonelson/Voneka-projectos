# Voneka Projectos - Project Guidelines

## Project Overview
Voneka Projectos e um sistema corporativo multi-empresa de gestao e acompanhamento de projectos.
Nasceu como segundo produto da familia NEXORA e foi rebaptizado; o primeiro produto (gestao de
despesas) vive nos ficheiros `NEXORA.dc.html` / `NEXORA Landing.dc.html` e NAO deve ser alterado
por trabalho feito aqui.

Tech Stack: monorepo pnpm; backend Node + Express + TypeScript + Drizzle ORM + PostgreSQL;
frontend React + Vite + TypeScript; regras de dominio partilhadas em `packages/shared`.
Os pacotes internos mantem o scope `@nexora/*`: a marca mudou no que o utilizador ve, nao no
nome dos modulos.

O eixo do produto: o follow-up a Direccao e o mini relatorio escrito, nao uma percentagem.
Fechar uma tarefa que exige relatorio sem relatorio valido tem de ser impossivel no backend.

## Session Continuity (READ FIRST)
- **PRD.md** - plano completo, fases, endpoints e requisitos
- **PROGRESS.md** - o que esta feito, em curso e a seguir
- **lessons.md** - erros e correccoes a nao repetir
- RULE: no inicio de CADA sessao, ler PRD.md, PROGRESS.md e lessons.md ANTES de qualquer trabalho
- RULE: depois de concluir qualquer tarefa, actualizar PROGRESS.md
- RULE: depois de qualquer correccao do utilizador, registar o padrao em lessons.md

## Fonte de verdade

`NEXORA Projectos.dc.html` continua a ser a fonte das **regras de negocio**, ja escritas no bloco
`data-dc-script` (linhas 1068-1946) e portadas, nao reinventadas:
- `alerta(dl, estado)` - os cinco escaloes de prazo e as suas cores
- `gravarFases()` - encadeamento de fases: `semanas * 7 - 2`, com 2 dias entre fases
- `submeter()` - minimo de 25 caracteres no mini relatorio
- paletas `saudeCor`, `estadoCor`, `situacaoCor`, `acessoCor`

Ancora temporal do seed de demonstracao: `BASE = 1 Jul 2026`, `HOJE = 59` -> 29 Ago 2026.

**Ja nao e a fonte da pele.** O produto tem marca propria (Voneka), landing publica, assistente de
arranque, menu retractil e um painel com cor. As paletas `estagioCor` e `tipoCor` do design
desapareceram: natureza e estagio passaram a vocabulario de cada empresa e a cor vem de
`chip(nome)`, com fallback neutro. Divergir do `.dc.html` nesses pontos e o comportamento
pretendido; divergir nas regras de prazo, de fase ou de relatorio e defeito.

## Workflow Orchestration

### Plan Mode Default
- Entrar em plan mode para QUALQUER tarefa nao trivial (3+ passos ou decisoes de arquitectura)
- Se algo correr mal, PARAR e replanear - nao insistir
- Usar plan mode tambem para passos de verificacao, nao so para construir

### Self-Improvement Loop
- Depois de QUALQUER correccao do utilizador: registar o padrao em lessons.md
- Escrever regras que impecam o mesmo erro
- Rever lessons.md no inicio da sessao

### Verification Before Done
- Nunca marcar uma tarefa como concluida sem provar que funciona
- Correr testes, ver logs, demonstrar correccao
- Perguntar: "um staff engineer aprovaria isto?"

### Demand Elegance (Balanced)
- Para mudancas nao triviais: parar e perguntar "ha forma mais elegante ou mais correcta?"
- Se um fix parece hacky, implementar a solucao elegante
- Saltar isto em correccoes simples e obvias - nao sobre-engenhar

### Core Principles
- Simplicity First: cada mudanca tao simples quanto possivel; codigo legivel, bem indentado
- No Laziness: encontrar a causa raiz. Sem fixes temporarios. Padrao de programador senior
- Minimal Impact: tocar apenas no necessario

## Code Style Rules

### General
- SEM EMOJIS em codigo, comentarios ou logs
- camelCase para variaveis e funcoes
- PascalCase para classes, tipos e componentes React
- UPPER_SNAKE_CASE para constantes
- Sempre ponto e virgula
- Aspas simples para strings
- Indentacao de 2 espacos

### File Naming
- Backend, minusculas com pontos: `auth.controller.ts`, `tasks.service.ts`
- Validacao: `*.validation.ts`
- Esquema de tabelas: `src/db/schema/*.schema.ts`
- Componentes React: PascalCase, `PainelScreen.tsx`, `ProjectoDrawer.tsx`

### Database
- Ficheiro de ligacao: `apps/api/src/db/db.ts`
- Drizzle apenas; nunca concatenar input do utilizador em SQL
- Migracoes versionadas em `apps/api/drizzle/`
- Operacoes multi-passo que tem de ser atomicas correm dentro de transaccao

### Security
- Validar todo o input com Zod antes de processar
- Verificar propriedade do recurso para prevenir IDOR
- Hash de passwords com bcrypt (minimo 12 rounds)
- Refresh tokens guardados hashados na base de dados
- Rate limiting nas rotas de autenticacao
- OWASP Top 10 em cada endpoint

### Multi-empresa
A empresa e a fronteira exterior de tudo. `Sessao` carrega `org`, vindo do token assinado e nunca
do corpo do pedido. As funcoes de `modules/access.ts` devolvem **sempre** uma condicao - nunca
`undefined` - e essa condicao comeca pela empresa.

Uma escrita que aceite um identificador vindo do cliente (responsavel, natureza, estagio,
departamento, projecto) tem de o validar dentro da empresa da sessao: `exigirTaxonomia`,
`exigirMembroDaEmpresa`, `exigirGestaoProjecto`.

`tests/isolamento.test.ts` e o guardiao deste modelo. Qualquer consulta nova que devolva dados de
dominio precisa de la ter um caso.

### Access Control
Tres niveis, aplicados no SERVICO e nao apenas na rota, sempre dentro da empresa:
- **Administrador** - toda a carteira da sua empresa; define a empresa, o vocabulario e os acessos
- **Gestor de projecto** - os projectos onde e responsavel
- **Colaborador** - so as suas tarefas e projectos

Um Colaborador nunca recebe da base de dados um projecto que nao e seu, mesmo forjando o pedido.
Nao existe "Ver como": quem responde por carteira nao ve o menu de quem executa.

### Vocabulario da empresa
Natureza de projecto, estagio e departamento sao escritos por cada empresa, em `org_taxonomies`.
Nao sao enums. Regra: **qualquer cor derivada de dados que o utilizador escreve resolve-se por
`chip(nome)` com fallback neutro, nunca por `switch`**. Os `switch` de `palette.ts` ficam so para
logica do produto - saude, estado, situacao, nivel de acesso.

Uma entrada em uso e arquivada, nunca apagada, e a mensagem diz quantos registos dependem dela.

### API Response Format
```typescript
// Sucesso
{
  success: true,
  data: { ... },
  message: 'Operacao concluida'
}

// Erro
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Mensagem legivel'
  }
}
```

### Language and Currency
- Interface em portugues de Mocambique, europeu, sem anglicismos
- Strings em `apps/web/src/i18n/pt.ts`, com a forma pronta para receber `en.ts`
- Moeda base: MZN, definida por empresa em `organizations.moeda`. Formatacao em
  `packages/shared/src/currency.ts`, nunca hardcoded
- Voz: frases que dizem o que aconteceu e o que falta decidir, nao rotulos vagos

## Architecture

### Module Structure (backend)
Cada modulo em `apps/api/src/modules/<nome>/` contem:
- `*.controller.ts` - trata pedido e resposta HTTP, fino
- `*.service.ts` - logica de negocio
- `*.routes.ts` - definicao de rotas
- `*.validation.ts` - schemas Zod

### Shared Package
`packages/shared` guarda o que backend e frontend usam ambos: regras de prazo, encadeamento de
fases, enums, paletas e schemas Zod. Uma regra escrita duas vezes diverge; escrita aqui, nao.

### Error Handling
- try/catch nos controladores, erros passados ao middleware de erro
- Nunca expor stack traces, caminhos internos ou dados sensiveis nas respostas
- Log de erros com contexto, sem dados sensiveis

### Logging Standards
- Niveis: error para falhas, warn para recuperavel, info para eventos chave
- NUNCA registar passwords, tokens, dados pessoais ou SQL cru com parametros
- Formato: `[MODULO] Descricao da operacao: detalhe`
- Em producao, apenas error e warn

## Commands
- `pnpm db:up` - subir o Postgres em Docker
- `pnpm dev` - correr api e web em paralelo
- `pnpm tables` - aplicar migracoes
- `pnpm seed` - criar a empresa de demonstracao (APAGA a base; recusa correr em producao)
- `pnpm seed:admin` - criar/repor a empresa real e a sua conta de Administrador. Nao apaga nada e
  e idempotente. Palavra-passe em `ADMIN_PASSWORD`, ou gerada e impressa uma unica vez
- `pnpm test` - correr todos os testes
- `pnpm typecheck` - verificar tipos em todo o monorepo

Uma empresa a serio nao nasce do seed: nasce em `/criar-empresa`, na pagina publica.

## Rules of Engagement
- Este produto e para producao: tratar cada mudanca como se enviasse hoje
- Propor plano para tarefas nao triviais e obter aprovacao antes de escrever codigo
- Codigo defensivo: verificar nulos, validar tipos, proteger contra condicoes de corrida
