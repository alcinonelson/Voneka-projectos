import bcrypt from 'bcryptjs';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import {
  type ActualizarMembroInput,
  type CriarMembroInput,
  type NivelAcesso,
  deIso,
} from '@nexora/shared';
import { DIAS_VALIDADE_CONVITE, env } from '../../config/env';
import { db } from '../../db/db';
import { projectMembers } from '../../db/schema/projects.schema';
import { tasks } from '../../db/schema/tasks.schema';
import { orgTaxonomies } from '../../db/schema/organizations.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import { logModulo, logger } from '../../utils/logger';
import { enviarEmail, textoConvite } from '../../utils/mailer';
import { gerarTokenConvite } from '../../utils/tokens';
import type { Sessao } from '../../utils/tokens';
import { exigirProjectosDaEmpresa, exigirTaxonomia } from '../access';
import { registar } from '../audit.service';

/**
 * Horas de trabalho de referencia num mes, a tempo inteiro.
 * Serve de denominador da carga; nao pretende ser uma verdade contabilistica, apenas uma escala
 * estavel que permita comparar pessoas entre si.
 */
const HORAS_MES_TEMPO_INTEIRO = 160;

export interface LinhaEquipa {
  id: string;
  nome: string;
  email: string;
  funcao: string;
  departamento: { id: string; rotulo: string; cor: string } | null;
  dataEntrada: Date;
  alocacao: number;
  nivelAcesso: NivelAcesso;
  estado: string;
  tarefasAbertas: number;
  /** Percentagem de ocupacao face a alocacao declarada. */
  carga: number;
  /** Percentagem de tarefas concluidas dentro do prazo. `null` sem historico. */
  cumprimento: number | null;
  activo: boolean;
  telefone: string | null;
  projectos: string[];
}

/**
 * Equipa e acessos.
 *
 * A carga e o cumprimento sao derivados das tarefas, nao escritos a mao. No design eram dois
 * arrays de constantes; aqui vem dos dados, o que significa que envelhecem sozinhos e que
 * atribuir mais uma tarefa a alguem se ve imediatamente na sua linha.
 */
export async function listarEquipa(sessao: Sessao): Promise<LinhaEquipa[]> {
  const pessoas = await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      funcao: users.funcao,
      departamentoId: users.departamentoId,
      departamentoRotulo: orgTaxonomies.rotulo,
      departamentoCor: orgTaxonomies.cor,
      dataEntrada: users.dataEntrada,
      alocacao: users.alocacao,
      nivelAcesso: users.nivelAcesso,
      estado: users.estado,
      activo: users.activo,
      telefone: users.telefone,
    })
    .from(users)
    .leftJoin(orgTaxonomies, eq(orgTaxonomies.id, users.departamentoId))
    .where(eq(users.organizationId, sessao.org))
    .orderBy(asc(users.nome))
    .limit(200);

  const abertas = await db
    .select({
      responsavelId: tasks.responsavelId,
      n: sql<number>`count(*)`,
      horas: sql<number>`COALESCE(SUM(${tasks.esforcoEstimadoHoras}), 0)`,
    })
    .from(tasks)
    .where(and(eq(tasks.organizationId, sessao.org), ne(tasks.estado, 'concluida')))
    .groupBy(tasks.responsavelId);

  const cumpridas = await db
    .select({
      responsavelId: tasks.responsavelId,
      total: sql<number>`count(*)`,
      aTempo: sql<number>`SUM(CASE WHEN ${tasks.concluidaEm}::date <= ${tasks.deadline} THEN 1 ELSE 0 END)`,
    })
    .from(tasks)
    .where(and(eq(tasks.organizationId, sessao.org), eq(tasks.estado, 'concluida')))
    .groupBy(tasks.responsavelId);

  const porAberta = new Map(abertas.map((a) => [a.responsavelId, a]));
  const porCumprida = new Map(cumpridas.map((c) => [c.responsavelId, c]));

  const alocacoes = pessoas.length
    ? await db
        .select({ userId: projectMembers.userId, projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(inArray(projectMembers.userId, pessoas.map((p) => p.id)))
    : [];
  const projectosPorPessoa = new Map<string, string[]>();
  for (const a of alocacoes) {
    const lista = projectosPorPessoa.get(a.userId) ?? [];
    lista.push(a.projectId);
    projectosPorPessoa.set(a.userId, lista);
  }

  return pessoas.map((p) => {
    const a = porAberta.get(p.id);
    const c = porCumprida.get(p.id);

    const capacidade = (p.alocacao / 100) * HORAS_MES_TEMPO_INTEIRO;
    const carga = capacidade > 0 ? Math.round((Number(a?.horas ?? 0) / capacidade) * 100) : 0;

    const total = Number(c?.total ?? 0);
    const cumprimento = total > 0 ? Math.round((Number(c?.aTempo ?? 0) / total) * 100) : null;

    return {
      id: p.id,
      nome: p.nome,
      email: p.email,
      funcao: p.funcao,
      departamento: p.departamentoId
        ? { id: p.departamentoId, rotulo: p.departamentoRotulo ?? '', cor: p.departamentoCor ?? 'neutro' }
        : null,
      dataEntrada: p.dataEntrada,
      alocacao: p.alocacao,
      nivelAcesso: p.nivelAcesso,
      estado: p.estado,
      tarefasAbertas: Number(a?.n ?? 0),
      carga,
      cumprimento,
      activo: p.activo,
      telefone: p.telefone,
      projectos: projectosPorPessoa.get(p.id) ?? [],
    };
  });
}

/** Lista simples para os selectores de responsavel, com a carga a vista. */
export async function listarParaSelector(sessao: Sessao) {
  const pessoas = await db
    .select({
      id: users.id,
      nome: users.nome,
      funcao: users.funcao,
      nivelAcesso: users.nivelAcesso,
    })
    .from(users)
    .where(and(eq(users.organizationId, sessao.org), eq(users.activo, true)))
    .orderBy(asc(users.nome))
    .limit(200);

  const abertas = await db
    .select({ responsavelId: tasks.responsavelId, n: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.organizationId, sessao.org), ne(tasks.estado, 'concluida')))
    .groupBy(tasks.responsavelId);

  const contagem = new Map(abertas.map((a) => [a.responsavelId, Number(a.n)]));

  return pessoas.map((p) => ({ ...p, tarefasAbertas: contagem.get(p.id) ?? 0 }));
}

