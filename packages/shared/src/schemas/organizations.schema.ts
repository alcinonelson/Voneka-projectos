import { z } from 'zod';
import { MAX_SEMANAS_FASE } from '../phases';
import {
  zCorChip,
  zBooleanoQuery,
  zEmail,
  zId,
  zPassword,
  zTexto,
  zTextoOpcional,
  zTipoTaxonomia,
} from './common.schema';

/**
 * Criacao de uma empresa a partir da pagina publica.
 *
 * E a unica porta de entrada de quem ainda nao tem conta. Cria a empresa e a conta de
 * Administrador na mesma transaccao: uma empresa sem administrador nao teria como ser gerida, e
 * um administrador sem empresa nao teria onde trabalhar.
 */
export const registarEmpresaSchema = z
  .object({
    empresa: z.object({
      nome: zTexto(2, 160, 'Indique o nome da empresa.'),
      moeda: zTexto(3, 3, 'Indique o código da moeda, como MZN.').toUpperCase().default('MZN'),
    }),
    administrador: z.object({
      nome: zTexto(3, 120, 'Indique o seu nome completo.'),
      email: zEmail,
      password: zPassword,
      confirmacao: z.string(),
    }),
  })
  .refine((v) => v.administrador.password === v.administrador.confirmacao, {
    path: ['administrador', 'confirmacao'],
    message: 'As palavras-passe não coincidem.',
  });
export type RegistarEmpresaInput = z.infer<typeof registarEmpresaSchema>;

export const actualizarEmpresaSchema = z
  .object({
    nome: zTexto(2, 160, 'Indique o nome da empresa.'),
    moeda: zTexto(3, 3, 'Indique o código da moeda, como MZN.').toUpperCase(),
    fusoHorario: zTexto(3, 64, 'Indique o fuso horário.'),
    inicialLogotipo: z.string().trim().max(2).nullable(),
    corMarca: zCorChip,
  })
  .partial();
export type ActualizarEmpresaInput = z.infer<typeof actualizarEmpresaSchema>;

/** Uma linha do modelo de fases de uma natureza. */
export const modeloFaseSchema = z.object({
  nome: zTexto(2, 120, 'Dê um nome à fase.'),
  semanas: z.number().int().min(1).max(MAX_SEMANAS_FASE),
});

/**
 * Criacao de uma entrada do vocabulario da empresa.
 *
 * O `codigo` nao vem do formulario: e derivado do rotulo no servidor, para quem escreve nao ter
 * de perceber a diferenca entre o que se mostra e o que se guarda.
 */
export const criarTaxonomiaSchema = z.object({
  tipo: zTipoTaxonomia,
  rotulo: zTexto(2, 80, 'Escreva como chama a isto na sua empresa.'),
  cor: zCorChip.default('neutro'),
  /** Prefixo do código de projecto. Só para naturezas; derivado do rótulo quando vem vazio. */
  prefixo: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,4}$/, { message: 'O prefixo são 2 a 4 letras, como PRJ.' })
    .toUpperCase()
    .optional(),
  /** Modelo de fases. Só para naturezas. Vazio abre o roteiro em branco. */
  fasesModelo: z.array(modeloFaseSchema).max(30).default([]),
});
export type CriarTaxonomiaInput = z.infer<typeof criarTaxonomiaSchema>;

export const actualizarTaxonomiaSchema = criarTaxonomiaSchema
  .omit({ tipo: true })
  .extend({ arquivado: z.boolean(), ordem: z.number().int().min(0).max(999) })
  .partial();
export type ActualizarTaxonomiaInput = z.infer<typeof actualizarTaxonomiaSchema>;

export const listarTaxonomiasSchema = z.object({
  tipo: zTipoTaxonomia.optional(),
  /** Por omissão o arquivado fica de fora: só o ecrã de vocabulário o quer ver. */
  incluirArquivadas: zBooleanoQuery.default(false),
});
export type ListarTaxonomiasInput = z.infer<typeof listarTaxonomiasSchema>;

/** Criacao em lote, usada pelo assistente de arranque quando se aceita um conjunto de partida. */
export const criarTaxonomiasEmLoteSchema = z.object({
  entradas: z.array(criarTaxonomiaSchema).min(1).max(60),
});
export type CriarTaxonomiasEmLoteInput = z.infer<typeof criarTaxonomiasEmLoteSchema>;

/** Nova ordem de uma familia do vocabulario. Os ids tem de ser todos da mesma empresa e tipo. */
export const reordenarTaxonomiasSchema = z.object({
  tipo: zTipoTaxonomia,
  ids: z.array(zId).min(1).max(80),
});
export type ReordenarTaxonomiasInput = z.infer<typeof reordenarTaxonomiasSchema>;

/** Referência a uma entrada do vocabulário, tal como a API a devolve. */
export interface TaxonomiaRef {
  id: string;
  tipo: 'natureza' | 'estagio' | 'departamento';
  codigo: string;
  rotulo: string;
  cor: string;
  prefixo: string | null;
  fasesModelo: { nome: string; semanas: number }[];
  ordem: number;
  arquivado: boolean;
  /** Quantos registos dependem desta entrada. Decide se pode ser apagada ou só arquivada. */
  emUso?: number;
}

export const zTaxonomiaId = zId;
export const zNotaVocabulario = zTextoOpcional(280);
