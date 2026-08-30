import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/db';
import { auditLog } from '../db/schema/ops.schema';
import { users } from '../db/schema/users.schema';

/**
 * Historico de accoes.
 *
 * A gaveta do projecto promete que uma acção fica "registada no histórico do projecto"; esta
 * funcao e o que torna a promessa verdadeira.
 *
 * Aceita `tx` para poder ser chamada de dentro de uma transaccao: o registo de que uma tarefa foi
 * fechada tem de desaparecer junto com ela se a transaccao reverter, caso contrario o historico
 * passaria a contar coisas que nunca aconteceram.
 */
export interface EntradaAuditoria {
  organizationId: string;
  actorId: string | null;
  accao: string;
  entidade: string;
  entidadeId?: string | null;
  projectId?: string | null;
  detalhe?: Record<string, unknown>;
}

/**
 * O cliente da base de dados ou uma transaccao dele.
 * Descrito pelo que e preciso usar - `insert` - em vez de pelo tipo completo do Drizzle, que
 * mudaria a cada actualizacao da biblioteca.
 */
export type Executor = Pick<typeof db, 'insert'>;

export async function registar(executor: Executor, entrada: EntradaAuditoria): Promise<void> {
  await executor.insert(auditLog).values({
    organizationId: entrada.organizationId,
    actorId: entrada.actorId,
    accao: entrada.accao,
    entidade: entrada.entidade,
    entidadeId: entrada.entidadeId ?? null,
    projectId: entrada.projectId ?? null,
    detalhe: entrada.detalhe ?? null,
  });
}

/**
 * Historico de um projecto, do mais recente para o mais antigo.
 * A empresa entra na condicao: quem chama ja verificou o acesso ao projecto, mas o historico e
 * demasiado revelador para depender so disso.
 */
export async function historicoDoProjecto(
  organizationId: string,
  projectId: string,
  limite = 50,
) {
  return db
    .select({
      id: auditLog.id,
      accao: auditLog.accao,
      entidade: auditLog.entidade,
      detalhe: auditLog.detalhe,
      createdAt: auditLog.createdAt,
      autorNome: users.nome,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(and(eq(auditLog.organizationId, organizationId), eq(auditLog.projectId, projectId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(limite);
}
