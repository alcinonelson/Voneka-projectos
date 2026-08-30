import { z } from 'zod';
import {
  zAlocacao,
  zDataIso,
  zEmail,
  zId,
  zNivelAcesso,
  zTexto,
  zTextoOpcional,
} from './common.schema';

/**
 * Registo de membro. Criar o membro cria a conta - nao ha um segundo passo de convite separado.
 *
 * As mensagens de erro dizem a consequencia, nao o formato: "O email é a credencial de acesso"
 * explica porque e obrigatorio, enquanto "campo obrigatório" nao explica nada.
 */
export const criarMembroSchema = z.object({
  nome: zTexto(3, 120, 'Indique o nome completo.'),
  email: zEmail,
  telefone: zTextoOpcional(32),
  funcao: zTexto(2, 80, 'Indique a função que a pessoa desempenha.'),
  /** Departamento do vocabulário da empresa. Nulo enquanto a empresa não definir nenhum. */
  departamentoId: zId.nullable().default(null),
  dataEntrada: zDataIso,
  alocacao: zAlocacao,
  nivelAcesso: zNivelAcesso,
  /** Projectos a que a pessoa fica alocada no momento do registo. */
  projectos: z.array(zId).max(50).default([]),
  /** Sem convite a conta e criada inactiva e a pessoa nao consegue entrar. */
  enviarConvite: z.boolean().default(true),
});
export type CriarMembroInput = z.infer<typeof criarMembroSchema>;

export const actualizarMembroSchema = criarMembroSchema
  .omit({ email: true, enviarConvite: true })
  .partial();
export type ActualizarMembroInput = z.infer<typeof actualizarMembroSchema>;

export const listarUtilizadoresSchema = z.object({
  procura: z.string().trim().max(120).optional(),
  nivelAcesso: zNivelAcesso.optional(),
});
export type ListarUtilizadoresInput = z.infer<typeof listarUtilizadoresSchema>;
