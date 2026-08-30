import { z } from 'zod';
import { MAX_SEMANAS_FASE } from '../phases';
import {
  zAntecedencia,
  zDataIso,
  zEstadoFase,
  zId,
  zSaude,
  zTexto,
  zTextoOpcional,
} from './common.schema';

/** Uma linha do editor de fases: nome, estado, nota e duracao em semanas. */
export const rascunhoFaseSchema = z.object({
  nome: zTexto(2, 120, 'Dê um nome à fase.'),
  estado: zEstadoFase.default('planeada'),
  nota: zTextoOpcional(500),
  semanas: z.number().int().min(1).max(MAX_SEMANAS_FASE),
});
export type RascunhoFaseInput = z.infer<typeof rascunhoFaseSchema>;

export const criarProjectoSchema = z
  .object({
    nome: zTexto(3, 160, 'Dê um nome ao projecto.'),
    cliente: zTexto(2, 160, 'Indique a empresa ou a frente interna.'),
    /** Natureza e estágio vêm do vocabulário da empresa, não de uma lista fixa. */
    naturezaId: zId,
    estagioId: zId,
    responsavelId: zId,
    inicio: zDataIso,
    /** Deadline de entrega. Sem ela nao ha alerta nem acompanhamento. */
    deadline: zDataIso,
    orcamentoCentavos: z.number().int().min(0).nullable().default(null),
    /** Pessoas alocadas ao projecto no registo. */
    pessoas: z.array(zId).max(100).default([]),
    antecedenciaAlerta: zAntecedencia.default(3),
    /** Roteiro inicial. Vem pre-preenchido pelo modelo da natureza, mas e sempre editavel. */
    fases: z.array(rascunhoFaseSchema).min(1, { message: 'Um projecto precisa de pelo menos uma fase.' }),
  })
  .refine((v) => v.deadline >= v.inicio, {
    path: ['deadline'],
    message: 'A entrega não pode ser anterior ao arranque do projecto.',
  });
export type CriarProjectoInput = z.infer<typeof criarProjectoSchema>;

export const actualizarProjectoSchema = z
  .object({
    nome: zTexto(3, 160, 'Dê um nome ao projecto.'),
    cliente: zTexto(2, 160, 'Indique a empresa ou a frente interna.'),
    naturezaId: zId,
    estagioId: zId,
    saude: zSaude,
    responsavelId: zId,
    deadline: zDataIso,
    orcamentoCentavos: z.number().int().min(0).nullable(),
    consumidoCentavos: z.number().int().min(0).nullable(),
    antecedenciaAlerta: zAntecedencia,
  })
  .partial();
export type ActualizarProjectoInput = z.infer<typeof actualizarProjectoSchema>;

export const listarProjectosSchema = z.object({
  /** `todos` e `em_risco` sao filtros transversais; o resto e o id de uma natureza da empresa. */
  filtro: z.union([z.literal('todos'), z.literal('em_risco'), zId]).default('todos'),
});
export type ListarProjectosInput = z.infer<typeof listarProjectosSchema>;

/** Grava o roteiro completo de um projecto, reencadeando as datas pela ordem recebida. */
export const gravarRoteiroSchema = z.object({
  /** Data de arranque do roteiro. Por omissao mantem o inicio da primeira fase actual. */
  inicio: zDataIso.optional(),
  fases: z.array(rascunhoFaseSchema).min(1, { message: 'Um roteiro precisa de pelo menos uma fase.' }),
});
export type GravarRoteiroInput = z.infer<typeof gravarRoteiroSchema>;

/**
 * Reagendamento de uma fase por arrasto no roteiro.
 * Move e redimensiona sao a mesma operacao vista de outro angulo: ambas escrevem duas datas.
 */
export const reagendarFaseSchema = z
  .object({
    startsOn: zDataIso,
    endsOn: zDataIso,
  })
  .refine((v) => v.endsOn >= v.startsOn, {
    path: ['endsOn'],
    message: 'O fim da fase não pode ser anterior ao início.',
  });
export type ReagendarFaseInput = z.infer<typeof reagendarFaseSchema>;
