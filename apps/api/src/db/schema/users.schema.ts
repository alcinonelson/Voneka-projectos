import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { estadoContaEnum, nivelAcessoEnum } from './enums.schema';
import { organizations, orgTaxonomies } from './organizations.schema';

/**
 * Contas de utilizador.
 *
 * Criar um membro cria a conta: nao ha um registo de pessoa separado do registo de acesso. Ate a
 * pessoa aceitar o convite, `passwordHash` fica nulo e o estado e `convite_pendente` - e essa a
 * conta que a tabela de Equipa mostra com a accao "Reenviar".
 *
 * Uma conta pertence a uma empresa. O email e unico em todo o sistema e nao apenas dentro da
 * empresa: assim o login nao precisa de perguntar "de que empresa?" antes de saber quem e a
 * pessoa, e ninguem consegue descobrir que empresas existem experimentando emails.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    nome: text('nome').notNull(),
    /** Credencial de acesso. Guardado em minusculas para que o login nao dependa de maiusculas. */
    email: text('email').notNull(),
    /** Nulo enquanto o convite nao for aceite. */
    passwordHash: text('password_hash'),
    telefone: text('telefone'),
    funcao: text('funcao').notNull(),
    /** Departamento do vocabulario da empresa. Nulo enquanto a empresa nao definir nenhum. */
    departamentoId: uuid('departamento_id').references(() => orgTaxonomies.id, {
      onDelete: 'set null',
    }),
    dataEntrada: date('data_entrada', { mode: 'date' }).notNull(),
    /** Percentagem de alocacao da pessoa, de 1 a 100. */
    alocacao: integer('alocacao').notNull().default(100),
    nivelAcesso: nivelAcessoEnum('nivel_acesso').notNull().default('colaborador'),
    estado: estadoContaEnum('estado').notNull().default('convite_pendente'),
    /**
     * Convite guardado como hash, pela mesma razao que a palavra-passe: quem ler a base de dados
     * nao deve conseguir entrar na conta de ninguem.
     */
    conviteTokenHash: text('convite_token_hash'),
    conviteExpiraEm: timestamp('convite_expira_em', { withTimezone: true }),
    /** Conta desactivada mantem o historico mas deixa de poder entrar. */
    activo: boolean('activo').notNull().default(true),
    ultimoLoginEm: timestamp('ultimo_login_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnico: uniqueIndex('users_email_unico').on(t.email),
    porEmpresa: index('users_organization_idx').on(t.organizationId, t.nivelAcesso),
  }),
);

/**
 * Sessoes activas.
 *
 * O token e guardado hashado e roda a cada refresh: uma copia roubada do valor guardado nao serve
 * para entrar, e reutilizar um token ja rodado denuncia-se.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    revogadoEm: timestamp('revogado_em', { withTimezone: true }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porUtilizador: index('refresh_tokens_user_idx').on(t.userId),
    porHash: uniqueIndex('refresh_tokens_hash_unico').on(t.tokenHash),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  empresa: one(organizations, { fields: [users.organizationId], references: [organizations.id] }),
  departamento: one(orgTaxonomies, {
    fields: [users.departamentoId],
    references: [orgTaxonomies.id],
  }),
  sessoes: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  utilizador: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export type Utilizador = typeof users.$inferSelect;
export type NovoUtilizador = typeof users.$inferInsert;
