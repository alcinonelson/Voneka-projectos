# PROGRESS

Ancora temporal do produto: `BASE = 1 Jul 2026`, `HOJE = 59` -> 29 Ago 2026.

## Estado geral

| | |
|---|---|
| Testes | isolamento, palavra-passe e shared a passar; recuperacao coberta |
| Typecheck | limpo nos tres pacotes |
| Build de producao | api e web compilam |
| Base de dados | Multi-empresa, aplicada no Supabase e em local. Empresa **Voneka SU, Lda** criada |

## Fase 1 - Fundacao

- [x] Monorepo pnpm com workspaces (`apps/*`, `packages/*`)
- [x] `tsconfig.base.json` em modo strict
- [x] `CLAUDE.md` adaptado a TypeScript, `PRD.md`, `PROGRESS.md`, `lessons.md`
- [x] `packages/shared`: enums, palette, deadline, phases, currency, calendar, api, schemas Zod
- [x] Testes que fixam os cinco escaloes de prazo e o encadeamento de fases

**Prova**: `pnpm --filter @nexora/shared test` -> 48 testes em 3 ficheiros.

Notas da fase:
- `alertaPrazo` corrige o singular do design (`1 dia em atraso` em vez de `1 dias`). Nenhum
  valor semeado cai neste escalao, por isso a comparacao lado a lado mantem-se identica.
- `lerData` recusa datas inexistentes (31/02), que o `dataParaOff` do design deixava escorregar.
- Enums guardam codigo ASCII estavel para a base de dados e etiqueta pt-MZ para o interface.
- Valores monetarios circulam em centavos inteiros, nunca em virgula flutuante.

## Fase 2 - Base de dados

- [x] Esquema Drizzle: 10 tabelas, 11 enums nativos construidos a partir de `@nexora/shared`
- [x] Migracoes versionadas em `apps/api/drizzle/`
- [x] Seed a partir dos dados do design
- [ ] **Aplicar no Supabase** - falta a palavra-passe da base de dados

### Supabase

`DATABASE_URL` em `apps/api/.env` esta apontada ao pooler, com a palavra-passe por preencher:

```
postgresql://postgres.<ref-do-projecto>:<PASSWORD>@aws-1-<regiao>.pooler.supabase.com:5432/postgres
```

O host directo `db.<ref>.supabase.co` resolve so em IPv6 e nao serve nesta maquina; o pooler
responde em IPv4. Assim que a palavra-passe estiver la: `pnpm tables` e depois `pnpm seed`.

Ha tambem um Postgres local em Docker (`pnpm db:up`, porta 5434) usado para desenvolver e correr
os testes de integracao. Trocar entre os dois e so mudar `DATABASE_URL`.

**Prova contra o painel do design** (base local semeada):

| Tarefa | Deadline | Dias | Alerta do design |
|---|---|---|---|
| Obter parecer fiscal externo | 2026-08-18 | -11 | 11 dias em atraso |
| Repor capacidade de digitalizacao | 2026-08-27 | -2 | 2 dias em atraso |
| Recolher aceitacao formal | 2026-08-29 | 0 | Vence hoje |
| Mapear activos fixos | 2026-08-30 | +1 | Vence amanha |
| Migrar contabilidade analitica | 2026-09-02 | +4 | Faltam 4 dias |

7 utilizadores, 11 projectos, 33 fases, 18 tarefas, 6 relatorios, 43 alocacoes.
4 tarefas atrasadas em 3 projectos, que e o que a faixa de foco do painel afirma.

Decisoes da fase:
- `phases` guarda `planeado_starts_on` / `planeado_ends_on` alem das datas em vigor. E o que faz
  "Repor plano original" devolver a verdade em vez de recalcular por adivinhacao.
- `projects.avanco_pct` e declarado pela gestora, nao derivado das tarefas. Derivar daria a
  percentagem uma autoridade que o produto lhe nega.
