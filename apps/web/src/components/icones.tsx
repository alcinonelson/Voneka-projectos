import type { CSSProperties } from 'react';

/**
 * Icones do menu.
 *
 * Substituem os glifos Unicode que aqui estavam - `◱ ▤ ▭ ✓ ✎ ◍ ≡ ⌂` - e que tinham dois
 * problemas. Dependiam da fonte instalada, pelo que o mesmo menu mudava de maquina para maquina;
 * e a 12px, com a barra recolhida, `▭` e `▤` eram indistinguiveis um do outro, quando recolhido o
 * icone e a unica informacao que resta.
 *
 * Sao desenhados a traco, herdam a cor por `currentColor`, e cada um figura aquilo que nomeia: o
 * roteiro sao barras de gantt escalonadas, os relatorios uma folha com linhas escritas, o
 * vocabulario uma lista de etiquetas.
 */

export type NomeIcone =
  | 'painel'
  | 'projectos'
  | 'roteiro'
  | 'tarefas'
  | 'relatorios'
  | 'equipa'
  | 'vocabulario'
  | 'empresa'
  | 'recolher'
  | 'expandir';

const TRACO: CSSProperties = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** O desenho de cada icone, numa grelha de 24. */
const DESENHOS: Record<NomeIcone, JSX.Element> = {
  // Quadrantes de um painel: um grande e tres pequenos.
  painel: (
    <>
      <rect x="3" y="3" width="8.5" height="12" rx="1.5" />
      <rect x="14.5" y="3" width="6.5" height="6" rx="1.5" />
      <rect x="14.5" y="12" width="6.5" height="9" rx="1.5" />
      <rect x="3" y="18" width="8.5" height="3" rx="1.5" />
    </>
  ),
  // Uma lista de projectos: linhas com um marcador a esquerda.
  projectos: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M7.5 13h4" />
      <path d="M7.5 16.5h7" />
      <circle cx="6" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Barras de gantt escalonadas: e o que o roteiro mostra.
  roteiro: (
    <>
      <path d="M3 5h8" />
      <path d="M7 12h11" />
      <path d="M12 19h9" />
      <path d="M3 5v0M3 19v0" />
    </>
  ),
  // Uma marca de cumprido dentro de um circulo.
  tarefas: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.5 2.5 4.5-5" />
    </>
  ),
  // Folha com linhas escritas e um canto dobrado: o mini relatorio.
  relatorios: (
    <>
      <path d="M14 3H6.5A1.5 1.5 0 005 4.5v15A1.5 1.5 0 006.5 21h11a1.5 1.5 0 001.5-1.5V8z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h4.5" />
    </>
  ),
  // Duas pessoas: a equipa.
  equipa: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.6 5.5-5.6s5.5 2.3 5.5 5.6" />
      <path d="M16 5.2a3.2 3.2 0 010 6" />
      <path d="M17.5 14.8c1.8.7 3 2.6 3 5.2" />
    </>
  ),
  // Etiquetas empilhadas: as palavras com que a empresa nomeia o trabalho.
  vocabulario: (
    <>
      <path d="M4 6.5h5M12 6.5h8" />
      <path d="M4 12h11M18 12h2" />
      <path d="M4 17.5h3M10 17.5h10" />
      <circle cx="10.5" cy="6.5" r="1.4" />
      <circle cx="16.5" cy="12" r="1.4" />
      <circle cx="8.5" cy="17.5" r="1.4" />
    </>
  ),
  // Um edificio: a casa.
  empresa: (
    <>
      <path d="M4 21V6.5a1.5 1.5 0 011.5-1.5h7A1.5 1.5 0 0114 6.5V21" />
      <path d="M14 11h4.5A1.5 1.5 0 0120 12.5V21" />
      <path d="M2.5 21h19" />
      <path d="M7 9h4M7 13h4M7 17h4M17 15h1M17 18h1" />
    </>
  ),
  recolher: <path d="M14.5 6.5L9 12l5.5 5.5" />,
  expandir: <path d="M9.5 6.5L15 12l-5.5 5.5" />,
};

export function Icone({
  nome,
  tamanho = 18,
}: {
  nome: NomeIcone;
  tamanho?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      style={{ ...TRACO, display: 'block', flex: `0 0 ${tamanho}px` }}
      aria-hidden="true"
      focusable="false"
    >
      {DESENHOS[nome]}
    </svg>
  );
}
