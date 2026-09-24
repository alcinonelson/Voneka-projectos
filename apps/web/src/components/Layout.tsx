import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  COR,
  ESPACO,
  FONTE,
  LARGURA,
  MARCA,
  PESO,
  type FaixaEcra,
  botaoPrincipal,
  botaoSecundario,
} from '../design/tokens';
import { useFaixaEcra } from '../lib/ecra';
import { BarraInferior } from './BarraInferior';
import { Sidebar } from './Sidebar';

/**
 * Estrutura da aplicacao: navegacao, cabecalho e conteudo.
 *
 * Tres faixas, tres formas de navegar - e nao a mesma encolhida:
 *
 * - **amplo** (>= 1024): barra lateral fixa, recolhivel pelo botao na fronteira.
 * - **tablet** (680-1023): barra lateral sempre em icones; expandi-la abre-a por cima do conteudo,
 *   que nao perde largura. Um toque troca de ecra, como no desktop.
 * - **movel** (< 680): barra inferior com os quatro destinos do dia a dia, ao alcance do polegar;
 *   "Mais" abre o menu completo numa gaveta. A accao principal de cada ecra vira botao flutuante.
 *
 * `100dvh` em vez de `100vh`: nos telemoveis a barra de endereco entra e sai, e `vh` mede a janela
 * sem ela, o que empurra o rodape para fora do ecra.
 */

interface Navegacao {
  faixa: FaixaEcra;
  /** Verdadeiro quando o menu completo e uma gaveta (telemovel). */
  emGaveta: boolean;
  gavetaAberta: boolean;
  abrirGaveta: () => void;
  fecharGaveta: () => void;
}

const ContextoNavegacao = createContext<Navegacao>({
  faixa: 'amplo',
  emGaveta: false,
  gavetaAberta: false,
  abrirGaveta: () => {},
  fecharGaveta: () => {},
});

export function useNavegacao(): Navegacao {
  return useContext(ContextoNavegacao);
}

/** Altura da barra inferior, sem a margem de seguranca do dispositivo. */
export const ALTURA_BARRA_INFERIOR = 60;

export function Layout() {
  const faixa = useFaixaEcra();
  const emGaveta = faixa === 'movel';
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const local = useLocation();

  const abrirGaveta = useCallback(() => setGavetaAberta(true), []);
  const fecharGaveta = useCallback(() => setGavetaAberta(false), []);

  // Escolher um destino fecha a gaveta. Deixa-la aberta taparia justamente o que a pessoa
  // acabou de pedir para ver.
  useEffect(() => {
    setGavetaAberta(false);
  }, [local.pathname]);

  // Alargar o ecra com a gaveta aberta deixaria uma sobreposicao orfa por cima da barra fixa.
  useEffect(() => {
    if (!emGaveta) setGavetaAberta(false);
  }, [emGaveta]);

  return (
    <ContextoNavegacao.Provider value={{ faixa, emGaveta, gavetaAberta, abrirGaveta, fecharGaveta }}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          // A segunda declaracao ganha onde `dvh` e suportado, e e ignorada onde nao e.
          maxHeight: '100dvh',
          minHeight: '100dvh',
          overflow: 'hidden',
          fontSize: FONTE.base,
          color: COR.tinta,
          background: COR.fundo,
        }}
      >
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <Outlet />
        </div>
        {emGaveta ? <BarraInferior /> : null}
      </div>
    </ContextoNavegacao.Provider>
  );
}

export interface AccaoCabecalho {
  rotulo: string;
  onClick: () => void;
}

/**
 * Cabecalho e area de conteudo de um ecra.
 *
 * O subtitulo diz o que a pagina mostra em concreto - "Estágio, responsável, avanço e deadline de
 * entrega" - e nao repete o titulo por outras palavras.
 *
 * No telemovel o cabecalho fica numa linha: a accao principal sai dele e passa a botao flutuante,
 * sempre a mao em vez de so no topo da pagina, e a secundaria fica como botao compacto. Um botao
 * de largura inteira por baixo do titulo levava um terco do ecra antes de se ver o primeiro dado.
 */
