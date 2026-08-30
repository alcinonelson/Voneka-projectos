import { z } from 'zod';
import { zId, zSituacao, zTextoOpcional } from './common.schema';

/**
 * Minimo de caracteres do mini relatorio. Portado de `submeter()` no design.
 *
 * Nao e um numero arbitrario a fazer de obstaculo: e o que separa um relato de um "feito". A
 * Direccao decide a partir deste texto, e por isso a regra vive no servidor - o formulario
 * apenas a antecipa.
 */
export const MIN_CARACTERES_RELATORIO = 25;

export const MENSAGEM_RELATORIO_CURTO =
  'Escreva pelo menos uma frase completa: a gestão decide a partir deste texto.';

/**
 * Conclusao de uma tarefa com o seu mini relatorio.
 *
 * Fechar a tarefa e escrever o relatorio sao a mesma operacao, e por isso viajam no mesmo
 * pedido: separa-los abriria a janela em que uma tarefa fica fechada sem relato nenhum.
 */
export const concluirTarefaSchema = z.object({
  situacao: zSituacao,
  texto: z
    .string()
    .trim()
    .min(MIN_CARACTERES_RELATORIO, { message: MENSAGEM_RELATORIO_CURTO })
    .max(4000, { message: 'O relatório não pode exceder 4000 caracteres.' }),
  /** Esforco real gasto, em horas. Alimenta a leitura de carga da equipa. */
  esforcoRealHoras: z.number().int().min(0).max(2000),
  /** Prova de execucao: referencia, ligacao ou nota de onde ficou o resultado. */
  provaExecucao: zTextoOpcional(500),
});
export type ConcluirTarefaInput = z.infer<typeof concluirTarefaSchema>;

export const listarRelatoriosSchema = z.object({
  projectoId: zId.optional(),
  autorId: zId.optional(),
  situacao: zSituacao.optional(),
  /** Quando verdadeiro devolve apenas os relatorios de quem faz o pedido. */
  meus: z.coerce.boolean().default(false),
});
export type ListarRelatoriosInput = z.infer<typeof listarRelatoriosSchema>;

export const validarRelatorioSchema = z
  .object({
    /** Validar aceita a entrega; escalar leva o obstaculo a Direccao. */
    decisao: z.enum(['validar', 'escalar']),
    observacao: zTextoOpcional(1000),
  })
  .superRefine((v, ctx) => {
    if (v.decisao === 'escalar' && !v.observacao.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['observacao'],
        message: 'Ao escalar, escreva o que precisa da Direcção.',
      });
    }
  });
export type ValidarRelatorioInput = z.infer<typeof validarRelatorioSchema>;