async function enviarConvite(
  userId: string,
  nome: string,
  email: string,
): Promise<void> {
  const { token, hash } = gerarTokenConvite();
  const expiraEm = new Date(Date.now() + DIAS_VALIDADE_CONVITE * 86_400_000);

  await db
    .update(users)
    .set({ conviteTokenHash: hash, conviteExpiraEm: expiraEm, estado: 'convite_pendente' })
    .where(eq(users.id, userId));

  const ligacao = `${env.WEB_ORIGIN}/convite?token=${token}`;
  await enviarEmail({
    para: email,
    assunto: 'Acesso ao Voneka Projectos',
    texto: textoConvite(nome, ligacao, DIAS_VALIDADE_CONVITE),
  });
}

/**
 * Regista um membro, o que e o mesmo que criar a conta.
 *
 * Sem convite a conta fica sem palavra-passe e em estado pendente: existe para efeitos de
 * atribuicao e de historico, mas ninguem consegue entrar nela ate a Direccao enviar o convite.
 */
export async function criarMembro(sessao: Sessao, dados: CriarMembroInput) {
  if (dados.departamentoId) {
    await exigirTaxonomia(sessao, dados.departamentoId, 'departamento');
  }
  await exigirProjectosDaEmpresa(sessao, dados.projectos);

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, dados.email))
    .limit(1);

  if (existente) throw erros.emailEmUso();

  const criado = await db.transaction(async (tx) => {
    const [utilizador] = await tx
      .insert(users)
      .values({
        organizationId: sessao.org,
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone || null,
        funcao: dados.funcao,
        departamentoId: dados.departamentoId,
        dataEntrada: deIso(dados.dataEntrada),
        alocacao: dados.alocacao,
        nivelAcesso: dados.nivelAcesso,
        estado: 'convite_pendente',
      })
      .returning();

    if (!utilizador) throw erros.interno('Não foi possível criar a conta.');

    if (dados.projectos.length) {
      await tx.insert(projectMembers).values(
        dados.projectos.map((projectId) => ({ projectId, userId: utilizador.id })),
      );
    }

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: 'membro.criado',
      entidade: 'utilizador',
      entidadeId: utilizador.id,
      detalhe: { nivelAcesso: dados.nivelAcesso, projectos: dados.projectos.length },
    });

    return utilizador;
  });

  if (dados.enviarConvite) {
    await enviarConvite(criado.id, criado.nome, criado.email);
  }

  logger.info(logModulo('utilizadores', `Conta criada: ${criado.id}`));
  return criado;
}

