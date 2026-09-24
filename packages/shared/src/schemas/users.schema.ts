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
  /** Como a pessoa entra. Ver `MODO_ACESSO`. */
  acesso: z.enum(['ligacao', 'password', 'nenhum']).default('ligacao'),
});
export type CriarMembroInput = z.infer<typeof criarMembroSchema>;
export type ModoAcesso = CriarMembroInput['acesso'];

/**
 * - `ligacao`: convite cuja ligacao o Administrador recebe para enviar como quiser. Com SMTP
 *   configurado segue tambem por email - nao ha modo "so email", porque a ligacao na mao nunca
 *   atrapalha e sem SMTP e a unica forma de a fazer chegar.
 * - `password`: palavra-passe temporaria gerada pelo sistema, a trocar no primeiro acesso.
 * - `nenhum`: a conta existe para atribuicao e historico, mas ninguem entra nela.
 */
export const MODO_ACESSO: Record<ModoAcesso, string> = {
  ligacao: 'Ligação de convite',
  password: 'Palavra-passe temporária',
  nenhum: 'Sem acesso por agora',
};

/**
 * O que o Administrador recebe depois de dar acesso a alguem. A ligacao e a palavra-passe so
 * existem nesta resposta: na base de dados ficam apenas os hashes.
 */
export interface AcessoEmitido {
  email: string;
  ligacao?: string;
  password?: string;
  /** Data ISO ate quando a ligacao vale. */
  expiraEm?: string;
  enviadoPorEmail: boolean;
}

export const actualizarMembroSchema = criarMembroSchema
  .omit({ email: true, acesso: true })
  .extend({ activo: z.boolean() })
  .partial();
export type ActualizarMembroInput = z.infer<typeof actualizarMembroSchema>;

export const listarUtilizadoresSchema = z.object({
  procura: z.string().trim().max(120).optional(),
  nivelAcesso: zNivelAcesso.optional(),
});
export type ListarUtilizadoresInput = z.infer<typeof listarUtilizadoresSchema>;
