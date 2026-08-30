import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { estadoFaseEnum, saudeEnum } from './enums.schema';
import { organizations, orgTaxonomies } from './organizations.schema';
import { users } from './users.schema';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Codigo visivel: PRJ-114, CNC-041. O prefixo vem da natureza escolhida pela empresa. */
    codigo: text('codigo').notNull(),
    nome: text('nome').notNull(),
    /** Empresa cliente, ou frente interna. */
    cliente: text('cliente').notNull(),
    /**
     * Natureza e estagio sao vocabulario da empresa, nao enums do produto.
     * `restrict` porque apagar uma natureza que classifica projectos deixaria-os sem nome - o
     * caminho certo e arquivar a entrada, que a mantem legivel e fora das listas de escolha.
     */
    naturezaId: uuid('natureza_id')
      .notNull()
      .references(() => orgTaxonomies.id, { onDelete: 'restrict' }),
    estagioId: uuid('estagio_id')
      .notNull()
      .references(() => orgTaxonomies.id, { onDelete: 'restrict' }),
    saude: saudeEnum('saude').notNull().default('no_prazo'),
    responsavelId: uuid('responsavel_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    inicio: date('inicio', { mode: 'date' }).notNull(),
    /** Deadline de entrega do projecto. */
    deadline: date('deadline', { mode: 'date' }).notNull(),
    /**
     * Avanco declarado pela gestora, em percentagem.
     *
     * Nao e derivado das tarefas de proposito. O produto assume que a percentagem e um juizo de
     * quem gere, e que o acompanhamento a serio vem dos mini relatorios - derivar a barra da
     * contagem de tarefas daria a percentagem uma autoridade que ela nao tem.
     */
    avancoPct: integer('avanco_pct').notNull().default(0),
    orcamentoCentavos: bigint('orcamento_centavos', { mode: 'number' }),
    consumidoCentavos: bigint('consumido_centavos', { mode: 'number' }),
    /** Dias de antecedencia do alerta de deadline. Zero desliga o alerta. */
    antecedenciaAlerta: integer('antecedencia_alerta').notNull().default(3),
    arquivado: boolean('arquivado').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    /** O codigo e unico dentro da empresa. Duas empresas podem ambas ter um PRJ-001. */
    codigoUnico: uniqueIndex('projects_codigo_unico').on(t.organizationId, t.codigo),
    porResponsavel: index('projects_responsavel_idx').on(t.responsavelId),
    porEmpresa: index('projects_organization_idx').on(t.organizationId, t.naturezaId),
  }),
);

/** Pessoas alocadas a um projecto. Define tambem o que um Gestor e um Colaborador conseguem ver. */
export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
    porUtilizador: index('project_members_user_idx').on(t.userId),
  }),
);

/**
 * Fases do roteiro.
 *
 * `startsOn` e `endsOn` sao as datas em vigor, alteradas por arrasto no roteiro.
 * `planeadoStartsOn` e `planeadoEndsOn` guardam o plano original tal como foi gravado no editor -
 * e o que permite a accao "Repor plano original" devolver a verdade em vez de adivinhar.
 */
export const phases = pgTable(
  'phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    estado: estadoFaseEnum('estado').notNull().default('planeada'),
    nota: text('nota'),
    /** Posicao no roteiro, a comecar em zero. */
    ordem: integer('ordem').notNull(),
    startsOn: date('starts_on', { mode: 'date' }).notNull(),
    endsOn: date('ends_on', { mode: 'date' }).notNull(),
    planeadoStartsOn: date('planeado_starts_on', { mode: 'date' }).notNull(),
    planeadoEndsOn: date('planeado_ends_on', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porProjecto: index('phases_project_idx').on(t.projectId, t.ordem),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  empresa: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  natureza: one(orgTaxonomies, {
    fields: [projects.naturezaId],
    references: [orgTaxonomies.id],
  }),
  estagio: one(orgTaxonomies, { fields: [projects.estagioId], references: [orgTaxonomies.id] }),
  responsavel: one(users, { fields: [projects.responsavelId], references: [users.id] }),
  fases: many(phases),
  membros: many(projectMembers),
}));

export const phasesRelations = relations(phases, ({ one }) => ({
  projecto: one(projects, { fields: [phases.projectId], references: [projects.id] }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  projecto: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  utilizador: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export type Projecto = typeof projects.$inferSelect;
export type NovoProjecto = typeof projects.$inferInsert;
export type Fase = typeof phases.$inferSelect;
export type NovaFase = typeof phases.$inferInsert;