/** Reenvia o convite, renovando o token e o prazo. */
export async function reenviarConvite(sessao: Sessao, userId: string) {
  const [utilizador] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, sessao.org)))
    .limit(1);
  if (!utilizador) throw erros.naoEncontrado('Esta conta');

  if (utilizador.estado === 'activo') {
    throw erros.conflito('Esta conta já foi activada.');
  }

  await enviarConvite(utilizador.id, utilizador.nome, utilizador.email);

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'membro.convite_reenviado',
    entidade: 'utilizador',
    entidadeId: userId,
  });

  return { email: utilizador.email };
}

export async function actualizarMembro(
  sessao: Sessao,
  userId: string,
  dados: ActualizarMembroInput,
) {
  const [alvo] = await db
    .select({
      id: users.id,
      nivelAcesso: users.nivelAcesso,
      activo: users.activo,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, sessao.org)))
    .limit(1);

  if (!alvo) throw erros.naoEncontrado('Esta conta');

  if (dados.departamentoId) {
    await exigirTaxonomia(sessao, dados.departamentoId, 'departamento');
  }
  if (dados.projectos) {
    await exigirProjectosDaEmpresa(sessao, dados.projectos);
  }

  // Uma Direccao que se despromova a si propria ficaria sem forma de voltar atras.
  if (dados.nivelAcesso && dados.nivelAcesso !== 'administrador' && userId === sessao.sub) {
    throw erros.conflito('Não pode retirar o seu próprio nível de Administrador.');
  }

  const tiraAdministrador =
    alvo.nivelAcesso === 'administrador' &&
    ((dados.nivelAcesso !== undefined && dados.nivelAcesso !== 'administrador') ||
      dados.activo === false);
  if (tiraAdministrador) {
    const [contagem] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, sessao.org),
          eq(users.nivelAcesso, 'administrador'),
          eq(users.activo, true),
          ne(users.id, userId),
        ),
      );
    if (Number(contagem?.n ?? 0) === 0) {
      throw erros.conflito('A empresa precisa de pelo menos um Administrador activo.');
    }
  }

  const alteracoes: Record<string, unknown> = { updatedAt: new Date() };
  if (dados.nome !== undefined) alteracoes.nome = dados.nome;
  if (dados.telefone !== undefined) alteracoes.telefone = dados.telefone || null;
  if (dados.funcao !== undefined) alteracoes.funcao = dados.funcao;
  if (dados.departamentoId !== undefined) alteracoes.departamentoId = dados.departamentoId;
  if (dados.dataEntrada !== undefined) alteracoes.dataEntrada = deIso(dados.dataEntrada);
  if (dados.alocacao !== undefined) alteracoes.alocacao = dados.alocacao;
  if (dados.nivelAcesso !== undefined) alteracoes.nivelAcesso = dados.nivelAcesso;
  if (dados.activo !== undefined) alteracoes.activo = dados.activo;

  const actualizado = await db.transaction(async (tx) => {
    const [linha] = await tx
      .update(users)
      .set(alteracoes)
      .where(and(eq(users.id, userId), eq(users.organizationId, sessao.org)))
      .returning();

    if (!linha) throw erros.naoEncontrado('Esta conta');

    if (dados.projectos) {
      await tx.delete(projectMembers).where(eq(projectMembers.userId, userId));
      if (dados.projectos.length) {
        await tx.insert(projectMembers).values(
          dados.projectos.map((projectId) => ({ projectId, userId })),
        );
      }
    }

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: 'membro.actualizado',
      entidade: 'utilizador',
      entidadeId: userId,
      detalhe: { campos: Object.keys(alteracoes).filter((c) => c !== 'updatedAt') },
    });

    return linha;
  });

  return actualizado;
}

/** Define a palavra-passe de uma conta directamente. Usado pelo seed e por testes. */
export async function definirPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(users)
    .set({ passwordHash, estado: 'activo', updatedAt: new Date() })
    .where(and(eq(users.id, userId)));
}
