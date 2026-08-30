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

## Glifos Unicode nao servem de icones
`◱ ▤ ▭ ✓ ✎ ◍ ≡ ⌂` a 12px dependiam da fonte instalada e, com o menu recolhido, `▭` e `▤` eram
indistinguiveis - e recolhido o icone e a unica informacao que resta. Icones de navegacao sao SVG
proprios, a traco, com `currentColor`, e testam-se no estado mais pobre em que vao aparecer.