- No design havia relatorios a citar tarefas inexistentes. Aqui cada relatorio nasce de uma
  tarefa, e o seed cria as cinco que faltavam, ja fechadas.
- `notifications.chave_unica` torna o job de alertas idempotente por tarefa, escalao e dia.

## Fase 3 - Auth

- [x] Login, refresh rotativo, logout, `GET /me`, aceitar convite
- [x] Middleware de autenticacao e de nivel de acesso
- [x] Convite por email com expiracao de 7 dias

- Access token JWT de 15 minutos; refresh opaco de 384 bits guardado hashado, rodado a cada
  renovacao. Um token ja rodado revoga todas as sessoes da conta.
- O refresh viaja em cookie httpOnly; o access token so vive em memoria no cliente.
- bcrypt com 12 rondas. O login gasta o mesmo tempo com email inexistente, para nao denunciar
  quais estao registados.
- Rate limit de 20 tentativas por 15 minutos nas rotas de credenciais.

## Fase 4 - API de dominio

- [x] `projects`, `phases`, `tasks`, `reports`, `dashboard`, `users`, `notifications`
- [x] Scoping por nivel de acesso dentro dos servicos, na clausula WHERE
- [x] Historico de accoes em `audit_log`

- A conclusao de tarefa e uma transaccao: ou fecha e cria o relatorio, ou nao faz nada.
- O painel calcula a faixa de foco a partir dos dados; a frase muda quando o obstaculo sai.
- O avanco previsto compara o calendario ja consumido com o avanco declarado.

## Fase 5 a 7 - Frontend

- [x] `tokens.ts`, sidebar, cabecalho, router, cliente de API, sessao, login, aceitar convite
- [x] Painel, Projectos, gaveta, Roteiro, Tarefas, Relatorios, Equipa
- [x] Modais: registar projecto, atribuir tarefa, registar membro, editar fases, mini relatorio
- [x] As minhas tarefas, Os meus projectos, Os meus relatorios, pedido de prorrogacao

- Porte directo dos estilos inline do design para tokens tipados; as cores vem de
  `@nexora/shared`, as mesmas que o servidor usa.
- Radix apenas como primitiva headless de Dialog: foco preso, Esc, ARIA, zero estilo imposto.
- As datas sao convertidas na fronteira da API. Um dia (`2026-08-29`) e lido como meia-noite UTC
  e nao com `new Date()`, que em fusos a oeste o atiraria para o dia anterior.

## Fase 8 - Pendentes do design

- [x] **Reordenar fases por arrasto** no editor, com dnd-kit; as datas reencadeiam-se enquanto
      se arrasta, para a consequencia se ver antes de gravar
- [x] **Vista de terreno** abaixo de 900px: so ver a tarefa e submeter o relatorio, com alvos de
      toque de 44px. A carteira e o roteiro ficam de fora de proposito
- [x] **Notificacoes efectivas** de deadline: job `node-cron` as 07:00 de Maputo, email e sino

**Prova do job**: primeira passagem cria 4 avisos, segunda passagem cria 0 - idempotente pela
`chave_unica`. Os avisos gerados batem com os prazos do design:

```
Vence hoje: Recolher aceitacao formal da Direccao   -> Nuno Chirindza
8 dias em atraso: Validar plano de contas            -> Ivete Macuacua
11 dias em atraso: Obter parecer fiscal externo      -> Helder Tembe
2 dias em atraso: Repor capacidade de digitalizacao  -> Sara Nhaca
```

## Fase 9 - Multi-empresa

- [x] Tabela `organizations` e coluna `organization_id` em users, projects, tasks, reports,
      task_extensions, notifications, audit_log
- [x] `org` no access token; `access.ts` devolve sempre a condicao de empresa, nunca `undefined`
- [x] `POST /api/auth/register-company`, publica e sob o limite das credenciais
- [x] Baseline de migracoes regenerada (12 tabelas)

