import type { CSSProperties } from 'react';
import { COR, MARCA, type NomeChip, chip } from '@nexora/shared';

/**
 * Tokens do design Voneka Projectos.
 *
 * O design e todo estilos em linha, com uma escala muito particular - 12.5px de fonte, 15px de
 * padding vertical nas linhas de tabela, raios de 7 a 12px. Portar essa escala para tokens
 * tipados mantem a fidelidade ao pixel e permite que uma alteracao de escala se faca num sitio.
 *
 * As cores vem de `@nexora/shared`, para nao existirem duas paletas.
 */

export { COR, MARCA, chip };

/** Escala tipografica, em pixeis, tal como no design. */
export const FONTE = {
  /** Etiquetas de secao em maiusculas. */
  micro: 10.5,
  minima: 11,
  nota: 11.5,
  pequena: 12,
  corpo: 12.5,
  base: 13,
  linha: 13.5,
  media: 14,
  seccao: 14.5,
  titulo: 16,
  numero: 23,
  destaque: 30,
} as const;

export const PESO = {
  normal: 400,
  medio: 500,
  forte: 600,
} as const;

export const RAIO = {
  pequeno: 4,
  botao: 6,
  campo: 7,
  medio: 8,
  cartao: 12,
} as const;

export const ESPACO = {
  /** Padding vertical das linhas de tabela: densidade contida, como manda o design. */
  linha: 15,
  celula: 20,
  cartao: 20,
  seccao: 22,
  pagina: 28,
} as const;

/**
 * Faixas de ecra.
 *
 * Uma so definicao, consumida pelo CSS e pelo JavaScript. Duas listas de breakpoints divergem a
 * terceira alteracao, e a divergencia aparece sempre como um ecra que muda de forma a meio.
 *
 * Os valores nao sao arbitrarios: 680 e onde uma tabela deixa de caber sem mentir, 1024 e o
 * tablet em paisagem, e 1440 e onde a densidade completa volta a ser confortavel.
 */
export const ECRA = {
  /** Abaixo disto e telemovel: tudo empilha e os modais viram folhas. */
  movel: 680,
  /** Abaixo disto a barra lateral e uma gaveta, nao uma coluna. */
  tablet: 1024,
  /** A partir daqui cabe a densidade completa das tabelas. */
  largo: 1440,
} as const;

export type FaixaEcra = 'movel' | 'tablet' | 'amplo';

export const LARGURA = {
  sidebar: 236,
  /** Menu recolhido: so os icones, com alvo de toque a manter-se confortavel. */
  sidebarRecolhida: 64,
  cabecalho: 64,
  conteudoMax: 1320,
  /** Coluna de nomes no roteiro. */
  roteiroNomes: 232,
} as const;

/**
 * Os alvos de toque nao tem token.
 *
 * A altura minima de 44px e aplicada em `styles.css`, sob `@media (pointer: coarse)`, e nao aqui:
 * depende do tipo de ponteiro e nao da largura, e resolvida em CSS nao obriga a re-renderizar
 * nada quando alguem liga um rato a um tablet.
 */

/**
 * A unica sombra do sistema, e so nos tres sitios onde o design a admite:
 * gaveta, modal e barra do roteiro a ser arrastada.
 */
export const SOMBRA = {
  gaveta: '-8px 0 32px rgba(16, 24, 40, 0.10)',
  modal: '0 20px 48px rgba(16, 24, 40, 0.18)',
  arrasto: '0 6px 16px rgba(16, 24, 40, 0.22)',
  pastilha: '0 1px 2px rgba(16, 24, 40, 0.10)',
} as const;

/** Numeros alinham sempre por tabela, para as colunas nao dancarem. */
export const numerico: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export const cartao: CSSProperties = {
  background: COR.branco,
  border: `1px solid ${COR.borda}`,
  borderRadius: RAIO.cartao,
};

/**
 * Cartao com superficie tingida.
 *
 * O fundo vem do chip da familia escolhida, que ja e um tom muito claro, e a borda e a mesma cor
 * a assumir-se um pouco mais. A cor aqui nao decora: distingue quadros que dizem coisas
 * diferentes, e no painel muda com o estado da carteira. Por isso e uma funcao e nao uma
 * constante - o tom e uma decisao de quem chama, e essa decisao vem sempre dos dados.
 */
