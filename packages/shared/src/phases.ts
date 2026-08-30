/**
 * Roteiro de fases: encadeamento, duracao e modelos.
 *
 * Portado de `gravarFases()` e da constante `MODELOS` em `NEXORA Projectos.dc.html`.
 *
 * A regra do encadeamento e a do design: uma fase de N semanas ocupa `N * 7 - 2` dias e a
 * seguinte comeca dois dias depois de a anterior terminar. Os dois dias sao a folga que separa
 * visualmente as barras no roteiro e que, na pratica, absorve o fim de semana de passagem entre
 * fases. As datas exactas afinam-se depois por arrasto, que escreve directamente em
 * `startsOn` / `endsOn` sem passar por aqui.
 */

import type { EstadoFase } from './enums';
import { diferencaEmDias, somarDias } from './calendar';

/** Folga em dias entre o fim de uma fase e o inicio da seguinte. */
export const FOLGA_ENTRE_FASES = 2;

/** Duracao maxima aceite para uma fase, em semanas. */
export const MAX_SEMANAS_FASE = 26;

/** Duracao de uma fase em dias, a partir do numero de semanas. */
export function duracaoEmDias(semanas: number): number {
  return limitarSemanas(semanas) * 7 - FOLGA_ENTRE_FASES;
}

/** Semanas correspondentes a uma duracao em dias. Inverso aproximado de `duracaoEmDias`. */
export function semanasDeDuracao(dias: number): number {
  return Math.max(1, Math.round(dias / 7));
}

/** Mantem as semanas dentro do intervalo aceite pelo editor de fases. */
export function limitarSemanas(semanas: number): number {
  if (!Number.isFinite(semanas)) return 1;
  return Math.min(MAX_SEMANAS_FASE, Math.max(1, Math.round(semanas)));
}

/** Uma fase tal como o editor a manipula, antes de ter datas. */
export interface RascunhoFase {
  nome: string;
  estado: EstadoFase;
  nota: string;
  semanas: number;
}

/** Uma fase ja encadeada, com datas reais. */
export interface FaseAgendada extends RascunhoFase {
  /** Posicao no roteiro, a comecar em 0. */
  ordem: number;
  startsOn: Date;
  endsOn: Date;
}

/**
 * Encadeia um roteiro completo a partir de uma data de inicio.
 *
 * As fases sao colocadas pela ordem do array recebido - e por isso que reordenar por arrasto no
 * editor e depois voltar a chamar esta funcao produz o roteiro correcto, sem calculo extra.
 * Fases sem nome sao descartadas: uma linha vazia no editor nao e uma fase.
 */
export function encadearFases(rascunhos: RascunhoFase[], inicio: Date): FaseAgendada[] {
  const validas = rascunhos.filter((f) => f.nome.trim().length > 0);
  const agendadas: FaseAgendada[] = [];
  let cursor = inicio;

  for (let i = 0; i < validas.length; i += 1) {
    const fase = validas[i] as RascunhoFase;
    const semanas = limitarSemanas(fase.semanas);
    const dias = duracaoEmDias(semanas);
    const startsOn = cursor;
    const endsOn = somarDias(startsOn, dias);

    agendadas.push({
      nome: fase.nome.trim(),
      estado: fase.estado,
      nota: fase.nota ?? '',
      semanas,
      ordem: i,
      startsOn,
      endsOn,
    });

    cursor = somarDias(endsOn, FOLGA_ENTRE_FASES);
  }

  return agendadas;
}

/** Data em que o roteiro encadeado termina, ou `null` se nao houver fases. */
export function fimDoRoteiro(fases: FaseAgendada[]): Date | null {
  const ultima = fases[fases.length - 1];
  return ultima ? ultima.endsOn : null;
}

/** Converte uma fase com datas de volta para rascunho, para abrir o editor. */
export function paraRascunho(fase: {
  nome: string;
  estado: EstadoFase;
  nota: string | null;
  startsOn: Date;
  endsOn: Date;
}): RascunhoFase {
  return {
    nome: fase.nome,
    estado: fase.estado,
    nota: fase.nota ?? '',
    semanas: semanasDeDuracao(diferencaEmDias(fase.startsOn, fase.endsOn)),
  };
}

/** Move um elemento de uma posicao para outra, devolvendo um novo array. */
export function reordenar<T>(lista: T[], de: number, para: number): T[] {
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) {
    return lista.slice();
  }
  const copia = lista.slice();
  const [movido] = copia.splice(de, 1);
  copia.splice(para, 0, movido as T);
  return copia;
}

/** Modelo de fases sugerido para uma natureza de projecto. */
export interface ModeloFase {
  nome: string;
  semanas: number;
}

/**
 * Rascunhos iniciais a partir do modelo de fases guardado na natureza.
 *
 * O modelo deixou de estar escrito no codigo: cada empresa define o seu ao criar a natureza. Uma
 * natureza sem modelo devolve uma fase em branco, para o editor abrir com uma linha onde escrever
 * em vez de um vazio sem accao.
 */
export function modeloParaRascunhos(modelo: ModeloFase[] | null | undefined): RascunhoFase[] {
  const linhas = modelo?.length ? modelo : [{ nome: '', semanas: 4 }];
  return linhas.map((m) => ({
    nome: m.nome,
    estado: 'planeada' as EstadoFase,
    nota: '',
    semanas: m.semanas,
  }));
}