Decisoes da fase:
- `users.email` continua unico em todo o sistema e nao por empresa. O login nao precisa de
  perguntar "de que empresa?" antes de saber quem e a pessoa, e ninguem descobre que empresas
  existem experimentando emails.
- `projects.codigo` passou a unico **por empresa**: duas empresas podem ambas ter um PRJ-001.
- `tasks`, `reports` e `task_extensions` guardam a empresa apesar de a poderem derivar do
  projecto. E redundancia deliberada: poe o filtro no indice de cada consulta sem obrigar a um
  join so para saber de quem sao as linhas.
- O caso perigoso e o Administrador, que dentro da sua casa nao tem restricao. Toda a consulta a
  que faltasse a condicao de empresa aparecia so no teste de isolamento - por isso ele existe.

**Prova**: `tests/isolamento.test.ts`, 18 testes. Duas empresas criadas do zero pela porta
publica, com dados espelhados. O Administrador de A recebe 404 no projecto de B, lista vazia em
toda a parte, e 422/403/404 em todas as escritas que atravessem a fronteira.

## Fase 10 - Vocabulario da empresa

- [x] Tabela `org_taxonomies` (natureza, estagio, departamento) com cor, prefixo e modelo de fases
- [x] `projects.natureza`/`estagio` de pgEnum para FK; `users.departamento` idem
- [x] `CHIPS` e `chip()` em `packages/shared/src/palette.ts`; `corNatureza`/`corEstagio` saem
- [x] Esforco e alocacao passam a campo numerico livre, com os valores antigos como atalhos
- [x] Modulo `taxonomies` com listar, criar, criar em lote, actualizar e remover

- Uma entrada em uso nao e apagada: e arquivada, e a resposta diz quantos registos dependem dela.
  Um erro de chave estrangeira nao explica nada a quem carregou no botao.
- Naturezas e estagios nao podem ficar a zero: sem eles nao se regista um projecto, e o produto
  ficaria num beco de onde a unica saida seria recriar o que se acabou de apagar.
- O prefixo do codigo (PRJ, CNC) mudou-se do codigo para a natureza, editavel pela empresa.

## Fase 11 - Arranque

- [x] `GET /api/organizations/me/setup` e ecra `Arranque.tsx` com quatro passos
- [x] Conjunto de partida que **preenche** o formulario em vez de o fechar
- [x] O seed deixa de ser a porta de entrada: passa a empresa de demonstracao, com guarda
      `NODE_ENV !== 'production'` antes do TRUNCATE, que antes nao tinha nenhuma

Um Administrador sem vocabulario e reencaminhado para o assistente. O painel abriria vazio e sem
accao possivel, que e a pior primeira impressao que um produto pode dar.

## Fase 12 - Marca Voneka, landing e entrada

- [x] Simbolo novo (V com a haste ascendente a rematar em azul), `favicon.svg`, `site.webmanifest`
- [x] `index.html` com titulo, descricao, theme-color e og tags
- [x] `Landing.tsx`, `Login.tsx` e `CriarEmpresa.tsx` sobre a casca `CascaPublica`
- [x] Textos NEXORA -> VONEKA no interface e nos emails

A landing abre com um mini relatorio composto como documento, e nao com um numero grande nem uma
imagem do painel. E a tese do produto posta a vista. Instrument Serif entra so aqui e sobretudo no
texto do relatorio - a prosa e que e o produto.

Os comentarios que citam `NEXORA Projectos.dc.html` ficam: o ficheiro continua a ser a fonte das
regras de negocio, e a referencia tem de continuar a apontar para o nome real do ficheiro.

## Fase 13 - Administrador, menu e cor no painel

- [x] "Ver como" removido de `auth.tsx` e do `Sidebar`. `ehDireccao` passa a `nivel !== colaborador`
- [x] Grupo **Empresa** so para Administrador: Equipa e acessos, Vocabulario, Dados da empresa
- [x] Menu lateral recolhivel (236px -> 60px), preferencia em `localStorage`, `aria-expanded`
- [x] `LARGURA.minima` de 1440 para 1180, para recolher comprar espaco a serio
- [x] Painel com superficies tingidas e faixa de foco que muda de temperatura com o atraso

