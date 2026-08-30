/**
 * Paleta NEXORA e as funcoes de cor do dominio.
 *
 * Portado de `NEXORA Projectos.dc.html`: constantes do topo do bloco `data-dc-script` e as
 * funcoes `estagioCor`, `saudeCor`, `tipoCor`, `estadoCor`, `situacaoCor`, `acessoCor`.
 *
 * Vive no pacote partilhado porque o backend tambem precisa destas cores: o painel devolve
 * decisoes ja com o seu semaforo, e um relatorio devolve a cor da sua situacao. Uma cor definida
 * em dois sitios diverge; definida aqui, nao.
 */

import type { EstadoFase, EstadoTarefa, NivelAcesso, Saude, Situacao } from './enums';

/**
 * Cores da marca Voneka, extraidas do logotipo oficial em voneka.co.mz.
 *
 * O simbolo e um galao facetado: turquesa em cima a esquerda, verde palido em cima a direita,
 * losango verde em baixo. Estas tres cores sao a identidade e nao se inventam.
 *
 * **Regra que impede a cor de mentir**: estas cores vestem o *cromo* - a marca, a barra lateral,
 * os estados activos, o heroi da landing, as ligacoes. Os verdes **semanticos** mais abaixo
 * (`corSaude` no prazo, `corSituacao` sem obstaculos, `corBarraAvanco`) sao outra coisa e nao se
 * tocam. Se a cor da casa fosse a mesma que a cor de "esta tudo bem", deixaria de se saber qual
 * delas esta a falar.
 *
 * Nem o verde nem o turquesa servem para **texto** sobre branco: dao 2.29:1 e 3.31:1, abaixo dos
 * 4.5:1 exigidos. Para texto usam-se `verdeTexto` (7.80:1) e `turquesaTexto` (5.20:1).
 */
export const MARCA = {
  /** Losango inferior do simbolo e letreiro. Preenchimentos e marca, nunca texto. */
  verde: '#65BE70',
  /** Faceta superior esquerda. Preenchimentos e marca, nunca texto. */
  turquesa: '#179E92',
  /** Faceta superior direita. Superficies muito claras. */
  verdePalido: '#E4F0CF',
  /** Superficie escura da casa: a barra lateral e o painel de marca. */
  verdeEscuro: '#0E2E23',
  /** Verde legivel sobre branco. */
  verdeTexto: '#155D48',
  /** Turquesa legivel sobre branco. Substitui o azul no que e informativo. */
  turquesaTexto: '#0E7A70',
  /** Fundo tingido para superficies turquesa. */
  turquesaFundo: '#E6F6F3',
} as const;

