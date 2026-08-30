import { deIso } from '@nexora/shared';

const SO_DIA = /^\d{4}-\d{2}-\d{2}$/;
const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Converte as datas de uma resposta JSON.
 *
 * A distincao entre os dois formatos importa. Uma deadline e um dia, e chega como `2026-08-29`:
 * se fosse lida com `new Date()` viraria meia-noite local, o que em fusos a oeste de Greenwich
 * atiraria a data para o dia anterior e faria um alerta saltar um escalao. Por isso os dias sao
 * lidos como meia-noite UTC, com a mesma funcao que o servidor usa, e so os instantes - a hora a
 * que um relatorio foi submetido - passam por `new Date()`.
 *
 * A conversao e feita pelo formato do texto e nao pelo nome do campo. Nenhum campo de texto deste
 * dominio tem a forma exacta de uma data ISO, por isso nao ha risco de converter prosa por engano.
 */
export function reviverDatas<T>(valor: unknown): T {
  return converter(valor) as T;
}

function converter(valor: unknown): unknown {
  if (typeof valor === 'string') {
    if (SO_DIA.test(valor)) return deIso(valor);
    if (INSTANTE.test(valor)) return new Date(valor);
    return valor;
  }

  if (Array.isArray(valor)) return valor.map(converter);

  if (valor !== null && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor)) saida[chave] = converter(v);
    return saida;
  }

  return valor;
}