A cor entra ligada ao que os dados dizem. O que nao muda e a semantica ja fixada: um projecto no
prazo continua com a barra em tinta e nao em verde, porque o verde e do que ja esta cumprido.
O botao "Exportar", que so mostrava um toast, saiu - volta quando houver endpoint.

## Fase 14 - Roteiro sem recarregar

Causa: `Roteiro.tsx` fazia um pedido de fases por projecto com `useQueries` e juntava-os a carteira
**por indice**. O array de queries era reconstruido a cada render, pelo que a cascata de
invalidacao (projectos -> carteira refetch -> novo render -> observadores refeitos) podia abortar
o refetch das fases; e qualquer mudanca de tamanho da carteira encostava as fases ao projecto
errado.

- [x] `GET /api/projects/phases` devolve as fases da carteira visivel agrupadas por projecto
- [x] `useFasesDaCarteira()`, uma consulta, juntada por identificador e nunca por posicao
- [x] `useReagendarFase` com actualizacao optimista e rollback; `useGravarRoteiro` escreve o
      resultado na cache no mesmo instante em que o modal fecha

De N+1 pedidos para 2. A barra deixa de saltar entre largar e o servidor confirmar.

## Fase 15 - Interface para quem nao e informatico

- [x] `Modal` ganha indicador de passos e botao de recuo
- [x] `ModalProjecto` e `ModalTarefa` em tres passos, com frase de confirmacao viva no rodape
- [x] `CampoData`: texto e calendario do navegador, com a data confirmada por extenso por baixo
- [x] A carga de cada pessoa le-se em palavras alem da cor
- [x] `EditorVocabulario` diz "Arquivar" ou "Remover" **antes** de ser carregado

A deadline do projecto deixou de vir preenchida a `hoje() + 111` dias. Um valor que aparece sozinho
e que ninguem decidiu e pior do que um campo vazio.

## Fase 16 - Arranque real no Supabase

- [x] Salvaguarda do esquema antigo para `.salvaguarda/supabase-antes-de-multiempresa.json`
      (7 contas, 12 projectos, 36 fases, 18 tarefas, 6 relatorios, 32 registos de historico)
- [x] Esquema reposto no Supabase e migracao nova aplicada (12 tabelas)
- [x] `seed-admin.ts`: cria a empresa **Voneka SU, Lda** e a conta de Administrador
- [x] Login verificado contra o Supabase, com o `.env` do projecto tal como esta

O seed de administrador nao apaga nada e e idempetente: corre duas vezes sem duplicar vocabulario
e sem partir a conta. Serve tres casos - instalacao nova, base reposta, e recuperar o acesso de
uma conta de Direccao que se perdeu.

```
pnpm seed:admin                              # gera e imprime uma palavra-passe forte
ADMIN_PASSWORD="..." pnpm seed:admin         # ou define a sua
```

A palavra-passe nunca fica escrita em ficheiro nenhum: ou vem do ambiente, ou e gerada e impressa
uma unica vez no log.

**Nota sobre repor uma base**: apagar so o esquema `public` nao chega. O jornal de migracoes do
Drizzle vive no esquema `drizzle`, e deixa-lo intacto faz o `migrate` responder "aplicadas" sem
criar tabela nenhuma - um sucesso falso que so se descobre na primeira consulta.

## Fase 17 - Alterar a palavra-passe

`alterarPasswordSchema` estava escrito em `packages/shared` desde a Fase 3 e nunca fora ligado a
rota nenhuma. Sem isto, a unica forma de mudar a palavra-passe de uma conta era correr
`seed:admin` a partir da linha de comandos - o que nao serve para um colaborador.

- [x] `auth.service.alterarPassword`: exige a actual, recusa repetir a actual, termina as sessoes
- [x] `POST /api/auth/change-password`, autenticada e sob o limite das credenciais
- [x] `ModalPassword.tsx`, aberto pelo nome da pessoa no rodape do menu lateral
- [x] `tests/password.test.ts`, 7 testes