/** Cores base. Sem gradientes, sem sombras decorativas. */
export const COR = {
  /** Tinta: texto principal e accao escura. */
  tinta: '#101828',
  /** Tinta em hover. */
  tintaHover: '#1D2939',
  /** Texto secundario. */
  texto: '#475467',
  /** Texto de apoio. */
  textoSuave: '#667085',
  /** Texto muito suave, etiquetas. */
  suave: '#98A2B3',
  /** Bordas de cartao e de campo. */
  borda: '#EAECF0',
  /** Borda em enfase ou hover. */
  bordaForte: '#D0D5DD',
  /** Linhas internas de tabela. */
  linha: '#F2F4F7',
  /** Fundo da aplicacao. */
  fundo: '#F7F8FA',
  /** Fundo de linha em hover. */
  fundoHover: '#FCFCFD',
  /** Fundo de campo inactivo. */
  fundoCampo: '#F9FAFB',
  /** Fundo de item de navegacao activo. */
  fundoNav: '#F4F5F7',
  branco: '#FFFFFF',

  /**
   * Azul.
   *
   * Ja nao e a cor da casa - essa e o verde Voneka. Fica disponivel para as etiquetas do
   * vocabulario, porque uma empresa pode continuar a querer uma natureza azul, e para os graficos.
   * O que era cromo azul - ligacoes, botoes, estado em curso - passou a turquesa da marca.
   */
  azul: '#2C5FF6',
  azulEscuro: '#1E45C4',
  azulFundo: '#EFF4FF',

  /** Atalhos para a marca, para os ecras nao terem de importar duas coisas. */
  marca: '#65BE70',
  marcaTurquesa: '#179E92',
  marcaPalido: '#E4F0CF',
  marcaEscuro: '#0E2E23',
  marcaTexto: '#155D48',
  marcaTurquesaTexto: '#0E7A70',
  marcaTurquesaFundo: '#E6F6F3',

  verde: '#067647',
  verdeVivo: '#12B76A',
  verdeFundo: '#ECFDF3',

  ambar: '#B54708',
  ambarVivo: '#F79009',
  ambarFundo: '#FFFAEB',

  vermelho: '#B42318',
  vermelhoVivo: '#F04438',
  vermelhoCheio: '#D92D20',
  vermelhoFundo: '#FEF3F2',
  vermelhoBorda: '#FDA29B',

  violeta: '#5925DC',
  violetaVivo: '#7A5AF8',
  violetaFundo: '#F4F3FF',

  turquesa: '#0E7090',
  turquesaVivo: '#06AED4',
  turquesaFundo: '#ECFDFF',

  rosa: '#C11574',
  rosaVivo: '#EE46BC',
  rosaFundo: '#FDF2FA',

  /** Polegar da barra de deslocamento. */
  scrollbar: '#D5D9E0',
} as const;

/** Par de cores: primeiro plano e fundo. */
export interface ParCor {
  fg: string;
  bg: string;
}

/** Cor de uma etiqueta do vocabulario: texto, fundo e ponto. */
export interface Chip extends ParCor {
  ponto: string;
}

/**
 * Paleta das etiquetas do vocabulario da empresa.
 *
 * Uma taxonomia guarda o *nome* de um chip e nao um hex: assim uma empresa escolhe a cor de uma
 * natureza sem poder produzir um par ilegivel, e o dia em que o produto ganhar tema escuro basta
 * redefinir os chips aqui.
 */
export const CHIPS = {
  neutro: { fg: COR.texto, bg: COR.linha, ponto: COR.suave },
  tinta: { fg: COR.tinta, bg: COR.linha, ponto: COR.tinta },
  azul: { fg: COR.azulEscuro, bg: COR.azulFundo, ponto: COR.azul },
  verde: { fg: COR.verde, bg: COR.verdeFundo, ponto: COR.verdeVivo },
  ambar: { fg: COR.ambar, bg: COR.ambarFundo, ponto: COR.ambarVivo },
  vermelho: { fg: COR.vermelho, bg: COR.vermelhoFundo, ponto: COR.vermelhoVivo },
  violeta: { fg: COR.violeta, bg: COR.violetaFundo, ponto: COR.violetaVivo },
  turquesa: { fg: COR.turquesa, bg: COR.turquesaFundo, ponto: COR.turquesaVivo },
  rosa: { fg: COR.rosa, bg: COR.rosaFundo, ponto: COR.rosaVivo },
} as const satisfies Record<string, Chip>;

export type NomeChip = keyof typeof CHIPS;
export const NOMES_CHIP = Object.keys(CHIPS) as NomeChip[];

/**
 * Resolve o nome de um chip.
 *
 * Nunca lanca e nunca devolve `undefined`: o vocabulario e escrito por quem usa o produto, pelo
 * que um nome desconhecido - de uma linha antiga, de um pedido forjado - tem de degradar para
 * neutro e nao rebentar o ecra a meio de uma tabela.
 */
export function chip(nome: string | null | undefined): Chip {
  if (!nome) return CHIPS.neutro;
  return (CHIPS as Record<string, Chip>)[nome] ?? CHIPS.neutro;
}

/** Cor do ponto de saude e da barra de avanco. Portado de `saudeCor`. */
export function corSaude(saude: Saude): string {
  switch (saude) {
    case 'no_prazo':
      return COR.verdeVivo;
    case 'em_risco':
      return COR.ambarVivo;
    case 'atrasado':
      return COR.vermelhoVivo;
  }
}

