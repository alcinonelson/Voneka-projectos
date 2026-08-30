import { z } from 'zod';
import { hoje, paraIso } from '../calendar';
import { ESTADOS_TAREFA } from '../enums';
import {
  zAntecedencia,
  zDataIso,
  zEstadoTarefa,
  zId,
  zPrioridade,
  zTexto,
  zTextoOpcional,
} from './common.schema';

/**
 * Atribuicao de uma tarefa.
 *
 * As tarefas sao escritas por quem atribui, nunca pre-configuradas. O minimo de quatro
 * caracteres no titulo e o do design: quem recebe a tarefa tem de saber o que entregar, e
 * "ver" ou "ok" nao dizem nada.
 */
export const criarTarefaSchema = z.object({
  titulo: zTexto(4, 200, 'Escreva a tarefa de forma verificável — quem a receber tem de saber o que entregar.'),
  /** O que se espera como entrega. */
  descricao: zTextoOpcional(2000),
  projectoId: zId,
  faseId: zId.nullable().default(null),
  responsavelId: zId,
  deadline: zDataIso.refine((iso) => iso >= paraIso(hoje()), {
    message: 'A deadline não pode ser anterior a hoje.',
  }),
  esforcoEstimadoHoras: z.number().int().min(1).max(2000).default(8),
  prioridade: zPrioridade.default('normal'),
  antecedenciaAlerta: zAntecedencia.default(3),
  /** Quando verdadeiro, fechar a tarefa exige um mini relatório válido. */
  exigeRelatorio: z.boolean().default(true),
});
export type CriarTarefaInput = z.infer<typeof criarTarefaSchema>;

export const actualizarTarefaSchema = criarTarefaSchema
  .omit({ projectoId: true, deadline: true })
  .partial()
  .extend({
    deadline: zDataIso.optional(),
    estado: zEstadoTarefa.optional(),
  });
export type ActualizarTarefaInput = z.infer<typeof actualizarTarefaSchema>;

/** Filtros da lista de tarefas, na ordem em que aparecem no design. */
export const FILTROS_TAREFA = ['abertas', 'atrasadas', 'concluidas', 'todas'] as const;
export type FiltroTarefa = (typeof FILTROS_TAREFA)[number];

export const FILTRO_TAREFA_LABEL: Record<FiltroTarefa, string> = {
  abertas: 'Abertas',
  atrasadas: 'Atrasadas',
  concluidas: 'Concluídas',
  todas: 'Todas',
};

export const listarTarefasSchema = z.object({
  filtro: z.enum(FILTROS_TAREFA).default('abertas'),
  projectoId: zId.optional(),
  responsavelId: zId.optional(),
  /** Quando verdadeiro devolve apenas as tarefas de quem faz o pedido. */
  minhas: z.coerce.boolean().default(false),
});
export type ListarTarefasInput = z.infer<typeof listarTarefasSchema>;

export const pedirProrrogacaoSchema = z.object({
  novaDeadline: zDataIso,
  motivo: zTexto(10, 500, 'Explique porque precisa de mais prazo.'),
});
export type PedirProrrogacaoInput = z.infer<typeof pedirProrrogacaoSchema>;

/** Estados em que uma tarefa ainda conta como aberta. */
export const ESTADOS_ABERTOS = ESTADOS_TAREFA.filter((e) => e !== 'concluida');