### O defeito que os testes apanharam

A primeira versao revogava as sessoes com `revogarTodas`, que **marca** os tokens. Mas um token
marcado e uma armadilha: `renovar` le a sua reapresentacao como copia roubada e derruba todas as
sessoes da conta. Resultado - mudar a palavra-passe e ser expulso mal outro separador tentasse
renovar, porque esse separador armava a armadilha e levava a sessao nova com ele.

Distinguem-se agora os dois casos:
- `revogarTodas` - suspeita. Marca, e a marca serve de armadilha. Usada na deteccao de reutilizacao.
- `removerSessoes` - queda intencional. Apaga, e o cookie antigo apenas nao encontra nada.

O teste que falhou foi `altera, devolve sessao nova e derruba a antiga`, na assercao de que o
cookie novo continua a servir depois de o antigo ter sido recusado.

### Comportamento

Alterar a palavra-passe termina as sessoes em todos os outros dispositivos e mantem a deste. Se a
palavra-passe estava comprometida, deixar as outras vivas tornaria a mudanca inutil.

## Verificacao

```
pnpm db:up && pnpm tables && pnpm seed
pnpm --filter @nexora/shared test   # 51 testes
pnpm --filter @nexora/api test      # 48 de integracao (23 dominio, 18 isolamento, 7 palavra-passe)
pnpm typecheck                      # limpo nos tres pacotes
pnpm build                          # shared, api e web
```

Os testes de integracao cobrem os casos que decidem: fechar tarefa sem relatorio da 422; fechar
por mudanca de estado da 422 e diz qual e o caminho certo; so o responsavel fecha a sua tarefa;
a Colaboradora recebe 404 num projecto alheio e 403 na tabela de acessos; o roteiro reencadeia
com dois dias entre fases; "Repor plano original" devolve as datas semeadas.

## Fase 18 - Profissionalizar sem complicar

O produto ja tinha o eixo certo. Esta ronda fechou furos de isolamento nas escritas, ciclos de UI
a meio, entrada (recuperar palavra-passe) e o minimo de operacao que uma casa seria exige.

### Isolamento nas escritas

- `exigirMembroDaEmpresa` vive em `access.ts` e e usado em membros, tarefas e convites
- `actualizarMembro` / `reenviarConvite` filtram por `organization_id`; departamento via taxonomia
- `reports.decidir` exige empresa e gestao do projecto
- Painel: fases so da carteira visivel; decisoes so com validacao `a_espera` / `escalado`
- Toda conclusao exige mini relatorio (o toggle `exigeRelatorio` saiu)
- Casos novos em `isolamento.test.ts`: PATCH/reconvidar membro alheio, projecto alheio no convite,
  responsavel alheio, validar relatorio alheio

### Ciclos de produto

- Ficha de membro em criar/editar, com desactivar/reactivar
- Pedidos de prorrogacao no painel, com Aceitar / Recusar
- Observacao ao validar / obrigatória ao escalar
- `CampoData` no pedido de prorrogacao

### Entrada e operacao

- Recuperacao de palavra-passe: token hashado, 1 hora, rate-limit, `/recuperar`
- `GET /api/health` toca na base (503 se falhar)
- JWT de exemplo recusado em `NODE_ENV=production`
- CI: typecheck + shared + isolamento + password, com Postgres de servico, sem seed
- `README.md` de operacao; rotulos novos em `apps/web/src/i18n/pt.ts`

### Carteira, vocabulario e cliente

- `GET /api/projects/export` — CSV UTF-8 da carteira visivel
- Reordenar vocabulario por arrasto (`PATCH /organizations/me/taxonomies/ordem`)
- Retencao de `audit_log` a 24 meses, no cron das 03:30
- Error boundary + toast em erros de consulta; sessao expirada limpa utilizador e cache
- Inbox de avisos na sidebar
- `LIMIT 200` nas listagens; `X-Request-Id` no log HTTP; rate-limit no refresh
- `pnpm tables` e so `migrate`; o campo morto `pnpm.onlyBuiltDependencies` saiu

