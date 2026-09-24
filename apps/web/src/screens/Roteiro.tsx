import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIAS,
  ESTADO_FASE,
  MESES,
  MESES_LONGOS,
  chip,
  corBarraFase,
  dataCurta,
  dataDeOffset,
  diferencaEmDias,
  ehFimDeSemana,
  hoje,
  offsetDeData,
  paraIso,
  somarDias,
} from '@nexora/shared';
import { COR, FONTE,
  MARCA, ECRA, LARGURA, PESO, RAIO, SOMBRA, cartao, numerico, textoTruncado } from '../design/tokens';
import { Carregando, Ponto, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { ModalRoteiro } from '../components/ModalRoteiro';
import { useLarguraDe } from '../lib/ecra';
import { useToast } from '../components/Toast';
import {
  useCarteira,
  useFasesDaCarteira,
  useProjecto,
  useReagendarFase,
  useReporPlano,
} from '../lib/queries';

type Escala = 'mes' | 'semana' | 'dia';

/** Largura da janela e passo de navegacao, por escala. */
/** Largura minima da pista de cada escala, abaixo da qual o gantt desliza de lado. */
const PISTA_MINIMA: Record<Escala, number> = { mes: 660, semana: 620, dia: 700 };

/** Duas linhas e reticencias: o nome do projecto numa coluna estreita. */
const duasLinhas: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  lineHeight: 1.35,
};

const JANELA: Record<Escala, { dias: number; passo: number }> = {
  mes: { dias: 184, passo: 30 },
  semana: { dias: 56, passo: 7 },
  dia: { dias: 14, passo: 1 },
};

interface Arrasto {
  faseId: string;
  modo: 'mover' | 'redimensionar';
  xInicial: number;
  diasPorPixel: number;
  inicioOriginal: number;
  duracaoOriginal: number;
  nome: string;
}

/**
 * Roteiro em gantt.
 *
 * Arrastar a barra move a fase; arrastar a aresta direita muda a duracao. O movimento e local
 * enquanto o rato esta em baixo e so vai ao servidor quando se larga - assim o arrasto acompanha
 * o cursor sem esperar pela rede, e uma unica escrita fica no historico em vez de uma por pixel.
 *
 * O plano original fica guardado a parte, o que permite a "Repor plano original" devolver a
 * verdade em vez de tentar desfazer passo a passo.
 */
