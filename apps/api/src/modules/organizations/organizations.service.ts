import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import type { ActualizarEmpresaInput, RegistarEmpresaInput } from '@nexora/shared';
import { BCRYPT_ROUNDS, env } from '../../config/env';
import { db } from '../../db/db';
import { organizations } from '../../db/schema/organizations.schema';
import { refreshTokens, users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import { logModulo, logger } from '../../utils/logger';
import { assinarAccessToken, gerarRefreshToken } from '../../utils/tokens';
import type { Sessao } from '../../utils/tokens';
import { registar } from '../audit.service';
import { slugificar } from './taxonomies.service';

/**
 * Criacao de uma empresa a partir da pagina publica.
 *
 * E a unica porta de entrada de quem ainda nao tem conta - antes disto, a unica forma de criar o
 * primeiro administrador era correr o seed, que apaga a base inteira.
 *
 * Empresa e administrador nascem na mesma transaccao. Uma empresa sem administrador nao teria
 * quem a gerisse e ficaria a ocupar o nome; um administrador sem empresa nao teria onde entrar.
 */
export async function registarEmpresa(
  dados: RegistarEmpresaInput,
  userAgent?: string,
): Promise<{
  utilizador: { id: string; nome: string; email: string; nivelAcesso: 'administrador' };
  empresa: { id: string; nome: string; moeda: string; slug: string };
  accessToken: string;
  refreshToken: string;
}> {
  const email = dados.administrador.email;

  const [jaExiste] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (jaExiste) throw erros.emailEmUso();

  const passwordHash = await bcrypt.hash(dados.administrador.password, BCRYPT_ROUNDS);
  const slug = await slugLivre(dados.empresa.nome);

  const criado = await db.transaction(async (tx) => {
    const [empresa] = await tx
      .insert(organizations)
      .values({
        nome: dados.empresa.nome,
        slug,
        moeda: dados.empresa.moeda,
        inicialLogotipo: iniciais(dados.empresa.nome),
      })
      .returning();

    if (!empresa) throw erros.interno('Não foi possível criar a empresa.');

    const [administrador] = await tx
      .insert(users)
      .values({
        organizationId: empresa.id,
        nome: dados.administrador.nome,
        email,
        passwordHash,
        // Quem cria a empresa nao precisa de se convidar a si proprio.
        funcao: 'Direcção',
        dataEntrada: new Date(),
        nivelAcesso: 'administrador',
        estado: 'activo',
      })
      .returning();

    if (!administrador) throw erros.interno('Não foi possível criar a conta de administrador.');

    await registar(tx, {
      organizationId: empresa.id,
      actorId: administrador.id,
      accao: 'empresa.criada',
      entidade: 'empresa',
      entidadeId: empresa.id,
      detalhe: { nome: empresa.nome },
    });

    return { empresa, administrador };
  });

  const { token, hash } = gerarRefreshToken();
  await db.insert(refreshTokens).values({
    userId: criado.administrador.id,
    tokenHash: hash,
    expiraEm: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DIAS * 86_400_000),
    userAgent: userAgent?.slice(0, 255) ?? null,
  });

  logger.info(
    logModulo('empresas', `Empresa criada: ${criado.empresa.id} por ${criado.administrador.id}`),
  );

  return {
    utilizador: {
      id: criado.administrador.id,
      nome: criado.administrador.nome,
      email: criado.administrador.email,
      nivelAcesso: 'administrador',
    },
    empresa: {
      id: criado.empresa.id,
      nome: criado.empresa.nome,
      moeda: criado.empresa.moeda,
      slug: criado.empresa.slug,
    },
    accessToken: assinarAccessToken({
      sub: criado.administrador.id,
      nivel: 'administrador',
      nome: criado.administrador.nome,
      org: criado.empresa.id,
    }),
    refreshToken: token,
  };
}

/**
 * Slug livre a partir do nome.
 * Duas empresas podem chamar-se o mesmo; o sufixo numerico resolve sem obrigar a pessoa a
 * inventar outro nome para a sua propria empresa.
 */
async function slugLivre(nome: string): Promise<string> {
  const base = slugificar(nome).replace(/_/g, '-') || 'empresa';

  const existentes = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(sql`${organizations.slug} = ${base} OR ${organizations.slug} LIKE ${`${base}-%`}`);

  if (!existentes.some((e) => e.slug === base)) return base;

  for (let n = 2; n < 1000; n += 1) {
    const tentativa = `${base}-${n}`;
    if (!existentes.some((e) => e.slug === tentativa)) return tentativa;
  }
  return `${base}-${Date.now()}`;
}

/** Uma ou duas letras para o logotipo enquanto nao houver imagem. */
function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = palavras[0]?.[0] ?? 'E';
  const segunda = palavras[1]?.[0] ?? '';
  return (primeira + segunda).toUpperCase().slice(0, 2);
}

/** Dados da empresa da sessao. */
export async function minhaEmpresa(sessao: Sessao) {
  const [empresa] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, sessao.org))
    .limit(1);

  if (!empresa) throw erros.naoEncontrado('Esta empresa');
  return empresa;
}

export async function actualizarEmpresa(sessao: Sessao, dados: ActualizarEmpresaInput) {
  const alteracoes: Record<string, unknown> = { updatedAt: new Date() };
  if (dados.nome !== undefined) alteracoes.nome = dados.nome;
  if (dados.moeda !== undefined) alteracoes.moeda = dados.moeda;
  if (dados.fusoHorario !== undefined) alteracoes.fusoHorario = dados.fusoHorario;
  if (dados.inicialLogotipo !== undefined) alteracoes.inicialLogotipo = dados.inicialLogotipo;
  if (dados.corMarca !== undefined) alteracoes.corMarca = dados.corMarca;

  const [empresa] = await db
    .update(organizations)
    .set(alteracoes)
    .where(eq(organizations.id, sessao.org))
    .returning();

  if (!empresa) throw erros.naoEncontrado('Esta empresa');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'empresa.actualizada',
    entidade: 'empresa',
    entidadeId: sessao.org,
    detalhe: { campos: Object.keys(alteracoes).filter((c) => c !== 'updatedAt') },
  });

  return empresa;
}