/**
 * Cor da barra de avanco de um projecto.
 * Um projecto no prazo usa tinta, nao verde: o verde e reservado para o que ja esta cumprido.
 */
export function corBarraAvanco(saude: Saude): string {
  switch (saude) {
    case 'atrasado':
      return COR.vermelhoVivo;
    case 'em_risco':
      return COR.ambarVivo;
    case 'no_prazo':
      return COR.tinta;
  }
}

/** Cor de uma etiqueta de estado de fase ou de tarefa. Portado de `estadoCor`. */
export function corEstado(estado: EstadoFase | EstadoTarefa): ParCor {
  switch (estado) {
    case 'concluida':
      return { fg: COR.verde, bg: COR.verdeFundo };
    case 'atrasada':
      return { fg: COR.vermelho, bg: COR.vermelhoFundo };
    case 'em_curso':
      // Turquesa da marca, e nao o azul de antes: o que esta em curso e informacao, e o
      // informativo do produto passou a falar na lingua da casa.
      return { fg: MARCA.turquesaTexto, bg: MARCA.turquesaFundo };
    default:
      return { fg: COR.texto, bg: COR.linha };
  }
}

/** Cores de uma barra do roteiro: fundo, texto e borda. */
export interface CorBarra {
  bg: string;
  fg: string;
  bd: string;
}

/** Cor de uma barra de fase no gantt. Portado do bloco `gantt` do design. */
export function corBarraFase(estado: EstadoFase): CorBarra {
  switch (estado) {
    case 'concluida':
      return { bg: COR.tinta, fg: COR.branco, bd: COR.tinta };
    case 'em_curso':
      return { bg: MARCA.turquesa, fg: COR.branco, bd: MARCA.turquesa };
    case 'atrasada':
      return { bg: COR.vermelhoFundo, fg: COR.vermelho, bd: COR.vermelhoBorda };
    case 'planeada':
      return { bg: COR.fundoCampo, fg: COR.textoSuave, bd: COR.borda };
  }
}

/** Cor da etiqueta de situacao de um mini relatorio. Portado de `situacaoCor`. */
export function corSituacao(situacao: Situacao): ParCor {
  switch (situacao) {
    case 'sem_obstaculos':
      return { fg: COR.verde, bg: COR.verdeFundo };
    case 'com_obstaculo':
      return { fg: COR.ambar, bg: COR.ambarFundo };
    case 'bloqueado':
      return { fg: COR.vermelho, bg: COR.vermelhoFundo };
  }
}

/** Cor da etiqueta de nivel de acesso. Portado de `acessoCor`. */
export function corAcesso(nivel: NivelAcesso): ParCor {
  switch (nivel) {
    case 'administrador':
      return { fg: COR.tinta, bg: COR.linha };
    case 'gestor':
      return { fg: MARCA.turquesaTexto, bg: MARCA.turquesaFundo };
    case 'colaborador':
      return { fg: COR.texto, bg: COR.fundoCampo };
  }
}

/**
 * Cor do cumprimento de prazos de uma pessoa, em percentagem.
 * Acima de 85 e verde, acima de 75 e ambar, abaixo disso e vermelho.
 */
export function corCumprimento(pct: number): string {
  if (pct >= 85) return COR.verde;
  if (pct >= 75) return COR.ambar;
  return COR.vermelho;
}

/** Leitura da carga de uma pessoa, em percentagem. */
export function leituraCarga(carga: number): { label: string; fg: string; barra: string } {
  if (carga > 90) return { label: 'Sobrecarregada', fg: COR.vermelho, barra: COR.vermelhoVivo };
  if (carga > 75) return { label: 'Alta', fg: COR.ambar, barra: COR.ambarVivo };
  return { label: 'Equilibrada', fg: COR.verde, barra: COR.verdeVivo };
}
