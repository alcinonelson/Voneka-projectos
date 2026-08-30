import { pgEnum } from 'drizzle-orm/pg-core';
import {
  ESTADOS_CONTA,
  ESTADOS_FASE,
  ESTADOS_TAREFA,
  NIVEIS_ACESSO,
  PRIORIDADES,
  SAUDES,
  SITUACOES,
  TIPOS_TAXONOMIA,
  VALIDACOES,
} from '@nexora/shared';

/**
 * Enums do Postgres, construidos a partir dos codigos de `@nexora/shared`.
 *
 * Construi-los a partir do pacote partilhado em vez de os repetir aqui garante que a base de
 * dados so aceita valores que o dominio conhece.
 *
 * O que esta aqui e logica do produto - saude, estado de tarefa, nivel de acesso - e nao muda de
 * empresa para empresa. O vocabulario que cada empresa nomeia a sua maneira (natureza do projecto,
 * estagio, departamento) vive em `org_taxonomies`, nao num enum.
 */
function tupla<T extends string>(valores: readonly T[]): [T, ...T[]] {
  return valores as unknown as [T, ...T[]];
}

export const tipoTaxonomiaEnum = pgEnum('tipo_taxonomia', tupla(TIPOS_TAXONOMIA));
export const saudeEnum = pgEnum('saude', tupla(SAUDES));
export const estadoFaseEnum = pgEnum('estado_fase', tupla(ESTADOS_FASE));
export const estadoTarefaEnum = pgEnum('estado_tarefa', tupla(ESTADOS_TAREFA));
export const situacaoEnum = pgEnum('situacao', tupla(SITUACOES));
export const validacaoEnum = pgEnum('validacao', tupla(VALIDACOES));
export const nivelAcessoEnum = pgEnum('nivel_acesso', tupla(NIVEIS_ACESSO));
export const estadoContaEnum = pgEnum('estado_conta', tupla(ESTADOS_CONTA));
export const prioridadeEnum = pgEnum('prioridade', tupla(PRIORIDADES));

/** Estado de um pedido de prorrogacao de prazo. */
export const estadoProrrogacaoEnum = pgEnum('estado_prorrogacao', [
  'pendente',
  'aceite',
  'recusada',
]);
