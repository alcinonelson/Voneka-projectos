/**
 * Moeda. A base e o metical mocambicano e nunca aparece escrita a mao no codigo.
 *
 * Os valores monetarios circulam como inteiros em centavos. Guardar meticais em virgula
 * flutuante acumula erro de arredondamento em somas de orcamento, que e exactamente onde uma
 * direccao financeira repara.
 */

export const MOEDA_BASE = 'MZN' as const;
export const SIMBOLO_MOEDA = 'MT' as const;

/**
 * Separador de milhares: espaco simples, como nos orcamentos semeados do design.
 * Um espaco fino tipografico leria melhor, mas quebraria a comparacao com o design e o valor
 * deixaria de sobreviver a um copiar e colar para uma folha de calculo.
 */
const SEPARADOR_MILHARES = ' ';

/**
 * Formata centavos como valor legivel: `420000000` fica `4 200 000 MT`.
 * Sem casas decimais - a carteira raciocina em meticais inteiros.
 */
export function formatarMetical(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '—';
  const meticais = Math.round(centavos / 100);
  const digitos = String(Math.abs(meticais)).replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILHARES);
  const sinal = meticais < 0 ? '-' : '';
  return `${sinal}${digitos} ${SIMBOLO_MOEDA}`;
}

/**
 * Le um valor escrito por uma pessoa - `4 200 000`, `4.200.000 MT`, `4200000` - em centavos.
 * Devolve `null` se nao houver numero nenhum no texto.
 */
export function lerMetical(texto: string): number | null {
  const limpo = (texto ?? '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '');
  if (!limpo) return null;
  const valor = Number(limpo.replace(',', '.'));
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100);
}

/** Percentagem de orcamento consumido, arredondada. Devolve `null` sem orcamento definido. */
export function percentagemConsumida(
  orcamentoCentavos: number | null | undefined,
  consumidoCentavos: number | null | undefined,
): number | null {
  if (!orcamentoCentavos || orcamentoCentavos <= 0) return null;
  return Math.round(((consumidoCentavos ?? 0) / orcamentoCentavos) * 100);
}