export function Pagina({
  titulo,
  subtitulo,
  accaoPrincipal,
  accaoSecundaria,
  larguraMaxima,
  acento = MARCA.verde,
  children,
}: {
  titulo: string;
  subtitulo: string;
  accaoPrincipal?: AccaoCabecalho;
  accaoSecundaria?: AccaoCabecalho;
  larguraMaxima?: number;
  /** Cor do grupo do menu a que este ecra pertence, para o cabecalho e o menu concordarem. */
  acento?: string;
  children: ReactNode;
}) {
  const { emGaveta } = useNavegacao();
  const conteudo = useRef<HTMLElement>(null);

  return (
    <>
      <header
        className="vn-cabecalho"
        style={{
          flex: '0 0 auto',
          background: COR.branco,
          borderBottom: `1px solid ${COR.borda}`,
          borderTop: `2px solid ${acento}`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          // O entalhe dos telemoveis nao pode comer o titulo.
          paddingLeft: `max(${ESPACO.pagina}px, env(safe-area-inset-left))`,
          paddingRight: `max(${ESPACO.pagina}px, env(safe-area-inset-right))`,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="vn-titulo-pagina" style={{ fontWeight: PESO.forte, letterSpacing: '-0.01em' }}>
            {titulo}
          </div>
          <div
            style={{
              fontSize: FONTE.pequena,
              color: COR.textoSuave,
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitulo}
          </div>
        </div>

        {emGaveta ? (
          accaoSecundaria ? (
            <button
              type="button"
              style={{ ...botaoSecundario, flex: '0 0 auto', padding: '0 12px' }}
              onClick={accaoSecundaria.onClick}
            >
              {accaoSecundaria.rotulo}
            </button>
          ) : null
        ) : accaoPrincipal || accaoSecundaria ? (
          <div className="vn-accoes-pagina">
            {accaoSecundaria ? (
              <button type="button" style={botaoSecundario} onClick={accaoSecundaria.onClick}>
                {accaoSecundaria.rotulo}
              </button>
            ) : null}
            {accaoPrincipal ? (
              <button type="button" style={botaoPrincipal} onClick={accaoPrincipal.onClick}>
                <span style={{ fontSize: FONTE.base }}>+</span>
                {accaoPrincipal.rotulo}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <main
        ref={conteudo}
        className="vn-conteudo"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          // No telemovel o fim da pagina tem de ficar acima da barra inferior e do botao flutuante.
          paddingBottom: emGaveta
            ? `calc(${ALTURA_BARRA_INFERIOR + (accaoPrincipal ? 76 : 20)}px + env(safe-area-inset-bottom))`
            : `max(48px, env(safe-area-inset-bottom))`,
        }}
      >
        <div style={{ maxWidth: larguraMaxima ?? LARGURA.conteudoMax, animation: 'nx-in .24s ease both' }}>
          {children}
        </div>
      </main>

      {emGaveta && accaoPrincipal ? <BotaoFlutuante accao={accaoPrincipal} conteudo={conteudo} /> : null}
    </>
  );
}

/**
 * Accao principal no telemovel: pilula verde, em baixo a direita, acima da barra de navegacao.
 *
 * Ao descer a pagina recolhe-se ao `+`, para nao tapar o que se esta a ler; ao subir volta a
 * dizer o que faz. O rotulo existe sempre para o leitor de ecra.
 */
function BotaoFlutuante({
  accao,
  conteudo,
}: {
  accao: AccaoCabecalho;
  conteudo: RefObject<HTMLElement>;
}) {
  const [compacto, setCompacto] = useState(false);

  useEffect(() => {
    const el = conteudo.current;
    if (!el) return;
    let ultimo = el.scrollTop;
    const aoRolar = () => {
      const actual = el.scrollTop;
      if (Math.abs(actual - ultimo) < 8) return;
      setCompacto(actual > ultimo && actual > 40);
      ultimo = actual;
    };
    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => el.removeEventListener('scroll', aoRolar);
  }, [conteudo]);

  return (
    <button
      type="button"
      onClick={accao.onClick}
      aria-label={accao.rotulo}
      className="vn-flutuante"
      style={{
        position: 'fixed',
        right: 'max(16px, env(safe-area-inset-right))',
        bottom: `calc(${ALTURA_BARRA_INFERIOR + 14}px + env(safe-area-inset-bottom))`,
        zIndex: 20,
        height: 52,
        minWidth: 52,
        padding: compacto ? 0 : '0 20px 0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: 'none',
        borderRadius: 26,
        background: MARCA.verdeEscuro,
        color: COR.branco,
        fontFamily: 'inherit',
        fontSize: FONTE.media,
        fontWeight: PESO.forte,
        boxShadow: '0 8px 24px rgba(14, 46, 35, 0.32), 0 2px 6px rgba(14, 46, 35, 0.2)',
        cursor: 'pointer',
        transition: 'padding .18s ease, width .18s ease',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1, fontWeight: PESO.normal }}>
        +
      </span>
      {compacto ? null : <span>{accao.rotulo}</span>}
    </button>
  );
}