export function superficie(tom: NomeChip): CSSProperties {
  const c = chip(tom);
  return {
    background: c.bg,
    border: `1px solid ${c.bg === COR.linha ? COR.borda : c.bg}`,
    borderRadius: RAIO.cartao,
  };
}

/** Linha interna de tabela: separador leve e padding contido. */
export const linhaTabela: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: `${ESPACO.linha}px ${ESPACO.celula}px`,
  borderBottom: `1px solid ${COR.linha}`,
};

/** Titulo de seccao, que no design vive fora do cartao. */
export const tituloSeccao: CSSProperties = {
  fontSize: FONTE.seccao,
  fontWeight: PESO.forte,
  letterSpacing: '-0.005em',
};

export const etiquetaMaiuscula: CSSProperties = {
  fontSize: FONTE.micro,
  fontWeight: PESO.forte,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: COR.suave,
};

export const textoTruncado: CSSProperties = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

/**
 * Botao principal: verde escuro da marca.
 * Era tinta cheia. Passou a verde para a accao principal falar a lingua da casa - e o verde
 * escolhido e o legivel (7.80:1 com branco por cima), nao o verde claro do simbolo.
 */
export const botaoPrincipal: CSSProperties = {
  height: 32,
  padding: '0 13px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  background: MARCA.verdeTexto,
  color: COR.branco,
  border: 'none',
  borderRadius: RAIO.campo,
  fontSize: FONTE.corpo,
  fontWeight: PESO.medio,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** Botao secundario: contorno leve. */
export const botaoSecundario: CSSProperties = {
  height: 32,
  padding: '0 12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: COR.branco,
  color: COR.tinta,
  border: `1px solid ${COR.borda}`,
  borderRadius: RAIO.campo,
  fontSize: FONTE.corpo,
  fontWeight: PESO.medio,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const campo: CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 11px',
  border: `1px solid ${COR.bordaForte}`,
  borderRadius: RAIO.campo,
  fontSize: FONTE.base,
  color: COR.tinta,
  background: COR.branco,
  fontFamily: 'inherit',
  outline: 'none',
};

export const areaTexto: CSSProperties = {
  ...campo,
  height: 'auto',
  minHeight: 104,
  padding: '10px 11px',
  lineHeight: 1.6,
  resize: 'vertical',
};

export const rotuloCampo: CSSProperties = {
  display: 'block',
  fontSize: FONTE.pequena,
  fontWeight: PESO.medio,
  color: COR.texto,
  marginBottom: 6,
};

/** Mensagem de validacao inline: diz a consequencia, nao apenas o formato. */
export const erroCampo: CSSProperties = {
  fontSize: FONTE.nota,
  color: COR.vermelho,
  marginTop: 6,
  lineHeight: 1.5,
};

/** Ponto de cor usado nas naturezas de projecto e na saude. */
export function ponto(cor: string, tamanho = 8): CSSProperties {
  return {
    width: tamanho,
    height: tamanho,
    borderRadius: '50%',
    flex: `0 0 ${tamanho}px`,
    background: cor,
    display: 'inline-block',
  };
}

/** Etiqueta com fundo suave: estagio, estado, situacao, nivel de acesso. */
export function etiqueta(fg: string, bg: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: FONTE.nota,
    fontWeight: PESO.forte,
    padding: '4px 9px',
    borderRadius: RAIO.botao,
    whiteSpace: 'nowrap',
    color: fg,
    background: bg,
  };
}

/** Pastilha de filtro, no estado ligado ou desligado. */
export function pastilha(activa: boolean): CSSProperties {
  return {
    height: 30,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: `1px solid ${activa ? COR.tinta : COR.borda}`,
    background: activa ? COR.tinta : COR.branco,
    color: activa ? COR.branco : COR.texto,
    fontWeight: activa ? PESO.forte : PESO.normal,
    borderRadius: RAIO.campo,
    fontSize: FONTE.corpo,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
}

/** Barra de avanco. */
export function barra(largura = 132): CSSProperties {
  return {
    width: largura,
    flex: `0 0 ${largura}px`,
    height: 6,
    borderRadius: 3,
    background: COR.linha,
    overflow: 'hidden',
  };
}
