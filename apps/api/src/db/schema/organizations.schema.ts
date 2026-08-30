import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tipoTaxonomiaEnum } from './enums.schema';

/**
 * Empresas.
 *
 * A unidade de isolamento do produto. Cada conta, projecto, tarefa e relatorio pertence a uma
 * empresa, e o identificador da empresa entra na clausula WHERE de todas as consultas - nao numa
 * filtragem posterior. Sem isso, um Administrador veria a carteira de toda a gente.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    /** Identificador legivel, derivado do nome. Reservado para URLs e para o assunto dos emails. */
    slug: text('slug').notNull(),
    moeda: text('moeda').notNull().default('MZN'),
    fusoHorario: text('fuso_horario').notNull().default('Africa/Maputo'),
    /** Uma ou duas letras mostradas enquanto a empresa nao carrega um logotipo. */
    inicialLogotipo: text('inicial_logotipo'),
    /** Nome de um chip da paleta partilhada, nunca um hex solto. */
    corMarca: text('cor_marca').notNull().default('azul'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnico: uniqueIndex('organizations_slug_unico').on(t.slug),
  }),
);

/**
 * Vocabulario da empresa: naturezas de projecto, estagios e departamentos.
 *
 * Estava escrito no codigo como enum fechado. Passou para aqui porque cada empresa nomeia o seu
 * trabalho a sua maneira, e impor "Implementacao" ou "Consultoria" a quem chama outra coisa
 * obriga a pessoa a traduzir mentalmente todos os dias.
 *
 * `codigo` e um slug ASCII estavel: o rotulo pode ser corrigido sem partir referencias.
 */
export const orgTaxonomies = pgTable(
  'org_taxonomies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    tipo: tipoTaxonomiaEnum('tipo').notNull(),
    codigo: text('codigo').notNull(),
    rotulo: text('rotulo').notNull(),
    /** Nome de um chip da paleta partilhada. Fora da lista, o interface cai no chip neutro. */
    cor: text('cor').notNull().default('neutro'),
    /**
     * Prefixo do codigo de projecto (PRJ-114). So para `tipo = natureza`.
     * Substitui o mapa fixo que existia no servico de projectos.
     */
    prefixo: text('prefixo'),
    /**
     * Modelo de fases carregado ao registar um projecto desta natureza:
     * `[{ nome, semanas }]`. So para `tipo = natureza`. Vazio significa roteiro em branco.
     */
    fasesModelo: jsonb('fases_modelo').$type<{ nome: string; semanas: number }[]>(),
    ordem: integer('ordem').notNull().default(0),
    /** Arquivar em vez de apagar: o que ja foi usado por um projecto continua a ler-se. */
    arquivado: boolean('arquivado').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codigoUnico: uniqueIndex('org_taxonomies_codigo_unico').on(t.organizationId, t.tipo, t.codigo),
    porTipo: index('org_taxonomies_tipo_idx').on(t.organizationId, t.tipo, t.ordem),
  }),
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  vocabulario: many(orgTaxonomies),
}));

export const orgTaxonomiesRelations = relations(orgTaxonomies, ({ one }) => ({
  empresa: one(organizations, {
    fields: [orgTaxonomies.organizationId],
    references: [organizations.id],
  }),
}));

export type Empresa = typeof organizations.$inferSelect;
export type NovaEmpresa = typeof organizations.$inferInsert;
export type Taxonomia = typeof orgTaxonomies.$inferSelect;
export type NovaTaxonomia = typeof orgTaxonomies.$inferInsert;
