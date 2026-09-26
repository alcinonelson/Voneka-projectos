# lessons

Padroes a nao repetir. Actualizado depois de cada correccao do utilizador.

## Ambito da familia NEXORA
`NEXORA.dc.html`, `NEXORA Landing.dc.html` e as versoes `v1`/`v2` pertencem ao primeiro produto
(gestao de despesas) ou sao versoes preservadas. Trabalho no Projectos nunca os altera.

## O design e especificacao, nao inspiracao
As regras de negocio ja estao escritas em `NEXORA Projectos.dc.html`. Portar, nao reinventar.
Antes de escrever uma regra de prazo, de fase ou de cor, procurar a funcao correspondente no
bloco `data-dc-script`. Divergencia visual face ao design e defeito.

## O mini relatorio e o produto
Fechar tarefa que exige relatorio sem relatorio valido tem de falhar no servidor, dentro de uma
transaccao. Validar apenas no formulario esvazia o eixo do produto.

## Supabase: ligacao directa e so IPv6
`db.<ref>.supabase.co` resolve apenas AAAA. Em maquinas sem rota IPv6 da `ENOTFOUND`, que parece
DNS partido mas nao e. A ligacao IPv4 e o pooler:
`postgresql://postgres.<ref>:<PASSWORD>@aws-1-<regiao>.pooler.supabase.com:5432/postgres`.
Neste projecto a regiao e `aws-1-eu-west-1`. Distinguir os dois erros poupa tempo: erro de rede
significa host errado, `password authentication failed` significa host certo e credencial errada.

## Verificar marcadores em segredos colados
Uma connection string colada do painel costuma vir com `[YOUR-PASSWORD]` por substituir. Antes de
diagnosticar a rede, confirmar se a password e um marcador - comprimento, `[`, `]` - sem a
imprimir.

## Heredocs longos em Bash no Windows
Ficheiros grandes escritos por `cat <<EOF` ou por heredoc de Python partem-se com erro de quoting
acima de alguns milhares de caracteres. Ate cerca de 3 KB funciona; acima disso, usar a ferramenta
Write.

## Enum fechado que passa a lista aberta: cuidado com o `switch` sem `default`
`corNatureza` e `corEstagio` eram `switch` exaustivos sobre uma union fechada, sem ramo `default`.
O TypeScript aceitava-os porque a union era fechada; no dia em que o vocabulario passou a ser
escrito por cada empresa, um valor desconhecido devolveria `undefined` e o ecra rebentava no
`.ponto` a meio de uma tabela. Regra: qualquer cor derivada de dados que o utilizador escreve
resolve-se por lookup com fallback (`chip(nome) ?? CHIPS.neutro`), nunca por `switch`. Os `switch`
ficam so para o que e logica do produto - saude, estado, situacao, nivel de acesso.

## Duas consultas nao se casam por indice
O Roteiro pedia a carteira numa consulta e as fases noutra, e depois juntava-as por posicao no
array (`consultas[i]`). Basta a carteira mudar de tamanho entre as duas para as fases aparecerem
no projecto errado, e a cascata de invalidacao podia abortar o refetch em curso. Quando duas
consultas descrevem a mesma coisa, a resposta vem indexada por identificador e junta-se por chave.

## Multi-empresa: `undefined` no WHERE e uma fuga, nao uma optimizacao
`projectosVisiveis` devolvia `undefined` para o Administrador, o que em Drizzle significa "sem
condicao". Com uma so empresa era "toda a carteira"; com varias passaria a ser "a carteira de toda
a gente". Uma funcao de ambito nunca devolve `undefined`: devolve sempre pelo menos a condicao de
empresa. O teste `tests/isolamento.test.ts` existe para apanhar exactamente isto.

## Guardar o nome de um chip, e nao um hex
As cores escolhidas pelo utilizador guardam o *nome* de um chip da paleta partilhada. Um hex livre
deixaria uma empresa produzir um par texto/fundo ilegivel, e tornaria impossivel redefinir a
paleta - por exemplo, para um tema escuro - sem reescrever dados.

