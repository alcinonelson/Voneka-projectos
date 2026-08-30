import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COR, FONTE, MARCA, PESO, RAIO, numerico } from '../design/tokens';
import { MarcaCompleta } from '../components/base';
import { RoteiroDemo } from '../components/RoteiroDemo';
import { menosMovimento, useRevelar } from '../lib/revelar';

/**
 * Pagina publica.
 *
 * O heroi nao e um numero grande nem uma imagem do painel: e um mini relatorio, composto como
 * documento e escrito a vista. E a tese do produto posta a vista - o avanco de um projecto le-se
 * no que alguem escreveu, com data e assinatura, e nao numa percentagem que alguem estimou.
 *
 * O movimento serve o argumento e nao se serve a si proprio: o relatorio escreve-se porque a
 * escrita e o produto; os cinco escaloes de prazo entram em cascata porque a escalada e o que se
 * quer demonstrar; e o roteiro arrasta-se porque nenhuma frase convence tao bem como puxar uma
 * barra e ver as outras irem atras.
 */

const LARGURA_MAX = 1080;

/** Os cinco escaloes de prazo, com as cores que o produto usa a serio. */
const ESCALOES = [
  { texto: 'Faltam 4 dias', fg: COR.texto, bg: COR.linha },
  { texto: 'Vence amanhã', fg: COR.ambar, bg: COR.ambarFundo },
  { texto: 'Vence hoje', fg: COR.vermelho, bg: COR.vermelhoFundo },
  { texto: '2 dias em atraso', fg: COR.branco, bg: COR.vermelhoCheio },
  { texto: '11 dias em atraso', fg: COR.branco, bg: COR.tinta },
];

const NIVEIS = [
  {
    nome: 'Administrador',
    ve: 'Toda a carteira da empresa',
    faz: 'Define a empresa, o vocabulário e os acessos. Valida relatórios de qualquer projecto.',
    cor: MARCA.verdeTexto,
  },
  {
    nome: 'Gestor de projecto',
    ve: 'Os projectos por que responde',
    faz: 'Define o roteiro, atribui tarefas e valida os relatórios da sua equipa.',
    cor: MARCA.turquesaTexto,
  },
  {
    nome: 'Colaborador',
    ve: 'Apenas as suas tarefas',
    faz: 'Fecha o que lhe foi atribuído e escreve o mini relatório que fecha a tarefa.',
    cor: COR.textoSuave,
  },
];

/** Envolve uma secção e revela-a quando ela entra no ecrã. */
function Revelar({ children, atraso = 0 }: { children: ReactNode; atraso?: number }) {
  const { referencia, visivel } = useRevelar<HTMLDivElement>();
  return (
    <div
      ref={referencia}
      className="vn-revelar"
      data-visivel={visivel ? 'sim' : 'nao'}
      style={{ transitionDelay: `${atraso}ms` }}
    >
      {children}
    </div>
  );
}

function Rotulo({ children, cor = MARCA.verde }: { children: string; cor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
      <span aria-hidden="true" style={{ width: 18, height: 2, borderRadius: 1, background: cor }} />
      <span
        style={{
          fontSize: FONTE.minima,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: COR.textoSuave,
          fontWeight: PESO.medio,
        }}
      >
        {children}
      </span>
    </div>
  );
}

