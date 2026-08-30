/**
 * Blocos de validacao reutilizados por todos os schemas.
 *
 * Os schemas Zod vivem no pacote partilhado porque servem os dois lados: o backend valida o
 * pedido com eles e o frontend deriva deles os tipos do formulario. Uma regra de validacao
 * escrita duas vezes acaba por divergir, e a divergencia aparece sempre do lado errado - o
 * formulario aceita e o servidor recusa, ou pior.
 */

import { z } from 'zod';
import { deIso } from '../calendar';
import {
  ANTECEDENCIAS,
  ESTADOS_FASE,
  ESTADOS_TAREFA,
  NIVEIS_ACESSO,
  PRIORIDADES,
  SAUDES,
  SITUACOES,
  TIPOS_TAXONOMIA,
} from '../enums';
import { NOMES_CHIP } from '../palette';

/** Constroi um enum Zod a partir de um array de codigos. */
function zEnum<T extends string>(valores: readonly T[]) {
  return z.enum(valores as unknown as [T, ...T[]]);
}

export const zSaude = zEnum(SAUDES);
export const zEstadoFase = zEnum(ESTADOS_FASE);
export const zEstadoTarefa = zEnum(ESTADOS_TAREFA);
export const zSituacao = zEnum(SITUACOES);
export const zNivelAcesso = zEnum(NIVEIS_ACESSO);
export const zPrioridade = zEnum(PRIORIDADES);
export const zTipoTaxonomia = zEnum(TIPOS_TAXONOMIA);
export const zCorChip = zEnum(NOMES_CHIP);

/**
 * Alocacao de uma pessoa, em percentagem.
 * Qualquer valor de 1 a 100: os 25/50/75/100 do formulario sao atalhos, nao a lista do possivel.
 */
export const zAlocacao = z
  .number()
  .int()
  .min(1, { message: 'A alocação vai de 1 a 100 por cento.' })
  .max(100, { message: 'A alocação vai de 1 a 100 por cento.' });

export const zAntecedencia = z
  .number()
  .int()
  .refine((v) => (ANTECEDENCIAS as readonly number[]).includes(v), {
    message: 'O alerta tem de ser 1 dia, 3 dias, 1 semana ou sem alerta.',
  });

export const zId = z.string().uuid({ message: 'Identificador inválido.' });

/**
 * Data de calendario no formato `aaaa-mm-dd`.
 * Recusa datas que nao existem, como 31 de Fevereiro, em vez de as deixar escorregar para o mes
 * seguinte como faz o construtor de `Date`.
 */
export const zDataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use uma data no formato aaaa-mm-dd.' })
  .refine(
    (iso) => {
      const data = deIso(iso);
      return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === iso;
    },
    { message: 'Essa data não existe no calendário.' },
  );

export const zEmail = z
  .string()
  .trim()
  .min(1, { message: 'O email é a credencial de acesso.' })
  .email({ message: 'Formato de email inválido.' })
  .toLowerCase();

/**
 * Password de conta.
 * O minimo de doze caracteres e deliberado: estas contas veem toda a carteira de uma empresa.
 */
export const zPassword = z
  .string()
  .min(12, { message: 'A palavra-passe precisa de pelo menos 12 caracteres.' })
  .max(128, { message: 'A palavra-passe não pode exceder 128 caracteres.' });

/** Texto obrigatorio com limites. */
export function zTexto(min: number, max: number, mensagem: string) {
  return z.string().trim().min(min, { message: mensagem }).max(max, {
    message: `Não pode exceder ${max} caracteres.`,
  });
}

/** Texto opcional que vira string vazia em vez de indefinido. */
export function zTextoOpcional(max: number) {
  return z.string().trim().max(max).optional().default('');
}

/** Paginacao comum a todas as listagens. */
export const zPaginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(200).default(50),
});