## Fase 19 - Deploy da SPA

- [x] `.github/workflows/deploy-web.yml`: build pnpm (shared + web), artefacto, SSH para o
      document root de `projects.get.co.mz`, smoke em `/`, `/entrar`, `/recuperar`
- [x] `apps/web/public/.htaccess`: reescreve rotas do React; proxia `/api` para
      `127.0.0.1:3020` (PM2 `voneka-api`)
- [x] `docs/deploy-web.md`: secrets, mesma origem, porta 3020 e arranque PM2

## Fase 20 - API no mesmo alojamento

- [x] Processo Node fora do document root (`/home/voneka/voneka-projectos`)
- [x] Escuta so em `127.0.0.1:3020` em producao; Apache expoe `/api`
- [x] `ecosystem.config.cjs` + `.env` de producao (JWT proprios, `WEB_ORIGIN` do portal)
- [x] `GET /api/health` e `POST /api/auth/register-company` devolvem JSON (ja nao HTML da SPA)
- [ ] Pooler do Supabase recusa o tenant (`ENOTFOUND tenant/user`). Sem base, criar
      empresa responde erro de base, nao cria a conta. Retomar ou criar o projecto
      no painel e actualizar `apps/api/.env` no servidor.

## Fase 21 - API no Render, web no Vercel

So no repositorio pessoal. O deploy do cPanel continua igual.

- [x] `HOST` sobrepoe o `127.0.0.1` de producao da Fase 20: o Render so encontra a porta em
      `0.0.0.0`. Sem `HOST`, o cPanel continua a escutar so em localhost (provado nos dois modos)

- [x] `apps/api/build.mjs`: bundle esbuild de `server.ts` e `db/migrate.ts`, com o `shared`
      embutido e as dependencias em `node_modules`. `build` = typecheck + bundle
- [x] `migrate:prod` corre as migracoes a partir do bundle, sem `tsx`
- [x] `TRUST_PROXY_HOPS` (por omissao 1). Vercel + Render sao 2
- [x] `render.yaml`, `apps/web/vercel.json` (reencaminha `/api`, SPA, sem cache na CDN),
      `packageManager` na raiz, `docs/deploy-render-vercel.md`

Causa do erro no Render: `tsc` com `moduleResolution: Bundler` emite `import './app'` sem
extensao, e o `shared` e `.ts` cru. Nenhum dos dois arranca em Node.

**Prova** (Postgres local): `node dist/db/migrate.js` aplica as migracoes; `node dist/server.js`
responde 200 em `/api/health` e 401 no login com `RateLimit` activo. Com `X-Forwarded-For` de dois
clientes atras do mesmo proxy, `TRUST_PROXY_HOPS=1` da contagens 19/18 (limite partilhado) e `2`
da 19/19. `pnpm typecheck` limpo, 56 testes da API e 51 do shared a passar, web compila.

API no ar em `https://voneka-projectos.onrender.com` (`/api/health` 200). `apps/web/vercel.json`
reencaminha `/api` para la.

## Fase 22 - Acesso sem email, menu e avisos

Sem SMTP, "enviar convite por email" so escrevia a ligacao no log do Render: ninguem entrava.

- [x] `criarMembroSchema.acesso`: `ligacao` | `password` | `nenhum` (sai `enviarConvite`)
- [x] A ligacao de convite volta sempre ao Administrador; com SMTP segue tambem por email
- [x] Palavra-passe temporaria gerada pelo sistema (16 caracteres, sem 0/O/1/l/I), mostrada uma vez
- [x] `users.deve_mudar_password` (migracao 0002) e `tmp` no access token. `autenticar` recusa
      com 403 `PASSWORD_TEMPORARIA`; so `/auth/me` e `/auth/change-password` aceitam a sessao