## Heredocs em Bash no Windows: confirmado outra vez
Scripts Python longos passados por `python - <<'PY'` partem-se com `unexpected EOF` mal o conteudo
tenha aspas e acentos em quantidade. Acima de poucos KB, escrever o script para o scratchpad com a
ferramenta Write e depois `python ficheiro.py`.

## A shell do Windows estropia UTF-8 em `curl -d`
Um `curl -d '{"rotulo":"Fiscalização"}'` chegou ao servidor ja com os acentos partidos, e o codigo
gerado saiu `fiscaliza_o_de_obra`. O servidor estava certo - o teste com `Gestão da Mudança` passa.
Antes de diagnosticar um bug de acentos, verificar se o proprio pedido foi enviado intacto: usar um
script Python com `json.dumps(...).encode('utf-8')` em vez de `curl` na linha de comandos.

## `DROP SCHEMA public` nao chega para repor a base
O Drizzle guarda `__drizzle_migrations` no esquema `drizzle`, nao no `public`. Apagar so o
`public` deixa o jornal intacto, e o `migrate` diz "Migracoes aplicadas" sem criar tabela nenhuma -
um sucesso falso que so se descobre na primeira consulta. Repor a base a serio:
`DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`

## Um pipe esconde o codigo de saida dos testes
`npx vitest run | sed ... | grep -E "Tests "` devolve o estado do **grep**, nao do vitest. Uma suite
que falha a recolher aparece como `Tests 18 passed | 23 skipped` seguido de `exited with code 0`,
e passa por verde a quem so olhe para o codigo. Verificacao correcta: redireccionar para ficheiro
(`> saida.txt 2>&1`), imprimir `echo "exit=$?"` logo a seguir, e ler `Test Files` alem de `Tests`.
"Skipped" nunca e "passed": uma suite saltada nao provou coisa nenhuma.

## Os testes de dominio dependem do seed de demonstracao
`tests/api.test.ts` entra com `alcino.maido@nexora.co.mz`, que so existe depois de `pnpm seed`.
Repor a base ou correr `seed:admin` sozinho deixa esses 23 testes a saltar em silencio. Ordem certa
em local: `pnpm db:up`, `pnpm tables`, `pnpm seed`, e so entao `pnpm test`.
`tests/isolamento.test.ts` nao tem esta dependencia - constroi as suas proprias empresas.

## Revogar e apagar uma sessao nao sao a mesma coisa
Marcar um refresh token como revogado transforma-o numa armadilha: `renovar` interpreta a sua
reapresentacao como copia roubada e derruba **todas** as sessoes da conta, incluindo as acabadas de
criar. Isso e o correcto para uma rotacao suspeita, e errado para uma queda intencional. Ao mudar a
palavra-passe, os tokens antigos sao **apagados** (`removerSessoes`), nao marcados - caso contrario
o separador que ainda tivesse o cookie antigo derrubava, ao renovar, a sessao de quem acabou de
mudar a palavra-passe. Regra: `revogarTodas` para suspeita, `removerSessoes` para desligar de
propria vontade.

## Nao inventar identidade de marca
Desenhei um simbolo "V" para a Voneka e assumi-o como a marca. A marca existia - um galao
facetado em `https://www.voneka.co.mz/`, com verde `#65BE70`, turquesa `#179E92` e verde palido
`#E4F0CF`. Antes de desenhar identidade, perguntar onde ela esta; um logotipo inventado parece
trabalho feito e e trabalho a deitar fora. Quando existir um ficheiro oficial, os vertices
extraem-se por amostragem de pixeis e nao a olho.

## Cor de marca nao e cor de texto
`#65BE70` sobre branco da 2.29:1 e `#179E92` da 3.31:1 - ambos abaixo dos 4.5:1 de texto. Uma
paleta de marca precisa quase sempre de variantes escuras so para texto (`#155D48` a 7.80:1,
`#0E7A70` a 5.20:1). Medir antes de aplicar, nunca depois de o ecra estar montado.

## Cromo e dados sao dois sistemas de cor
Quando a cor da casa passou a verde, houve o risco de o verde da marca se confundir com o verde
semantico de "no prazo" e "sem obstaculos". A regra que ficou: as cores da marca vestem o cromo -
menu, marca, estados activos, ligacoes - e as cores semanticas ficam intocadas nos dados. Se a cor
da casa fosse a mesma que a de "esta tudo bem", deixava de se saber qual delas estava a falar.

