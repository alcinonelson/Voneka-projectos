import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { VOCABULARIO_SUGERIDO } from '@nexora/shared';
import { BCRYPT_ROUNDS } from '../config/env';
import { logModulo, logger } from '../utils/logger';
import { db, fecharLigacao } from './db';
import { organizations, orgTaxonomies } from './schema/organizations.schema';
import { users } from './schema/users.schema';

/**
 * Cria a empresa real e a sua conta de Administrador.
 *
 * Ao contrario de `seed.ts`, isto **nao apaga nada**. E idempotente: se a empresa ou a conta ja
 * existirem, sao reaproveitadas e o que falta e acrescentado. Correr duas vezes nao duplica nem
 * destroi - o que importa quando o alvo e uma base com dados a serio.
 *
 * Existe porque nem sempre se quer passar pela pagina publica: uma instalacao nova, uma base
 * reposta, ou uma conta de Direccao que se perdeu, resolvem-se aqui sem abrir o navegador.
 *
 *   pnpm --filter @nexora/api seed:admin
 *
 * A palavra-passe vem de `ADMIN_PASSWORD`. Sem ela, e gerada uma forte e impressa uma unica vez:
 * uma palavra-passe fixa no codigo para a conta que ve toda a carteira seria um convite.
 */

const EMPRESA = {
  nome: 'Voneka SU, Lda',
  slug: 'voneka-su',
  inicial: 'VS',
  moeda: 'MZN',
  corMarca: 'azul',
};

const ADMINISTRADOR = {
  nome: 'Alcino Maido',
  email: 'alcino.maido99@gmail.com',
  funcao: 'Direcção',
};

/** Palavra-passe forte e legivel, para poder ser transcrita sem enganos. */
function gerarPassword(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const corpo = Array.from(
    crypto.randomBytes(16),
    (b) => alfabeto[b % alfabeto.length] as string,
  ).join('');
  // Garante que satisfaz o minimo de 12 caracteres e tem simbolo, sem depender da sorte.
  return `${corpo}#26`;
}

function codigoDe(rotulo: string): string {
  return rotulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function main(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD ?? gerarPassword();
  const geradaAqui = !process.env.ADMIN_PASSWORD;

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD precisa de pelo menos 12 caracteres.');
  }

  // --- Empresa -------------------------------------------------------------
  let [empresa] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, EMPRESA.slug))
    .limit(1);

  if (empresa) {
    logger.info(logModulo('seed-admin', `Empresa ja existia: ${empresa.nome}`));
  } else {
    [empresa] = await db
      .insert(organizations)
      .values({
        nome: EMPRESA.nome,
        slug: EMPRESA.slug,
        moeda: EMPRESA.moeda,
        inicialLogotipo: EMPRESA.inicial,
        corMarca: EMPRESA.corMarca,
      })
      .returning();
    if (!empresa) throw new Error('Falha ao criar a empresa.');
    logger.info(logModulo('seed-admin', `Empresa criada: ${empresa.nome}`));
  }

  // --- Conta de Administrador ---------------------------------------------
  const [existente] = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMINISTRADOR.email))
    .limit(1);

  if (existente && existente.organizationId !== empresa.id) {
    throw new Error(
      `O email ${ADMINISTRADOR.email} ja pertence a outra empresa. O email e unico em todo o sistema.`,
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existente) {
    // Repor o acesso e a razao mais comum para correr isto uma segunda vez.
    await db
      .update(users)
      .set({
        passwordHash,
        nivelAcesso: 'administrador',
        estado: 'activo',
        activo: true,
        conviteTokenHash: null,
        conviteExpiraEm: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existente.id));
    logger.info(logModulo('seed-admin', `Conta existente reposta: ${ADMINISTRADOR.email}`));
  } else {
    await db.insert(users).values({
      organizationId: empresa.id,
      nome: ADMINISTRADOR.nome,
      email: ADMINISTRADOR.email,
      passwordHash,
      funcao: ADMINISTRADOR.funcao,
      dataEntrada: new Date(),
      nivelAcesso: 'administrador',
      estado: 'activo',
    });
    logger.info(logModulo('seed-admin', `Administrador criado: ${ADMINISTRADOR.email}`));
  }

  // --- Vocabulario de partida ---------------------------------------------
  // Sem naturezas e estagios nao se regista um projecto, e o portal abriria num beco. Ficam as
  // sugestoes, que sao editaveis em Empresa -> Vocabulario como quaisquer outras.
  let criadas = 0;
  for (const tipo of ['natureza', 'estagio', 'departamento'] as const) {
    for (const [ordem, v] of VOCABULARIO_SUGERIDO[tipo].entries()) {
      const codigo = codigoDe(v.rotulo);
      const [ja] = await db
        .select({ id: orgTaxonomies.id })
        .from(orgTaxonomies)
        .where(
          and(
            eq(orgTaxonomies.organizationId, empresa.id),
            eq(orgTaxonomies.tipo, tipo),
            eq(orgTaxonomies.codigo, codigo),
          ),
        )
        .limit(1);
      if (ja) continue;

      await db.insert(orgTaxonomies).values({
        organizationId: empresa.id,
        tipo,
        codigo,
        rotulo: v.rotulo,
        cor: v.cor,
        prefixo: tipo === 'natureza' ? (v.prefixo ?? null) : null,
        fasesModelo: tipo === 'natureza' ? (v.fasesModelo ?? []) : null,
        ordem,
      });
      criadas += 1;
    }
  }
  logger.info(logModulo('seed-admin', `${criadas} entradas de vocabulario acrescentadas`));

  logger.info(logModulo('seed-admin', 'Concluido'));
  logger.info(logModulo('seed-admin', `Empresa: ${EMPRESA.nome}`));
  logger.info(logModulo('seed-admin', `Entrar com: ${ADMINISTRADOR.email}`));
  if (geradaAqui) {
    logger.info(
      logModulo('seed-admin', `Palavra-passe gerada (guarde-a agora, nao volta a ser mostrada): ${password}`),
    );
  } else {
    logger.info(logModulo('seed-admin', 'Palavra-passe: a que definiu em ADMIN_PASSWORD'));
  }

  await fecharLigacao();
}

main().catch(async (erro: unknown) => {
  logger.error(logModulo('seed-admin', `Falhou: ${(erro as Error).message}`));
  await fecharLigacao();
  process.exit(1);
});
