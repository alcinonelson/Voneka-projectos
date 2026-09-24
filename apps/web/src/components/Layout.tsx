import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  COR,
  ESPACO,
  FONTE,
  LARGURA,
  MARCA,
  PESO,
  botaoPrincipal,
  botaoSecundario,
} from '../design/tokens';
import { useEhEstreito } from '../lib/ecra';
import { Icone } from './icones';
import { Sidebar } from './Sidebar';

/**
 * Estrutura da aplicacao: barra lateral, cabecalho e conteudo.
 *
 * Nao ha largura minima. A anterior - 1180px, com deslocamento horizontal por baixo dela - fazia
 * a aplicacao inteira deslizar como uma peca so, cabecalho e menu incluidos, e obrigava a uma
 * saida de emergencia em ecra pequeno. Agora cada ecra reorganiza-se: as tabelas perdem colunas e
 * ganham cartoes, e a barra lateral vira gaveta.
 *
 * `100dvh` em vez de `100vh`: nos telemoveis a barra de endereco entra e sai, e `vh` mede a janela
 * sem ela, o que empurra o rodape para fora do ecra. O `100vh` fica como recuo para os navegadores
 * que ainda nao conhecem `dvh`.
 */

interface Navegacao {
  /** Verdadeiro quando a barra lateral e uma gaveta, e nao uma coluna fixa. */
  emGaveta: boolean;
  gavetaAberta: boolean;
  abrirGaveta: () => void;
  fecharGaveta: () => void;
}

const ContextoNavegacao = createContext<Navegacao>({
  emGaveta: false,
  gavetaAberta: false,
  abrirGaveta: () => {},
  fecharGaveta: () => {},
});

export function useNavegacao(): Navegacao {
  return useContext(ContextoNavegacao);
}

export function Layout() {
  const emGaveta = useEhEstreito();
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
    <ContextoNavegacao.Provider value={{ emGaveta, gavetaAberta, abrirGaveta, fecharGaveta }}>
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
 * Em ecra estreito o cabecalho envolve: o titulo em cima, as accoes por baixo com largura inteira.
 * Um titulo e dois botoes numa linha so nao cabem em 360px, e o que cede primeiro e sempre o
 * titulo, que e o que diz onde se esta.
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
  const { emGaveta, abrirGaveta } = useNavegacao();

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
          // O entalhe dos telemoveis nao pode comer o botao do menu.
          paddingLeft: `max(${ESPACO.pagina}px, env(safe-area-inset-left))`,
          paddingRight: `max(${ESPACO.pagina}px, env(safe-area-inset-right))`,
        }}
      >
        {emGaveta ? (
          <button
            type="button"
            onClick={abrirGaveta}
            aria-label="Abrir o menu"
            className="vn-alvo"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              flex: '0 0 38px',
              marginLeft: -8,
              border: `1px solid ${COR.borda}`,
              borderRadius: 8,
              background: COR.branco,
              color: COR.tinta,
              cursor: 'pointer',
            }}
          >
            <Icone nome="menu" tamanho={20} />
          </button>
        ) : null}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="vn-titulo-pagina"
            style={{ fontWeight: PESO.forte, letterSpacing: '-0.01em' }}
          >
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

        {accaoPrincipal || accaoSecundaria ? (
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
        className="vn-conteudo"
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: `max(48px, env(safe-area-inset-bottom))`,
        }}
      >
        <div style={{ maxWidth: larguraMaxima ?? LARGURA.conteudoMax, animation: 'nx-in .24s ease both' }}>
          {children}
        </div>
      </main>
    </>
  );
}
