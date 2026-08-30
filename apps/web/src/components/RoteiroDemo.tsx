import { useCallback, useEffect, useRef, useState } from 'react';
import { FOLGA_ENTRE_FASES, duracaoEmDias } from '@nexora/shared';
import { COR, FONTE, MARCA, PESO, RAIO, numerico } from '../design/tokens';

/**
 * O roteiro, para experimentar na propria pagina.
 *
 * Arrastar uma fase move-a e reencadeia as seguintes, com os mesmos dois dias de folga que o
 * produto usa - `FOLGA_ENTRE_FASES` e `duracaoEmDias` sao importados de `@nexora/shared`, os
 * mesmos que o servidor aplica. Nao e uma imitacao da regra: e a regra.
 *
 * Esta aqui porque explicar por palavras que "as datas se reencadeiam" convence menos do que
 * deixar a pessoa puxar uma barra e ver as outras irem atras.
 */

interface Fase {
  nome: string;
  /** Inicio em dias desde o arranque do roteiro. */
  inicio: number;
  semanas: number;
  cor: string;
}

const INICIAL: Fase[] = [
  { nome: 'Descoberta', inicio: 0, semanas: 3, cor: MARCA.turquesa },
  { nome: 'Desenho da solução', inicio: 21, semanas: 4, cor: MARCA.verde },
  { nome: 'Execução', inicio: 49, semanas: 6, cor: MARCA.verdeTexto },
  { nome: 'Validação', inicio: 91, semanas: 3, cor: COR.ambarVivo },
];

/** Janela visivel, em dias. Larga o suficiente para haver para onde arrastar. */
const JANELA = 140;
const BASE = new Date(Date.UTC(2026, 6, 1));

function data(offset: number): string {
  const d = new Date(BASE.getTime() + offset * 86_400_000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reencadeia as fases a partir da que foi movida.
 * Cada seguinte comeca dois dias depois de a anterior acabar - a regra do produto.
 */
function reencadear(fases: Fase[], desde: number): Fase[] {
  const saida = fases.map((f) => ({ ...f }));
  for (let i = desde + 1; i < saida.length; i += 1) {
    const anterior = saida[i - 1] as Fase;
    const fim = anterior.inicio + duracaoEmDias(anterior.semanas);
    (saida[i] as Fase).inicio = fim + FOLGA_ENTRE_FASES;
  }
  return saida;
}

export function RoteiroDemo() {
  const [fases, setFases] = useState<Fase[]>(INICIAL);
  const [aArrastar, setAArrastar] = useState<number | null>(null);
  const [mexeu, setMexeu] = useState(false);
  const pista = useRef<HTMLDivElement | null>(null);
  const arrasto = useRef<{ indice: number; xInicial: number; inicioOriginal: number } | null>(null);

  const aoMover = useCallback((evento: PointerEvent) => {
    const dg = arrasto.current;
    const caixa = pista.current?.getBoundingClientRect();
    if (!dg || !caixa) return;

    const diasPorPixel = JANELA / caixa.width;
    const delta = Math.round((evento.clientX - dg.xInicial) * diasPorPixel);
    const novo = Math.max(0, dg.inicioOriginal + delta);

    setFases((actuais) => {
      const copia = actuais.map((f) => ({ ...f }));
      const alvo = copia[dg.indice] as Fase;
      if (alvo.inicio === novo) return actuais;
      alvo.inicio = novo;
      return reencadear(copia, dg.indice);
    });
    setMexeu(true);
  }, []);

  const aoLargar = useCallback(() => {
    arrasto.current = null;
    setAArrastar(null);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', aoMover);
    window.addEventListener('pointerup', aoLargar);
    window.addEventListener('pointercancel', aoLargar);
    return () => {
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoLargar);
      window.removeEventListener('pointercancel', aoLargar);
    };
  }, [aoMover, aoLargar]);

  /** O teclado move a fase tal como o rato: sem isto, isto era so para quem tem rato. */
  function aoTeclado(evento: React.KeyboardEvent, indice: number) {
    const passo = evento.shiftKey ? 7 : 1;
    let delta = 0;
    if (evento.key === 'ArrowRight') delta = passo;
    else if (evento.key === 'ArrowLeft') delta = -passo;
    else return;

    evento.preventDefault();
    setFases((actuais) => {
      const copia = actuais.map((f) => ({ ...f }));
      const alvo = copia[indice] as Fase;
      alvo.inicio = Math.max(0, alvo.inicio + delta);
      return reencadear(copia, indice);
    });
    setMexeu(true);
  }

  const fim = Math.max(...fases.map((f) => f.inicio + duracaoEmDias(f.semanas)));

  return (
    <div
      style={{
        background: COR.branco,
        border: `1px solid ${COR.borda}`,
        borderRadius: RAIO.cartao,
        padding: '20px 22px 22px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <span
          style={{
            fontSize: FONTE.minima,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: COR.suave,
            fontWeight: PESO.medio,
          }}
        >
          Experimente
        </span>
        <span style={{ fontSize: FONTE.nota, color: COR.textoSuave }}>
          arraste uma fase — as seguintes acompanham
        </span>
        {mexeu ? (
          <button
            type="button"
            onClick={() => {
              setFases(INICIAL);
              setMexeu(false);
            }}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: MARCA.turquesaTexto,
              fontSize: FONTE.nota,
              fontWeight: PESO.medio,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            Repor plano original
          </button>
        ) : null}
      </div>

      <div ref={pista} style={{ position: 'relative' }}>
        {fases.map((fase, i) => {
          const dias = duracaoEmDias(fase.semanas);
          const esquerda = (fase.inicio / JANELA) * 100;
          const largura = (dias / JANELA) * 100;
          const activa = aArrastar === i;

          return (
            <div key={fase.nome} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
              <span
                style={{
                  width: 132,
                  flex: '0 0 132px',
                  fontSize: FONTE.nota,
                  color: COR.texto,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {fase.nome}
              </span>

              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  height: 30,
                  background: COR.fundoCampo,
                  borderRadius: RAIO.botao,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="vn-fase"
                  data-arrastar={activa ? 'sim' : 'nao'}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Fase ${fase.nome}, começa a ${data(fase.inicio)}`}
                  aria-valuemin={0}
                  aria-valuemax={JANELA}
                  aria-valuenow={fase.inicio}
                  aria-valuetext={`${data(fase.inicio)} a ${data(fase.inicio + dias)}`}
                  onKeyDown={(e) => aoTeclado(e, i)}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    arrasto.current = { indice: i, xInicial: e.clientX, inicioOriginal: fase.inicio };
                    setAArrastar(i);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${Math.min(esquerda, 100)}%`,
                    width: `${largura}%`,
                    top: 3,
                    bottom: 3,
                    background: fase.cor,
                    borderRadius: RAIO.pequeno + 1,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 9,
                    color: COR.branco,
                    fontSize: FONTE.minima,
                    fontWeight: PESO.medio,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    ...numerico,
                  }}
                >
                  {data(fase.inicio)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          paddingTop: 13,
          borderTop: `1px solid ${COR.linha}`,
          fontSize: FONTE.nota,
          color: COR.textoSuave,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span>
          Entrega em <strong style={{ color: MARCA.verdeTexto, ...numerico }}>{data(fim)}</strong>
        </span>
        <span style={{ color: COR.suave }}>·</span>
        <span>dois dias entre fases, como no produto</span>
      </div>
    </div>
  );
}
