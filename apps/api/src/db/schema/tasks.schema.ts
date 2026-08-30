import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  estadoProrrogacaoEnum,
  estadoTarefaEnum,
  prioridadeEnum,
  situacaoEnum,
  validacaoEnum,
} from './enums.schema';
import { organizations } from './organizations.schema';
import { phases, projects } from './projects.schema';
import { users } from './users.schema';

/**
 * Tarefas atribuidas.
 *
 * Sao escritas por quem atribui, nunca pre-configuradas. `atribuidoPorId` fica registado porque o
 * colaborador precisa de saber de quem veio a funcao, e porque uma prorrogacao tem de chegar a
 * pessoa certa.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * Redundante face ao projecto, e de proposito: poe o filtro de empresa no indice de cada
     * consulta de tarefas sem obrigar a um join com projects so para saber de quem sao.
     */
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Fase do roteiro a que a tarefa pertence. Nula quando a fase foi entretanto removida. */
    phaseId: uuid('phase_id').references(() => phases.id, { onDelete: 'set null' }),
    titulo: text('titulo').notNull(),
    /** O que se espera como entrega. */
    descricao: text('descricao'),
    responsavelId: uuid('responsavel_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    atribuidoPorId: uuid('atribuido_por_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    deadline: date('deadline', { mode: 'date' }).notNull(),
    esforcoEstimadoHoras: integer('esforco_estimado_horas').notNull().default(8),
    esforcoRealHoras: integer('esforco_real_horas').notNull().default(0),
    prioridade: prioridadeEnum('prioridade').notNull().default('normal'),
    antecedenciaAlerta: integer('antecedencia_alerta').notNull().default(3),
    /** Quando verdadeiro, fechar a tarefa exige um mini relatorio valido. */
    exigeRelatorio: boolean('exige_relatorio').notNull().default(true),
    estado: estadoTarefaEnum('estado').notNull().default('pendente'),
    concluidaEm: timestamp('concluida_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porProjecto: index('tasks_project_idx').on(t.projectId),
    porResponsavel: index('tasks_responsavel_idx').on(t.responsavelId),
    /** A lista de tarefas ordena sempre por deadline, dentro da empresa. */
    porDeadline: index('tasks_deadline_idx').on(t.organizationId, t.deadline),
    porEstado: index('tasks_estado_idx').on(t.organizationId, t.estado),
  }),
);

/**
 * Mini relatorios.
 *
 * Um relatorio existe sempre ligado a tarefa que fechou - e a razao de a criacao do relatorio e o
 * fecho da tarefa correrem na mesma transaccao. E este texto, e nao a percentagem de avanco, que
 * da o follow-up a Direccao.
 */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    situacao: situacaoEnum('situacao').notNull(),
    texto: text('texto').notNull(),
    esforcoRealHoras: integer('esforco_real_horas').notNull().default(0),
    /** Referencia, ligacao ou nota de onde ficou o resultado. */
    provaExecucao: text('prova_execucao'),
    validacao: validacaoEnum('validacao').notNull().default('a_espera'),
    validadoPorId: uuid('validado_por_id').references(() => users.id, { onDelete: 'set null' }),
    validadoEm: timestamp('validado_em', { withTimezone: true }),
    observacao: text('observacao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porTarefa: index('reports_task_idx').on(t.taskId),
    porAutor: index('reports_autor_idx').on(t.autorId),
    porValidacao: index('reports_validacao_idx').on(t.organizationId, t.validacao),
  }),
);

/** Pedidos de prorrogacao de prazo, feitos pelo colaborador e decididos por quem atribuiu. */
export const taskExtensions = pgTable(
  'task_extensions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    solicitanteId: uuid('solicitante_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deadlineAnterior: date('deadline_anterior', { mode: 'date' }).notNull(),
    novaDeadline: date('nova_deadline', { mode: 'date' }).notNull(),
    motivo: text('motivo').notNull(),
    estado: estadoProrrogacaoEnum('estado').notNull().default('pendente'),
    decididoPorId: uuid('decidido_por_id').references(() => users.id, { onDelete: 'set null' }),
    decididoEm: timestamp('decidido_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porTarefa: index('task_extensions_task_idx').on(t.taskId),
  }),
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  projecto: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  fase: one(phases, { fields: [tasks.phaseId], references: [phases.id] }),
  responsavel: one(users, { fields: [tasks.responsavelId], references: [users.id] }),
  atribuidoPor: one(users, { fields: [tasks.atribuidoPorId], references: [users.id] }),
  relatorios: many(reports),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  tarefa: one(tasks, { fields: [reports.taskId], references: [tasks.id] }),
  autor: one(users, { fields: [reports.autorId], references: [users.id] }),
}));

export type Tarefa = typeof tasks.$inferSelect;
export type NovaTarefa = typeof tasks.$inferInsert;
export type Relatorio = typeof reports.$inferSelect;
export type NovoRelatorio = typeof reports.$inferInsert;