function Botao({
  para,
  children,
  principal = false,
}: {
  para: string;
  children: string;
  principal?: boolean;
}) {
  return (
    <Link
      to={para}
      className="vn-botao"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 44,
        padding: '0 22px',
        borderRadius: RAIO.botao,
        fontSize: FONTE.base,
        fontWeight: PESO.medio,
        textDecoration: 'none',
        background: principal ? MARCA.verdeTexto : COR.branco,
        color: principal ? COR.branco : MARCA.verdeTexto,
        border: `1px solid ${principal ? MARCA.verdeTexto : COR.bordaForte}`,
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Um numero que sobe quando entra no ecra.
 * Sobe em cerca de um segundo e para no valor certo; com movimento reduzido, mostra o valor.
 */
function Contador({ ate, sufixo = '' }: { ate: number; sufixo?: string }) {
  const { referencia, visivel } = useRevelar<HTMLSpanElement>();
  const [valor, setValor] = useState(() => (menosMovimento() ? ate : 0));
  const corrido = useRef(false);

  useEffect(() => {
    if (!visivel || corrido.current || menosMovimento()) return;
    corrido.current = true;

    const inicio = performance.now();
    const duracao = 950;
    let quadro = 0;

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      // Desacelera no fim, para o numero assentar em vez de bater.
      setValor(Math.round(ate * (1 - (1 - t) ** 3)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [visivel, ate]);

  return (
    <span ref={referencia} style={numerico}>
      {valor}
      {sufixo}
    </span>
  );
}

/**
 * O relatorio do heroi.
 *
 * E um exemplo, mas escrito como um relatorio a serio seria: diz o que ficou feito, o que ficou
 * por fazer, e de quem depende. Um exemplo vago aqui prometeria um produto vago.
 */
function CartaoRelatorio() {
  const linhas = [
    'Fizemos a migração das contas a receber e conferimos os saldos de Julho.',
    'Faltam as contas a pagar: a listagem que a Contabilidade enviou vem sem o número de documento, e sem esse número não é possível conciliar.',
    'Pedi a listagem corrigida na quinta-feira. Enquanto não chegar, esta tarefa não avança.',
  ];

  return (
    <figure
      className="vn-cartao"
      style={{
        margin: 0,
        background: COR.branco,
        border: `1px solid ${COR.borda}`,
        borderRadius: RAIO.cartao,
        padding: '26px 28px 22px',
        boxShadow: '0 1px 2px rgba(14,46,35,.04), 0 16px 40px -20px rgba(14,46,35,.22)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingBottom: 16,
          borderBottom: `1px solid ${COR.linha}`,
          marginBottom: 18,
        }}
      >
        <span
          style={{
            fontSize: FONTE.minima,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: COR.suave,
            fontWeight: PESO.medio,
          }}
        >
          Mini relatório
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: FONTE.nota,
            fontWeight: PESO.forte,
            color: COR.ambar,
            background: COR.ambarFundo,
            padding: '4px 9px',
            borderRadius: RAIO.botao,
          }}
        >
          Com obstáculo
        </span>
      </div>

      <blockquote
        className="vn-display"
        style={{ margin: 0, fontSize: 21, lineHeight: 1.5, color: COR.tinta, letterSpacing: 0 }}
      >
        {linhas.map((linha, i) => (
          <p
            key={linha}
            className="vn-linha"
            style={{ margin: i === 0 ? 0 : '14px 0 0', animationDelay: `${0.35 + i * 0.75}s` }}
          >
            {linha}
            {i === linhas.length - 1 ? <span className="vn-cursor" aria-hidden="true" /> : null}
          </p>
        ))}
      </blockquote>

      <figcaption
        style={{
          marginTop: 22,
          paddingTop: 16,
          borderTop: `1px solid ${COR.linha}`,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
          fontSize: FONTE.nota,
          color: COR.textoSuave,
        }}
      >
        <span style={{ fontWeight: PESO.medio, color: COR.tinta }}>Migrar contabilidade analítica</span>
        <span style={{ color: COR.suave }}>·</span>
        <span>Sara Nhaca</span>
        <span style={{ color: COR.suave }}>·</span>
        <span style={numerico}>29 Ago, 16:40</span>
        <span style={{ marginLeft: 'auto', color: COR.suave, ...numerico }}>7 h reais / 6 h estimadas</span>
      </figcaption>
    </figure>
  );
}

export function Landing() {
  const cascata = useRevelar<HTMLDivElement>();

  return (
    <div className="vn-publica" style={{ background: COR.fundo, minHeight: '100vh' }}>
      <header style={{ borderBottom: `1px solid ${COR.borda}`, background: COR.branco }}>
        <div
          style={{
            maxWidth: LARGURA_MAX,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <MarcaCompleta tamanho={30} />
          <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Botao para="/entrar">Entrar</Botao>
            <Botao para="/criar-empresa" principal>
              Criar a minha empresa
            </Botao>
          </nav>
        </div>
      </header>

      <main>
        {/* Heroi: o argumento a esquerda, a prova a direita. */}
        <section style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '72px 24px 84px' }}>
          <div className="vn-heroi">
            <div>
              <Rotulo>O follow-up à Direcção</Rotulo>
              <h1
                style={{
                  margin: 0,
                  fontSize: 46,
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  fontWeight: PESO.forte,
                  color: COR.tinta,
                }}
              >
                Um projecto não avança
                <br />
                porque alguém escreveu{' '}
                <span style={{ color: MARCA.verdeTexto }}>70%</span>.
              </h1>
              <p
                style={{
                  margin: '22px 0 0',
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: COR.texto,
                  maxWidth: '46ch',
                }}
              >
                No Voneka, fechar uma tarefa exige escrever o que ficou feito, o que ficou por
                fazer e de quem depende. O servidor recusa o fecho sem esse texto — não é uma
                convenção de equipa, é uma regra do sistema.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 30, flexWrap: 'wrap' }}>
                <Botao para="/criar-empresa" principal>
                  Criar a minha empresa
                </Botao>
                <Botao para="/entrar">Já tenho conta</Botao>
              </div>
            </div>

            <CartaoRelatorio />
          </div>
        </section>

        {/* O que muda. Tres coisas nomeadas, sem numeracao: nao sao uma sequencia. */}
        <section style={{ background: COR.branco, borderTop: `1px solid ${COR.borda}` }}>
          <div style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '64px 24px' }}>
            <Revelar>
              <Rotulo>O que muda no dia a dia</Rotulo>
              <div className="vn-tres" style={{ marginTop: 26 }}>
                {[
                  {
                    titulo: 'A percentagem deixa de ser a resposta',
                    texto:
                      'O avanço continua lá, declarado por quem gere. Mas o que a Direcção lê é o relatório: quem entregou, o que travou, e o que falta decidir.',
                    cor: MARCA.verde,
                  },
                  {
                    titulo: 'O roteiro replaneia-se ao arrastar',
                    texto:
                      'Arraste uma fase e as datas reencadeiam-se à frente dos seus olhos. O plano original fica guardado à parte, para poder voltar a ele.',
                    cor: MARCA.turquesa,
                  },
                  {
                    titulo: 'Cada empresa usa as suas palavras',
                    texto:
                      'As naturezas de projecto, os estágios e os departamentos são escritos por si. O sistema não lhe impõe um vocabulário que não é o seu.',
                    cor: COR.ambarVivo,
                  },
                ].map((bloco) => (
                  <article
                    key={bloco.titulo}
                    className="vn-cartao"
                    style={{
                      border: `1px solid ${COR.borda}`,
                      borderRadius: RAIO.cartao,
                      padding: '22px 20px',
                      background: COR.branco,
                    }}
                  >
                    <div style={{ height: 3, width: 36, background: bloco.cor, borderRadius: 2, marginBottom: 16 }} />
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 17,
                        fontWeight: PESO.forte,
                        letterSpacing: '-0.01em',
                        color: COR.tinta,
                        lineHeight: 1.35,
                      }}
                    >
                      {bloco.titulo}
                    </h2>
                    <p style={{ margin: '10px 0 0', fontSize: FONTE.base, lineHeight: 1.65, color: COR.texto }}>
                      {bloco.texto}
                    </p>
                  </article>
                ))}
              </div>
            </Revelar>
          </div>
        </section>

        {/* O roteiro, para experimentar. */}
        <section style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '64px 24px' }}>
          <Revelar>
            <div className="vn-duas" style={{ alignItems: 'center' }}>
              <div>
                <Rotulo cor={MARCA.turquesa}>Replanear é arrastar</Rotulo>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 27,
                    fontWeight: PESO.forte,
                    letterSpacing: '-0.02em',
                    color: COR.tinta,
                    lineHeight: 1.25,
                  }}
                >
                  Puxe uma fase e veja as outras acompanharem.
                </h2>
                <p
                  style={{
                    margin: '16px 0 0',
                    fontSize: FONTE.base,
                    lineHeight: 1.7,
                    color: COR.texto,
                    maxWidth: '42ch',
                  }}
                >
                  Uma fase de N semanas ocupa <strong>N × 7 − 2</strong> dias, e a seguinte começa
                  dois dias depois de a anterior acabar. É a mesma regra que corre no servidor —
                  aqui está a funcionar de verdade, não é uma ilustração.
                </p>
              </div>
              <RoteiroDemo />
            </div>
          </Revelar>
        </section>

        {/* Os prazos. Conteudo verdadeiro do dominio, nas cores verdadeiras, em cascata. */}
        <section style={{ background: COR.branco, borderTop: `1px solid ${COR.borda}` }}>
          <div style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '64px 24px' }}>
            <div className="vn-duas" style={{ alignItems: 'start' }}>
              <Revelar>
                <Rotulo cor={COR.vermelhoVivo}>Os cinco escalões de prazo</Rotulo>
                <p
                  style={{ margin: 0, fontSize: FONTE.base, lineHeight: 1.7, color: COR.texto, maxWidth: '42ch' }}
                >
                  Um prazo não é apenas cumprido ou falhado. O Voneka distingue cinco estados e
                  muda de cor com a distância à data — a mesma escala no painel, na lista de
                  tarefas e no email de aviso da manhã.
                </p>
              </Revelar>

              <div
                ref={cascata.referencia}
                className="vn-cascata"
                data-visivel={cascata.visivel ? 'sim' : 'nao'}
                style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
              >
                {ESCALOES.map((e, i) => (
                  <span
                    key={e.texto}
                    style={{
                      animationDelay: `${i * 0.13}s`,
                      fontSize: FONTE.base,
                      fontWeight: PESO.forte,
                      padding: '9px 15px',
                      borderRadius: RAIO.botao,
                      color: e.fg,
                      background: e.bg,
                      ...numerico,
                    }}
                  >
                    {e.texto}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Os niveis de acesso sao mesmo uma tabela: quem ve o que. */}
        <section style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '64px 24px' }}>
          <Revelar>
            <Rotulo>Quem vê o quê</Rotulo>
            <div
              style={{
                border: `1px solid ${COR.borda}`,
                borderRadius: RAIO.cartao,
                overflow: 'hidden',
                marginTop: 22,
                background: COR.branco,
              }}
            >
              {NIVEIS.map((n, i) => (
                <div
                  key={n.nome}
                  className="vn-tres"
                  style={{
                    gridTemplateColumns: 'minmax(0,190px) minmax(0,220px) minmax(0,1fr)',
                    gap: 20,
                    alignItems: 'baseline',
                    padding: '18px 20px',
                    borderTop: i === 0 ? 'none' : `1px solid ${COR.linha}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: FONTE.base,
                      fontWeight: PESO.forte,
                      color: n.cor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 6, height: 6, borderRadius: 3, background: n.cor }}
                    />
                    {n.nome}
                  </span>
                  <span style={{ fontSize: FONTE.corpo, color: COR.textoSuave }}>{n.ve}</span>
                  <span style={{ fontSize: FONTE.corpo, color: COR.texto, lineHeight: 1.6 }}>{n.faz}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '16px 0 0', fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.6 }}>
              O limite é aplicado na base de dados e não apenas no ecrã: um colaborador não recebe
              um projecto que não é seu, mesmo forjando o pedido.
            </p>
          </Revelar>
        </section>

        {/* Numeros que sobem ao entrar no ecra. */}
        <section
          style={{
            background: MARCA.verdeEscuro,
            color: COR.branco,
          }}
        >
          <div style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '52px 24px' }}>
            <div className="vn-tres">
              {[
                { valor: 25, sufixo: '', rotulo: 'caracteres mínimos num mini relatório' },
                { valor: 5, sufixo: '', rotulo: 'escalões de prazo, do sereno ao atraso' },
                { valor: 3, sufixo: '', rotulo: 'níveis de acesso, aplicados na base de dados' },
              ].map((n) => (
                <div key={n.rotulo}>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: PESO.forte,
                      letterSpacing: '-0.03em',
                      color: MARCA.verde,
                      lineHeight: 1,
                    }}
                  >
                    <Contador ate={n.valor} sufixo={n.sufixo} />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: FONTE.corpo,
                      color: 'rgba(255,255,255,.62)',
                      lineHeight: 1.6,
                      maxWidth: '28ch',
                    }}
                  >
                    {n.rotulo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{ maxWidth: LARGURA_MAX, margin: '0 auto', padding: '72px 24px 96px', textAlign: 'center' }}
        >
          <Revelar>
            <h2
              className="vn-display"
              style={{ margin: 0, fontSize: 34, color: COR.tinta, letterSpacing: '-0.01em' }}
            >
              Comece por criar a sua empresa.
            </h2>
            <p
              style={{
                margin: '14px auto 26px',
                fontSize: FONTE.base,
                color: COR.texto,
                maxWidth: '48ch',
                lineHeight: 1.65,
              }}
            >
              Define o nome, como classifica o trabalho que faz, convida a equipa e regista o
              primeiro projecto. Depois disso o portal é seu.
            </p>
            <Botao para="/criar-empresa" principal>
              Criar a minha empresa
            </Botao>
          </Revelar>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${COR.borda}`, background: COR.branco }}>
        <div
          style={{
            maxWidth: LARGURA_MAX,
            margin: '0 auto',
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: FONTE.nota,
            color: COR.suave,
          }}
        >
          <span>Voneka Projectos</span>
          <span>·</span>
          <span>Maputo, Moçambique</span>
          <Link to="/entrar" style={{ marginLeft: 'auto' }}>
            Entrar na minha conta
          </Link>
        </div>
      </footer>
    </div>
  );
}