- [x] `POST /api/users/:id/temporary-password`: repor acesso; apaga as sessoes do alvo; nunca
      na propria conta
- [x] Corrigida fuga latente: criar membro devolvia a linha inteira, com `passwordHash`
- [x] `ModalAcessoCriado`: copiar, mensagem pronta, WhatsApp. `DefinirPassword` substitui o
      portal ate a troca. A tabela de Equipa abre a ficha, onde vivem as accoes de acesso
- [x] Botao de recolher na fronteira entre menu e pagina, a altura do cabecalho
- [x] `/avisos` com pagina propria, agrupada por dia, "Por ler"/"Todos"; `InboxAvisos` saiu

**Prova**: 68 testes da API (novo `tests/acesso.test.ts`, caso novo em `isolamento.test.ts`),
typecheck e build limpos. Percurso no browser (Playwright): criar membro com temporaria, entrar
noutra janela, troca obrigatoria, portal abre e sobrevive a recarregar; ligacao gerada; avisos
de uma colaboradora; menu recolhido e expandido; gaveta no telemovel sem o botao da fronteira.

## Fase 23 - Telemovel e tablet

Auditoria com Playwright a 390 e 820px: o Painel tinha 613px num ecra de 390, a carteira era uma
tabela cortada, as tarefas tinham duas colunas fixas, o roteiro 722px de barra de ferramentas.

- [x] Tres faixas, tres navegacoes (`Layout.tsx`): amplo com barra lateral; tablet com o menu
      sempre em icones, que abre por cima do conteudo; telemovel com `BarraInferior` (4 destinos
      + "Mais" para a gaveta) e a accao principal como botao flutuante
- [x] `lib/navegacao.ts`: destinos partilhados pelos dois menus
- [x] `useLarguraDe` (`lib/ecra.ts`): o formato das listas decide-se pela largura do contentor e
      nao da janela - a 1024px com o menu aberto o conteudo tem a largura de um tablet
- [x] Projectos e Tarefas: tabela, tabela compacta ou cartoes, conforme a largura
- [x] Painel, Os meus projectos/relatorios, Relatorios, Vocabulario, gaveta do projecto, modais:
      reorganizados com primitivas em `styles.css` (`vn-foco`, `vn-kpis`, `vn-linha-item`,
      `vn-grelha-duas`, `vn-grelha-cartoes`, `vn-filtros`, `vn-cartao-topo`, `vn-factos`)
- [x] Roteiro: abre na semana no telemovel; gantt com largura minima por escala, a deslizar
      dentro do cartao com a coluna de nomes fixa
- [x] Dialogos acima da barra inferior e do botao flutuante (`CAMADA_DIALOGO`)

Defeitos encontrados pelo caminho:
- **Tarefas e Relatorios da Direccao sempre vazios**: `z.coerce.boolean()` lia `?minhas=false`
  como verdadeiro. `zBooleanoQuery` em `common.schema.ts`, tambem em `incluirArquivadas`
- **Enumeracao de emails pelo tempo do login**: o hash das contas inexistentes era invalido e o
  bcrypt respondia em 0ms contra ~400ms. Passa a hash real, gerado uma vez
- **Refresh sob o limite do login**: cada abertura da aplicacao gastava uma das 20 tentativas por
  IP. Limite proprio de 300 / 15 min

**Prova**: sem elementos fora da largura (medido) a 360, 390, 820 e 1440px, Direccao e
Colaborador, com gaveta, modais e editor de fases abertos; 1440px sem regressao. 54 testes do
shared, 71 da API (novos `limites`, `tempo-login`, `booleano-query`), typecheck e build limpos.

## Por fazer

- Politica de SMTP real (hoje a ligacao vai para o log quando nao ha servidor)
- Digest semanal por email, depois de o ciclo de validacao estar fechado
- Tema escuro, segundo idioma, ESLint/Prettier/Husky, Sentry