## `prefers-reduced-motion` que anula tudo esconde conteudo
O bloco global punha `animation-duration: 0.01ms !important` em tudo. Com revelacoes ao rolar isso
e catastrofico: o elemento comeca a `opacity: 0` e a animacao que o traria de volta nunca corre -
quem pediu menos movimento ficava com metade da pagina em branco. O bloco passa a repor
`opacity: 1; transform: none` nas classes de revelacao. Menos movimento significa parado, nao
invisivel.

## A API nao vive no document root
A SPA e `/home/voneka/public_html/projects.get.co.mz`. A API e
`/home/voneka/apps/projects.get.co.mz`. Meter o processo Node (e o `.env`)
dentro do document root e expo-lo ao Apache. O nome do dominio no caminho da
API e o que a liga ao produto; a pasta publica e so a pele.

## Agregado sem empresa e fuga, mesmo "so numeros"
`tipologiaDaSemana` saltava o WHERE para o Administrador. Um agregado de
contagens tambem e dado de outra casa. Qualquer `group by` novo passa por
`projectosVisiveis` e por um caso em `isolamento.test.ts`.

## `/api` a devolver HTML nao e a API a falhar o JSON
O cliente trata qualquer corpo que nao seja JSON como
«O servidor não respondeu como esperado.» No Apache, `RewriteRule ^api - [L]`
nao impede a regra da SPA: em contexto de directorio o `[L]` reinicia o motor,
`/api` nao e ficheiro, e o vhost serve `index.html`. Sem o processo Node (PM2
`voneka-api` na porta 3020) criar empresa e entrar falham assim. A regra certa
e o proxy `[P]` para `127.0.0.1:PORT`, no mesmo padrao da Mobility, *antes* da
reescrita para `index.html`.

## Glifos Unicode nao servem de icones
`◱ ▤ ▭ ✓ ✎ ◍ ≡ ⌂` a 12px dependiam da fonte instalada e, com o menu recolhido, `▭` e `▤` eram
indistinguiveis - e recolhido o icone e a unica informacao que resta. Icones de navegacao sao SVG
proprios, a traco, com `currentColor`, e testam-se no estado mais pobre em que vao aparecer.

## Largura minima e a confissao de que nao se fez responsividade
`Layout` tinha `minWidth: 1180` com `overflowX: auto` por cima: abaixo disso a aplicacao inteira -
menu, cabecalho e conteudo - deslizava como uma peca so, e havia uma vista alternativa a substituir
tudo em ecra pequeno. Uma largura minima numa aplicacao web e quase sempre isto: o adiar da
reorganizacao, com uma saida de emergencia que acaba por servir mal toda a gente.

## Somar as colunas antes de as declarar
A tabela de Equipa pedia 830px de colunas fixas mais 98 de espacamento e 40 de padding - 968px -
dentro dos 888px que a pagina tinha. Como o cartao levava `overflow: hidden`, as ultimas colunas
eram cortadas em silencio: nem cabiam, nem havia barra para as alcancar. Ao declarar uma grelha de
larguras fixas, somar e comparar com a largura util; e usar `minmax(0, …)`, sem o qual o conteudo
longo alarga a coluna para la do que foi declarado.

## Eventos de rato deixam metade dos dispositivos de fora
O Roteiro registava `mousemove`/`mouseup` e so respondia a `onMouseDown`. Num tablet o gantt
aparecia e nao se arrastava - existia sem funcionar, que e pior do que nao existir. Eventos de
ponteiro cobrem rato, dedo e caneta com o mesmo codigo. E um alvo de 8px de largura nao se acerta
com o dedo: o traco desenhado pode ser fino, o alvo tem de ser largo.

## Um seletor de atributo com `!important` e uma rede que apanha o que nao devia
Escrevi `[style*='grid-template-columns'] { grid-template-columns: 1fr !important }` para empilhar
os campos dos modais no telemovel. Apanhava tambem as linhas do editor de fases, que tem de
continuar horizontais. Quando o alvo e um conjunto especifico de elementos, a resposta e uma
classe, e nao um selector que adivinha pela aparencia do atributo.