export function Roteiro() {
  // No telemovel abre na semana, centrada em hoje: seis meses em 360px sao riscos, e o que
  // se quer ao abrir o roteiro no terreno e o que acontece nestas semanas.
  const [escala, setEscala] = useState<Escala>(() =>
    typeof window !== 'undefined' && window.innerWidth < ECRA.movel ? 'semana' : 'mes',
  );
  const [deslocamento, setDeslocamento] = useState(0);
  const [fasesPara, setFasesPara] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState<Record<string, { inicio: number; duracao: number }>>({});

  const { data: carteira, isLoading } = useCarteira('todos');
  const reagendar = useReagendarFase();
  const repor = useReporPlano();
  const toast = useToast();

  const arrasto = useRef<Arrasto | null>(null);
  const [aArrastar, setAArrastar] = useState<string | null>(null);

  // O plano de toda a carteira num pedido so, indexado pelo identificador do projecto.
  const { data: fasesPorProjecto } = useFasesDaCarteira();

  // O gantt tem uma largura minima por escala: abaixo dela as barras deixam de ter onde escrever
  // o nome e o arrasto deixa de ter precisao. Quando o cartao e mais estreito, o gantt desliza
  // de lado dentro dele, com a coluna dos nomes fixa - a pagina nunca desliza.
  const [cartaoRef, larguraCartao] = useLarguraDe<HTMLDivElement>();
  const estreito = larguraCartao < 760;
  const colNomes = estreito ? 132 : LARGURA.roteiroNomes;
  const margem = estreito ? 12 : 20;

  const linhas = useMemo(
    () =>
      (carteira?.projectos ?? []).map((p) => ({
        projecto: p,
        // Por identificador e nao por posicao: a carteira e as fases sao duas consultas que se
        // actualizam em momentos diferentes, e casa-las por indice bastava a lista mudar de
        // tamanho para encostar as fases ao projecto errado.
        fases: fasesPorProjecto?.[p.id] ?? [],
      })),
    [carteira, fasesPorProjecto],
  );

  const referencia = hoje();
  const offsetHoje = offsetDeData(referencia);
  const { dias: largura, passo } = JANELA[escala];

  /** Inicio da janela, em offsets desde a base do roteiro. */
  const inicioJanela = useMemo(() => {
    if (escala === 'mes') return 0 + deslocamento * passo;
    // Nas escalas curtas, a janela abre centrada em hoje.
    const centro = offsetHoje - Math.floor(largura / 2) + 3;
    return centro + deslocamento * passo;
  }, [escala, deslocamento, passo, largura, offsetHoje]);

  const colunas = useMemo(() => construirColunas(escala, inicioJanela, largura, offsetHoje), [
    escala,
    inicioJanela,
    largura,
    offsetHoje,
  ]);

  const edicoes = useMemo(
    () =>
      linhas.reduce(
        (total, l) =>
          total +
          l.fases.filter(
            (f) =>
              f.startsOn.getTime() !== f.planeadoStartsOn.getTime() ||
              f.endsOn.getTime() !== f.planeadoEndsOn.getTime(),
          ).length,
        0,
      ),
    [linhas],
  );

  const aoMover = useCallback((evento: PointerEvent) => {
    const dg = arrasto.current;
    if (!dg) return;
    const delta = Math.round((evento.clientX - dg.xInicial) * dg.diasPorPixel);
    setAjustes((actual) => {
      const proximo =
        dg.modo === 'mover'
          ? { inicio: dg.inicioOriginal + delta, duracao: dg.duracaoOriginal }
          : { inicio: dg.inicioOriginal, duracao: Math.max(2, dg.duracaoOriginal + delta) };
      const anterior = actual[dg.faseId];
      if (anterior && anterior.inicio === proximo.inicio && anterior.duracao === proximo.duracao) {
        return actual;
      }
      return { ...actual, [dg.faseId]: proximo };
    });
  }, []);

  const aoLargar = useCallback(() => {
    const dg = arrasto.current;
    if (!dg) return;
    arrasto.current = null;
    setAArrastar(null);

    setAjustes((actual) => {
      const ajuste = actual[dg.faseId];
      if (!ajuste) return actual;
      if (ajuste.inicio === dg.inicioOriginal && ajuste.duracao === dg.duracaoOriginal) return actual;

      const inicio = dataDeOffset(ajuste.inicio);
      const fim = dataDeOffset(ajuste.inicio + ajuste.duracao);

      void reagendar
        .mutateAsync({ faseId: dg.faseId, startsOn: paraIso(inicio), endsOn: paraIso(fim) })
        .then(() => {
          toast.mostrar(
            `${dg.nome} → ${dataCurta(inicio)} a ${dataCurta(fim)} · plano actualizado`,
          );
          // O ajuste local deixa de ser preciso assim que o servidor confirma.
          setAjustes((a) => {
            const { [dg.faseId]: _removido, ...resto } = a;
            return resto;
          });
        })
        .catch(() => {
          toast.mostrar('Não foi possível gravar o novo plano.');
          setAjustes((a) => {
            const { [dg.faseId]: _removido, ...resto } = a;
            return resto;
          });
        });

      return actual;
    });
  }, [reagendar, toast]);

  useEffect(() => {
    // Eventos de ponteiro e nao de rato: cobrem rato, dedo e caneta com o mesmo codigo. Com
    // `mousemove` o gantt aparecia no tablet e nao se arrastava - existia sem funcionar.
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoLargar);
    window.addEventListener('pointercancel', aoLargar);
    return () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoLargar);
      window.removeEventListener('pointercancel', aoLargar);
    };
  }, [aoMover, aoLargar]);

  /**
   * Replaneamento pelo teclado.
   *
   * Sem isto, mover uma fase exigia rato ou dedo. As setas movem um dia, com Shift uma semana;
   * com Alt mudam a duracao em vez do inicio.
   */
  const aoTeclado = useCallback(
    (evento: React.KeyboardEvent, fase: { id: string; nome: string }, inicio: number, duracao: number) => {
      const passo = evento.shiftKey ? 7 : 1;
      let delta = 0;
      if (evento.key === 'ArrowRight') delta = passo;
      else if (evento.key === 'ArrowLeft') delta = -passo;
      else return;

      evento.preventDefault();
      const novoInicio = evento.altKey ? inicio : Math.max(0, inicio + delta);
      const novaDuracao = evento.altKey ? Math.max(2, duracao + delta) : duracao;

      const de = dataDeOffset(novoInicio);
      const ate = dataDeOffset(novoInicio + novaDuracao);
      setAjustes((a) => ({ ...a, [fase.id]: { inicio: novoInicio, duracao: novaDuracao } }));

      void reagendar
        .mutateAsync({ faseId: fase.id, startsOn: paraIso(de), endsOn: paraIso(ate) })
        .then(() => {
          toast.mostrar(`${fase.nome} → ${dataCurta(de)} a ${dataCurta(ate)} · plano actualizado`);
          setAjustes((a) => {
            const { [fase.id]: _removido, ...resto } = a;
            return resto;
          });
        })
        .catch(() => {
          toast.mostrar('Não foi possível gravar o novo plano.');
          setAjustes((a) => {
            const { [fase.id]: _removido, ...resto } = a;
            return resto;
          });
        });
    },
    [reagendar, toast],
  );

  const rotuloJanela =
    escala === 'mes'
      ? `${MESES_LONGOS[dataDeOffset(inicioJanela).getUTCMonth()]} a ${
          MESES_LONGOS[dataDeOffset(inicioJanela + largura - 1).getUTCMonth()]
        } de ${dataDeOffset(inicioJanela).getUTCFullYear()}`
      : `${dataCurta(dataDeOffset(inicioJanela))} – ${dataCurta(dataDeOffset(inicioJanela + largura - 1))} de ${dataDeOffset(inicioJanela).getUTCFullYear()}`;

  const hojeVisivel = offsetHoje >= inicioJanela && offsetHoje < inicioJanela + largura;
  const larguraMinima = colNomes + PISTA_MINIMA[escala] + margem * 2;

  return (
    <Pagina
      acento={MARCA.verde}
      titulo="Roteiro"
      subtitulo="Arraste as fases para replanear · escala mensal, semanal ou diária"
      larguraMaxima={1600}
    >
      <div className="vn-ferramentas-roteiro">
        <div style={{ display: 'flex', gap: 4, padding: 3, background: COR.linha, borderRadius: RAIO.medio }}>
          {(
            [
              ['mes', 'Mês'],
              ['semana', 'Semana'],
              ['dia', 'Dia'],
            ] as const
          ).map(([chave, rotulo]) => {
            const activa = escala === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => {
                  setEscala(chave);
                  setDeslocamento(0);
                }}
                style={{
                  height: 27,
                  padding: '0 14px',
                  border: 'none',
                  borderRadius: RAIO.botao,
                  fontSize: FONTE.corpo,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: activa ? COR.branco : 'transparent',
                  color: activa ? COR.tinta : COR.textoSuave,
                  fontWeight: activa ? PESO.forte : PESO.normal,
                  boxShadow: activa ? SOMBRA.pastilha : 'none',
                }}
              >
                {rotulo}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <BotaoNavegacao rotulo="‹" onClick={() => setDeslocamento((d) => d - 1)} />
          <BotaoNavegacao rotulo="›" onClick={() => setDeslocamento((d) => d + 1)} />
          <button
            type="button"
            onClick={() => setDeslocamento(0)}
            style={{
              height: 30,
              padding: '0 12px',
              border: `1px solid ${COR.borda}`,
              background: COR.branco,
              borderRadius: RAIO.campo,
              fontSize: FONTE.corpo,
              fontWeight: PESO.medio,
              color: COR.texto,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Hoje
          </button>
        </div>

        <span className="vn-janela-roteiro" style={{ fontSize: FONTE.base, fontWeight: PESO.medio }}>
          {rotuloJanela}
        </span>

        <div
          className="vn-legenda-roteiro"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: FONTE.nota,
            color: COR.textoSuave,
          }}
        >
          {(
            [
              ['concluida', COR.tinta],
              ['em_curso', MARCA.turquesa],
              ['planeada', COR.borda],
              ['atrasada', COR.vermelhoVivo],
            ] as const
          ).map(([estado, cor]) => (
            <span key={estado} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: cor }} />
              {ESTADO_FASE[estado]}
            </span>
          ))}
        </div>
      </div>

      <div ref={cartaoRef} style={{ ...cartao, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            padding: `12px ${margem}px`,
            borderBottom: `1px solid ${COR.borda}`,
          }}
        >
          <span style={{ fontSize: FONTE.pequena, color: COR.textoSuave }}>
            Arraste uma fase para a mover; arraste a aresta direita para alterar a duração.
          </span>
          {edicoes > 0 ? (
            <button
              type="button"
              onClick={async () => {
                for (const linha of linhas) {
                  const alterada = linha.fases.some(
                    (f) =>
                      f.startsOn.getTime() !== f.planeadoStartsOn.getTime() ||
                      f.endsOn.getTime() !== f.planeadoEndsOn.getTime(),
                  );
                  if (alterada) await repor.mutateAsync(linha.projecto.id);
                }
                toast.mostrar('Roteiro reposto no plano original');
              }}
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: 'transparent',
                color: MARCA.turquesaTexto,
                fontSize: FONTE.corpo,
                fontWeight: PESO.medio,
                cursor: 'pointer',
              }}
            >
              Repor plano original ({edicoes})
            </button>
          ) : null}
        </div>

        <div className="vn-rolavel-x">
        <div style={{ minWidth: larguraMinima }}>
        {/* Cabeçalho de escala */}
        <div
          style={{
            display: 'flex',
            background: COR.fundoHover,
            borderBottom: `1px solid ${COR.borda}`,
            padding: `0 ${margem}px 0 0`,
          }}
        >
          <div
            className="vn-fixo-esquerda"
            style={{ width: colNomes + margem, flex: `0 0 ${colNomes + margem}px`, background: COR.fundoHover }}
          />
          <div style={{ flex: 1, position: 'relative', height: 38 }}>
            {colunas.map((c) => (
              <div
                key={c.chave}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: c.esquerda,
                  width: c.largura,
                  borderLeft: `1px solid ${COR.borda}`,
                  padding: '8px 0 0 8px',
                  background: c.fundo,
                }}
              >
                <div
                  style={{
                    fontSize: FONTE.minima,
                    fontWeight: PESO.forte,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    color: c.destaque ? COR.tinta : COR.suave,
                  }}
                >
                  {c.rotulo}
                </div>
                <div style={{ fontSize: 10, color: COR.suave, marginTop: 2, whiteSpace: 'nowrap' }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Carregando />
        ) : !linhas.length ? (
          <Vazio>Nenhum projecto na carteira.</Vazio>
        ) : (
          linhas.map(({ projecto, fases }, indiceLinha) => {
            return (
              <div
                key={projecto.id}
                style={{
                  display: 'flex',
                  borderBottom: indiceLinha === linhas.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                  padding: `0 ${margem}px 0 0`,
                }}
              >
                <div
                  className="vn-fixo-esquerda"
                  style={{
                    width: colNomes + margem,
                    flex: `0 0 ${colNomes + margem}px`,
                    padding: `16px 10px 16px ${margem}px`,
                    background: COR.branco,
                    borderRight: estreito ? `1px solid ${COR.linha}` : 'none',
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: FONTE.corpo,
                        fontWeight: PESO.medio,
                        ...(estreito ? duasLinhas : textoTruncado),
                      }}
                    >
                      {projecto.nome}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ponto cor={chip(projecto.natureza.cor).ponto} tamanho={5} />
                      <span style={{ fontSize: FONTE.minima, color: COR.suave, ...textoTruncado }}>
                        {projecto.natureza.rotulo} · {projecto.cliente}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFasesPara(projecto.id)}
                    aria-label={`Editar fases de ${projecto.nome}`}
                    title="Editar fases"
                    style={{
                      width: 24,
                      height: 24,
                      flex: '0 0 24px',
                      border: 'none',
                      background: 'transparent',
                      borderRadius: RAIO.botao,
                      color: COR.suave,
                      cursor: 'pointer',
                      fontSize: 11,
                    }}
                  >
                    ✎
                  </button>
                </div>

                <div style={{ flex: 1, position: 'relative', padding: '16px 0' }}>
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {colunas.map((c) => (
                      <div
                        key={c.chave}
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: c.esquerda,
                          width: c.largura,
                          borderLeft: `1px solid ${COR.linha}`,
                          background: c.fundo,
                        }}
                      />
                    ))}
                  </div>

                  {hojeVisivel && escala !== 'mes' ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: COR.vermelhoVivo,
                        opacity: 0.5,
                        pointerEvents: 'none',
                        left: `${((offsetHoje - inicioJanela) / largura) * 100}%`,
                      }}
                    />
                  ) : null}

                  <div data-pista style={{ position: 'relative', height: 24 }}>
                    {fases.map((fase) => {
                      const ajuste = ajustes[fase.id];
                      const inicio = ajuste?.inicio ?? offsetDeData(fase.startsOn);
                      const duracao = ajuste?.duracao ?? diferencaEmDias(fase.startsOn, fase.endsOn);
                      const fim = inicio + duracao;

                      if (fim <= inicioJanela || inicio >= inicioJanela + largura) return null;

                      const visivelDe = Math.max(inicio, inicioJanela);
                      const visivelAte = Math.min(fim, inicioJanela + largura);
                      const cor = corBarraFase(fase.estado);
                      const activa = aArrastar === fase.id;

                      function iniciarArrasto(modo: 'mover' | 'redimensionar') {
                        return (evento: React.PointerEvent) => {
                          evento.preventDefault();
                          evento.stopPropagation();
                          const pista = (evento.currentTarget as HTMLElement).closest('[data-pista]');
                          if (!pista) return;
                          const caixa = pista.getBoundingClientRect();
                          arrasto.current = {
                            faseId: fase.id,
                            modo,
                            xInicial: evento.clientX,
                            diasPorPixel: largura / caixa.width,
                            inicioOriginal: inicio,
                            duracaoOriginal: duracao,
                            nome: fase.nome,
                          };
                          setAArrastar(fase.id);
                        };
                      }

                      return (
                        <div
                          key={fase.id}
                          className="vn-barra-fase"
                          onPointerDown={iniciarArrasto('mover')}
                          onKeyDown={(e) => aoTeclado(e, fase, inicio, fim - inicio)}
                          role="slider"
                          tabIndex={0}
                          aria-label={`Fase ${fase.nome}`}
                          aria-valuemin={0}
                          aria-valuenow={inicio}
                          aria-valuemax={inicioJanela + largura}
                          aria-valuetext={`${dataCurta(dataDeOffset(inicio))} a ${dataCurta(dataDeOffset(fim))}`}
                          title={`${fase.nome} · ${dataCurta(dataDeOffset(inicio))} a ${dataCurta(dataDeOffset(fim))}`}
                          style={{
                            position: 'absolute',
                            top: 0,
                            height: 28,
                            left: `${((visivelDe - inicioJanela) / largura) * 100}%`,
                            width: `${Math.max(1.2, ((visivelAte - visivelDe) / largura) * 100)}%`,
                            borderRadius: RAIO.botao,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 9px',
                            fontSize: FONTE.minima,
                            fontWeight: PESO.medio,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            cursor: 'grab',
                            userSelect: 'none',
                            background: cor.bg,
                            color: cor.fg,
                            border: `1px solid ${cor.bd}`,
                            boxShadow: activa ? SOMBRA.arrasto : 'none',
                            opacity: activa ? 0.92 : 1,
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, ...textoTruncado }}>{fase.nome}</span>
                          <span
                            onPointerDown={iniciarArrasto('redimensionar')}
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              // O traco continua fino, mas o alvo e largo: 8px nao se acerta
                              // com o dedo. O `touch-action` impede a pagina de deslizar
                              // enquanto se redimensiona.
                              width: 22,
                              height: '100%',
                              cursor: 'col-resize',
                              touchAction: 'none',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
        </div>
      </div>

      <ModalRoteiro projectoId={fasesPara} onFechar={() => setFasesPara(null)} />
    </Pagina>
  );
}

function BotaoNavegacao({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo === '‹' ? 'Recuar' : 'Avançar'}
      style={{
        width: 30,
        height: 30,
        border: `1px solid ${COR.borda}`,
        background: COR.branco,
        borderRadius: RAIO.campo,
        cursor: 'pointer',
        color: COR.texto,
        fontSize: FONTE.base,
        fontFamily: 'inherit',
      }}
    >
      {rotulo}
    </button>
  );
}

interface Coluna {
  chave: string;
  rotulo: string;
  sub: string;
  esquerda: string;
  largura: string;
  fundo: string;
  destaque: boolean;
}

/**
 * Colunas da escala.
 *
 * Na vista mensal as colunas seguem os meses reais do calendario, e nao blocos fixos de trinta
 * dias: assim a coluna de Fevereiro continua a ser Fevereiro depois de navegar, em vez de
 * escorregar um dia por mes.
 */
function construirColunas(escala: Escala, inicio: number, largura: number, offsetHoje: number): Coluna[] {
  const pct = (dias: number) => `${((dias / largura) * 100).toFixed(2)}%`;

  if (escala === 'mes') {
    const colunas: Coluna[] = [];
    let cursor = inicio;
    while (cursor < inicio + largura) {
      const data = dataDeOffset(cursor);
      const primeiroDoMesSeguinte = Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 1);
      const offsetProximo = offsetDeData(new Date(primeiroDoMesSeguinte));
      const fim = Math.min(offsetProximo, inicio + largura);
      const activo = offsetHoje >= cursor && offsetHoje < fim;

      colunas.push({
        chave: `m${cursor}`,
        rotulo: MESES_LONGOS[data.getUTCMonth()] ?? '',
        sub: String(data.getUTCFullYear()),
        esquerda: pct(cursor - inicio),
        largura: pct(fim - cursor),
        fundo: activo ? COR.fundoHover : 'transparent',
        destaque: activo,
      });
      cursor = fim;
    }
    return colunas;
  }

  if (escala === 'semana') {
    return Array.from({ length: Math.ceil(largura / 7) }, (_, i) => {
      const dia = inicio + i * 7;
      const data = dataDeOffset(dia);
      const activo = offsetHoje >= dia && offsetHoje < dia + 7;
      return {
        chave: `s${dia}`,
        rotulo: `sem ${data.getUTCDate()} ${MESES[data.getUTCMonth()]}`,
        sub: activo ? 'esta semana' : '',
        esquerda: pct(i * 7),
        largura: pct(7),
        fundo: activo ? COR.fundoHover : 'transparent',
        destaque: activo,
      };
    });
  }

  return Array.from({ length: largura }, (_, i) => {
    const dia = inicio + i;
    const data = dataDeOffset(dia);
    const activo = dia === offsetHoje;
    const fimDeSemana = ehFimDeSemana(data);
    return {
      chave: `d${dia}`,
      rotulo: String(data.getUTCDate()).padStart(2, '0'),
      sub: DIAS[data.getUTCDay()] ?? '',
      esquerda: pct(i),
      largura: pct(1),
      // Os fins de semana ficam sombreados para que uma fase que atravessa o sabado se leia.
      fundo: activo ? COR.vermelhoFundo : fimDeSemana ? COR.fundoHover : 'transparent',
      destaque: activo,
    };
  });
}

/** Reexportado para os testes de janela. */
export { construirColunas, somarDias };
