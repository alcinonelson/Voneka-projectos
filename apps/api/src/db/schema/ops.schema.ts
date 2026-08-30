import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';
import { projects } from './projects.schema';
import { tasks } from './tasks.schema';
import { users } from './users.schema';

/**
 * Notificacoes de prazo.
 *
 * `chaveUnica` existe para tornar o job idempotente: identifica a tarefa, o escalao e o dia, de
 * modo a que correr o job duas vezes no mesmo dia - por reinicio, por sobreposicao de instancias -
 * nao encha a caixa de ninguem com o mesmo aviso repetido.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    detalhe: text('detalhe'),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    /** Identidade do aviso: `tarefa:<id>:atraso:2026-08-29`. */
    chaveUnica: text('chave_unica').notNull(),
    /** Dia a que o aviso diz respeito. */
    referenteA: date('referente_a', { mode: 'date' }).notNull(),
    lida: boolean('lida').notNull().default(false),
    lidaEm: timestamp('lida_em', { withTimezone: true }),
    emailEnviadoEm: timestamp('email_enviado_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    chave: uniqueIndex('notifications_chave_unica').on(t.chaveUnica),
    porUtilizador: index('notifications_user_idx').on(t.userId, t.lida),
  }),
);

/**
 * Historico de accoes.
 *
 * A gaveta do projecto promete "registado no historico do projecto"; esta tabela e o que torna
 * essa promessa verdadeira. Guarda o autor, a accao e a entidade, nunca dados sensiveis.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    accao: text('accao').notNull(),
    entidade: text('entidade').notNull(),
    entidadeId: uuid('entidade_id'),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    detalhe: jsonb('detalhe'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porProjecto: index('audit_log_project_idx').on(t.projectId, t.createdAt),
    porEntidade: index('audit_log_entidade_idx').on(t.entidade, t.entidadeId),
  }),
);

export type Notificacao = typeof notifications.$inferSelect;
export type RegistoAuditoria = typeof auditLog.$inferSelect;