## `tsc` com `moduleResolution: Bundler` nao produz JS que o Node execute
O build da API era `tsc` e o `start` era `node dist/server.js`. Em desenvolvimento o `tsx` escondia
dois defeitos que o Render expos: os imports relativos saem sem extensao (`./app`), que o Node em
ESM recusa com `ERR_MODULE_NOT_FOUND`, e o `@nexora/shared` entrega `.ts` cru. Um typecheck limpo
nao prova que o resultado arranca. A API e agora empacotada com esbuild (`apps/api/build.mjs`) e o
build so conta como verificado quando `node dist/server.js` responde em `/api/health`.

## O numero de proxies de confianca decide quem partilha o rate limit
Com a web no Vercel a reencaminhar `/api` para o Render, o pedido atravessa dois proxies. Com
`trust proxy = 1`, o `req.ip` passa a ser o IP do Vercel, e todos os utilizadores partilham as 20
tentativas de login. Ao mudar a topologia de alojamento, rever `TRUST_PROXY_HOPS` e prova-lo com dois
`X-Forwarded-For` diferentes: as contagens de `RateLimit` tem de ser independentes.

## Fixar o pnpm: uma so fonte, e sem `corepack enable` no Render
Acrescentei `packageManager: pnpm@10.32.1` a raiz sem procurar quem mais fixava a versao. Os
workflows tinham `pnpm/action-setup` com `version: 10`, e a action recusa arrancar com duas fontes.
No Render, `corepack enable` falha com `EROFS` ao tentar substituir `/usr/bin/pnpm`, que e so de
leitura; o pnpm da imagem ja respeita o `packageManager`. Antes de fixar uma versao, procurar nos
`.github/workflows` e na configuracao de cada alojamento quem a fixa tambem, e nao escrever comandos
de build para uma plataforma sem confirmar na documentacao dela o que ja vem instalado.

## Uma accao que depende de infraestrutura opcional nao pode fingir que correu
"Criar conta e convidar" dizia "convite enviado" com o SMTP por configurar; o servidor escrevia a
ligacao no log e a pessoa nunca a recebia. Quando uma accao depende de algo que pode faltar -
email, fila, servico externo - o resultado tem de voltar a quem a pediu por um caminho que
existe sempre (aqui, a ligacao na resposta), e o interface diz o que de facto aconteceu.

## Migracao escrita a mao sem snapshot envenena o proximo `generate`
A `0001` foi escrita a mao e nao deixou `meta/0001_snapshot.json`. O `drizzle-kit generate`
seguinte comparou com a `0000` e voltou a criar as colunas da `0001`, o que falharia ao aplicar.
Ler sempre o SQL gerado antes de o aceitar; ao escrever uma migracao a mao, gerar tambem o
snapshot (ou gerar pela ferramenta e editar so o SQL).

## Estilo em linha vence a media query
Tres vezes na mesma ronda: o rodape do modal com `flex: 1` na nota, o cabecalho do cartao com
`alignItems: 'center'`, a gaveta com `padding` em linha. A media query estava certa e nao fazia
nada, porque o estilo em linha ganha a qualquer seletor. Regra: uma propriedade que muda com a
largura do ecra vive na classe, nunca no `style`. O `!important` so como remendo documentado.

## `z.coerce.boolean()` numa query string e um defeito a espera
`Boolean('false')` e verdadeiro. `?minhas=false` devolvia so as tarefas de quem pedia, e a
Direccao via "Tarefas" e "Relatorios" vazios sem erro nenhum. Booleanos de query usam
`zBooleanoQuery`; e um ecra vazio numa conta com dados e sempre de verificar na API com curl.

## O hash "falso" do login tem de ser um hash verdadeiro
Um sal de zeros escrito a mao e invalido: o bcrypt recusa-o em 0ms, e o tempo de resposta passa
a dizer quais os emails registados. O hash para contas inexistentes gera-se com o mesmo custo dos
reais, e um teste mede a diferenca de tempo.

## Decidir o formato pela janela engana com o menu aberto
A 1024px com o menu lateral aberto o conteudo tem ~730px, a largura de um tablet. Tabelas e
listas decidem o formato pela largura do proprio contentor (`useLarguraDe`), nao da janela.
