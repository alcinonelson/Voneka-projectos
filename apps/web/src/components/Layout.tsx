import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { COR, ESPACO, FONTE, LARGURA, MARCA, PESO, botaoPrincipal, botaoSecundario } from '../design/tokens';
import { Sidebar } from './Sidebar';

/**
 * Estrutura da aplicacao: sidebar de 236px, cabecalho de 64px, conteudo.
 *
 * A largura minima de 1440px e a do design. Abaixo disso a pagina desloca-se na horizontal em vez
 * de se reorganizar: uma carteira de projectos com estagio, responsavel, avanco, prazo e tarefas
 * nao cabe honestamente em menos, e comprimi-la esconderia colunas que decidem. A leitura em
 * ecra pequeno tem um caminho proprio - a vista de terreno.
 */
export function Layout() {
  return (
    <div style={{ width: '100%', height: '100vh', overflowX: 'auto', overflowY: 'hidden', background: COR.fundo }}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          minWidth: LARGURA.minima,
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
    </div>
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
  return (
    <>
      <header
        style={{
          height: LARGURA.cabecalho,
          flex: `0 0 ${LARGURA.cabecalho}px`,
          background: COR.branco,
          borderBottom: `1px solid ${COR.borda}`,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${ESPACO.pagina}px`,
          gap: 16,
          // Um fio da cor do grupo, para o cabecalho dizer de onde se veio sem o escrever.
          borderTop: `2px solid ${acento}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: FONTE.titulo, fontWeight: PESO.forte, letterSpacing: '-0.01em' }}>{titulo}</div>
          <div style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginTop: 3 }}>{subtitulo}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
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
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: `24px ${ESPACO.pagina}px 48px` }}>
        <div style={{ maxWidth: larguraMaxima ?? LARGURA.conteudoMax, animation: 'nx-in .24s ease both' }}>
          {children}
        </div>
      </main>
    </>
  );
}
