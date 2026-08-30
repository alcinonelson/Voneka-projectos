import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { alertaPrazo, deveNotificar, hoje, paraIso } from '@nexora/shared';
import { db } from '../../db/db';
import { notifications } from '../../db/schema/ops.schema';
import { projects } from '../../db/schema/projects.schema';
import { tasks } from '../../db/schema/tasks.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import { logModulo, logger } from '../../utils/logger';
import { enviarEmail, textoAlerta } from '../../utils/mailer';
import type { Sessao } from '../../utils/tokens';

export async function listar(sessao: Sessao, apenasPorLer = false) {
  const condicoes = [eq(notifications.userId, sessao.sub)];
  if (apenasPorLer) condicoes.push(eq(notifications.lida, false));

  return db
    .select()
    .from(notifications)
    .where(and(...condicoes))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function contarPorLer(sessao: Sessao): Promise<number> {
  const [linha] = await db
    .select({ n: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, sessao.sub), eq(notifications.lida, false)));
  return Number(linha?.n ?? 0);
}

export async function marcarLida(sessao: Sessao, notificationId: string) {
  const [actualizada] = await db
    .update(notifications)
    .set({ lida: true, lidaEm: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, sessao.sub)))
    .returning();

  if (!actualizada) throw erros.naoEncontrado('Esta notificação');
  return actualizada;
}

export async function marcarTodasLidas(sessao: Sessao): Promise<number> {
  const linhas = await db
    .update(notifications)
    .set({ lida: true, lidaEm: new Date() })
    .where(and(eq(notifications.userId, sessao.sub), eq(notifications.lida, false)))
    .returning({ id: notifications.id });
  return linhas.length;
}

/**
 * Percorre as deadlines e cria os avisos do dia.
 *
 * A antecedencia e a que foi escolhida ao atribuir cada tarefa, e nao um valor global: uma tarefa
 * de quarenta horas merece ser avisada com uma semana, uma de quatro nao.
 *
 * A idempotencia vem da `chaveUnica`, que junta tarefa, escalao e dia. Correr o job duas vezes na
 * mesma manha - por reinicio, por sobreposicao de instancias - nao repete um unico aviso, e e o
 * que permite que ele corra sem medo.
 */
export async function correrAlertas(referencia = hoje()): Promise<{ criadas: number }> {
  const abertas = await db
    .select({
      id: tasks.id,
      titulo: tasks.titulo,
      deadline: tasks.deadline,
      antecedenciaAlerta: tasks.antecedenciaAlerta,
      responsavelId: tasks.responsavelId,
      responsavelNome: users.nome,
      responsavelEmail: users.email,
      projectoId: projects.id,
      projectoNome: projects.nome,
      organizationId: tasks.organizationId,
    })
    .from(tasks)
    .innerJoin(users, eq(users.id, tasks.responsavelId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(ne(tasks.estado, 'concluida'), eq(projects.arquivado, false)));

  const dia = paraIso(referencia);
  let criadas = 0;

  for (const t of abertas) {
    if (!deveNotificar(t.deadline, t.antecedenciaAlerta, false, referencia)) continue;

    const alerta = alertaPrazo(t.deadline, false, referencia);
    const chaveUnica = `tarefa:${t.id}:${alerta.nivel}:${dia}`;

    const [criada] = await db
      .insert(notifications)
      .values({
        organizationId: t.organizationId,
        userId: t.responsavelId,
        tipo: 'prazo',
        titulo: `${alerta.texto}: ${t.titulo}`,
        detalhe: t.projectoNome,
        taskId: t.id,
        projectId: t.projectoId,
        chaveUnica,
        referenteA: referencia,
      })
      // Se ja existe o aviso deste escalao para esta tarefa hoje, nao ha nada a fazer.
      .onConflictDoNothing({ target: notifications.chaveUnica })
      .returning({ id: notifications.id });

    if (!criada) continue;
    criadas += 1;

    await enviarEmail({
      para: t.responsavelEmail,
      assunto: `${alerta.texto}: ${t.titulo}`,
      texto: textoAlerta(t.responsavelNome, t.titulo, alerta.texto, t.projectoNome),
    });

    await db
      .update(notifications)
      .set({ emailEnviadoEm: new Date() })
      .where(eq(notifications.id, criada.id));
  }

  logger.info(logModulo('alertas', `${criadas} avisos criados para ${dia}`));
  return { criadas };
}
