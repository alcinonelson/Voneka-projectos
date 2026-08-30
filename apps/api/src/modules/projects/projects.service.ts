import { and, asc, count, eq, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  type ActualizarProjectoInput,
  type CriarProjectoInput,
  type ListarProjectosInput,
  deIso,
  encadearFases,
  paraIso,
  percentagemConsumida,
} from '@nexora/shared';
import { db } from '../../db/db';
import { orgTaxonomies } from '../../db/schema/organizations.schema';
import { phases, projectMembers, projects } from '../../db/schema/projects.schema';
import { tasks } from '../../db/schema/tasks.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import type { Sessao } from '../../utils/tokens';
import { registar } from '../audit.service';
import {
  exigirGestaoProjecto,
  exigirLeituraProjecto,
  exigirMembroDaEmpresa,
  exigirTaxonomia,
  projectosVisiveis,
} from '../access';

/**
 * Natureza e estagio sao entradas do vocabulario da empresa, por isso viajam como objecto e nao
 * como codigo: o interface precisa do rotulo que a empresa escolheu e da cor que lhe deu, e
 * pedi-los depois num segundo pedido daria listas a piscar enquanto carregam.
 */
export interface EtiquetaVocabulario {
  id: string;
  rotulo: string;
  cor: string;
}

const natureza = alias(orgTaxonomies, 'natureza');
const estagio = alias(orgTaxonomies, 'estagio');

export interface LinhaCarteira {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  natureza: EtiquetaVocabulario;
  estagio: EtiquetaVocabulario;
  saude: string;
  avancoPct: number;
  deadline: Date;
  responsavel: { id: string; nome: string };
  tarefasAbertas: number;
  tarefasTotal: number;
}

/**
 * Carteira de projectos.
 *
 * A contagem de tarefas vem por subconsulta em vez de por junção agregada: uma junção com
 * `tasks` multiplicaria as linhas do projecto e obrigaria a agrupar por todas as colunas.
 */
export async function listar(
  sessao: Sessao,
  filtros: ListarProjectosInput,
): Promise<LinhaCarteira[]> {
  const abertas = sql<number>`(
    SELECT count(*) FROM ${tasks}
    WHERE ${tasks.projectId} = ${projects.id} AND ${tasks.estado} <> 'concluida'
  )`;
  const total = sql<number>`(
    SELECT count(*) FROM ${tasks} WHERE ${tasks.projectId} = ${projects.id}
  )`;

  const condicoes = [eq(projects.arquivado, false), projectosVisiveis(sessao)];

  if (filtros.filtro === 'em_risco') {
    condicoes.push(ne(projects.saude, 'no_prazo'));
  } else if (filtros.filtro !== 'todos') {
    // O filtro e o id de uma natureza. Se for de outra empresa, `projectosVisiveis` ja garantiu
    // que nao ha projectos a devolver - a consulta devolve vazio em vez de erro.
    condicoes.push(eq(projects.naturezaId, filtros.filtro));
  }

  const linhas = await db
    .select({
      id: projects.id,
      codigo: projects.codigo,
      nome: projects.nome,
      cliente: projects.cliente,
      naturezaId: natureza.id,
      naturezaRotulo: natureza.rotulo,
      naturezaCor: natureza.cor,
      estagioId: estagio.id,
      estagioRotulo: estagio.rotulo,
      estagioCor: estagio.cor,
      saude: projects.saude,
      avancoPct: projects.avancoPct,
      deadline: projects.deadline,
      responsavelId: users.id,
      responsavelNome: users.nome,
      tarefasAbertas: abertas,
      tarefasTotal: total,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.responsavelId))
    .innerJoin(natureza, eq(natureza.id, projects.naturezaId))
    .innerJoin(estagio, eq(estagio.id, projects.estagioId))
    .where(and(...condicoes))
    .orderBy(asc(projects.deadline))
    .limit(200);

  return linhas.map((l) => ({
    id: l.id,
    codigo: l.codigo,
    nome: l.nome,
    cliente: l.cliente,
    natureza: { id: l.naturezaId, rotulo: l.naturezaRotulo, cor: l.naturezaCor },
    estagio: { id: l.estagioId, rotulo: l.estagioRotulo, cor: l.estagioCor },
    saude: l.saude,
    avancoPct: l.avancoPct,
    deadline: l.deadline,
    responsavel: { id: l.responsavelId, nome: l.responsavelNome },
    tarefasAbertas: Number(l.tarefasAbertas),
    tarefasTotal: Number(l.tarefasTotal),
  }));
}

/**
 * CSV da carteira visivel.
 *
 * O BOM UTF-8 e de proposito: o Excel em Mocambique abre o ficheiro sem perguntar a codificacao.
 * A carteira e a mesma do ecran - filtrada pela empresa e pelo nivel - nunca a tabela inteira.
 */
export async function exportarCsv(sessao: Sessao): Promise<string> {
  const carteira = await listar(sessao, { filtro: 'todos' });
  const cabecalho = [
    'codigo',
    'nome',
    'cliente',
    'natureza',
    'estagio',
    'saude',
    'avanco',
    'deadline',
    'responsavel',
    'abertas',
    'total',
  ];
  const linhas = carteira.map((p) =>
    [
      p.codigo,
      p.nome,
      p.cliente,
      p.natureza.rotulo,
      p.estagio.rotulo,
      p.saude,
      String(p.avancoPct),
      paraIso(p.deadline),
      p.responsavel.nome,
      String(p.tarefasAbertas),
      String(p.tarefasTotal),
    ]
      .map(campoCsv)
      .join(','),
  );
  return ['\uFEFF' + cabecalho.join(','), ...linhas].join('\n');
}

function campoCsv(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

/**
 * Contagem por filtro, para as pastilhas da carteira.
 * As chaves das naturezas sao identificadores, porque e por identificador que o filtro pergunta.
 */
export async function contagensPorFiltro(sessao: Sessao): Promise<Record<string, number>> {
  const linhas = await db
    .select({ naturezaId: projects.naturezaId, saude: projects.saude, n: count() })
    .from(projects)
    .where(and(eq(projects.arquivado, false), projectosVisiveis(sessao)))
    .groupBy(projects.naturezaId, projects.saude);

  const contagens: Record<string, number> = { todos: 0, em_risco: 0 };
  for (const l of linhas) {
    const n = Number(l.n);
    contagens.todos = (contagens.todos ?? 0) + n;
    contagens[l.naturezaId] = (contagens[l.naturezaId] ?? 0) + n;
    if (l.saude !== 'no_prazo') contagens.em_risco = (contagens.em_risco ?? 0) + n;
  }
  return contagens;
}

/** Detalhe para a gaveta do projecto: factos, roteiro e tarefas reais. */
export async function detalhe(sessao: Sessao, projectId: string) {
  await exigirLeituraProjecto(sessao, projectId);

  const [projecto] = await db
    .select({
      id: projects.id,
      codigo: projects.codigo,
      nome: projects.nome,
      cliente: projects.cliente,
      naturezaId: natureza.id,
      naturezaRotulo: natureza.rotulo,
      naturezaCor: natureza.cor,
      estagioId: estagio.id,
      estagioRotulo: estagio.rotulo,
      estagioCor: estagio.cor,
      saude: projects.saude,
      avancoPct: projects.avancoPct,
      inicio: projects.inicio,
      deadline: projects.deadline,
      orcamentoCentavos: projects.orcamentoCentavos,
      consumidoCentavos: projects.consumidoCentavos,
      antecedenciaAlerta: projects.antecedenciaAlerta,
      responsavelId: users.id,
      responsavelNome: users.nome,
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.responsavelId))
    .innerJoin(natureza, eq(natureza.id, projects.naturezaId))
    .innerJoin(estagio, eq(estagio.id, projects.estagioId))
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, sessao.org)))
    .limit(1);

  if (!projecto) throw erros.naoEncontrado('Este projecto');

  const roteiro = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(asc(phases.ordem));

  const responsavel = { id: projecto.responsavelId, nome: projecto.responsavelNome };
  const equipa = await db
    .select({ id: users.id, nome: users.nome, funcao: users.funcao })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));

  return {
    id: projecto.id,
    codigo: projecto.codigo,
    nome: projecto.nome,
    cliente: projecto.cliente,
    natureza: {
      id: projecto.naturezaId,
      rotulo: projecto.naturezaRotulo,
      cor: projecto.naturezaCor,
    },
    estagio: { id: projecto.estagioId, rotulo: projecto.estagioRotulo, cor: projecto.estagioCor },
    saude: projecto.saude,
    avancoPct: projecto.avancoPct,
    inicio: projecto.inicio,
    deadline: projecto.deadline,
    orcamentoCentavos: projecto.orcamentoCentavos,
    consumidoCentavos: projecto.consumidoCentavos,
    antecedenciaAlerta: projecto.antecedenciaAlerta,
    responsavel,
    consumidoPct: percentagemConsumida(projecto.orcamentoCentavos, projecto.consumidoCentavos),
    equipa,
    fases: roteiro,
  };
}

/**
 * Gera o proximo codigo livre para um prefixo, dentro da empresa.
 *
 * A numeracao e por empresa: duas empresas podem ambas ter um PRJ-001 sem colidirem, e nenhuma
 * consegue deduzir da numeracao quantos projectos a outra tem.
 */
async function proximoCodigo(organizationId: string, prefixo: string): Promise<string> {
  const [linha] = await db
    .select({
      maximo: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${projects.codigo} FROM '[0-9]+$') AS INTEGER)), 0)`,
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        sql`${projects.codigo} LIKE ${`${prefixo}-%`}`,
      ),
    );

  const seguinte = Number(linha?.maximo ?? 0) + 1;
  return `${prefixo}-${String(seguinte).padStart(3, '0')}`;
}

/**
 * Regista um projecto com o seu roteiro inicial.
 *
 * Corre em transaccao: um projecto sem fases seria um projecto sem roteiro, e o roteiro e metade
 * do que o produto promete. Ou entra tudo, ou nao entra nada.
 */
export async function criar(sessao: Sessao, dados: CriarProjectoInput) {
  // O vocabulario tem de ser da empresa de quem regista, e nao apenas existir.
  const [taxNatureza] = await Promise.all([
    exigirTaxonomia(sessao, dados.naturezaId, 'natureza'),
    exigirTaxonomia(sessao, dados.estagioId, 'estagio'),
  ]);

  await exigirMembroDaEmpresa(sessao, [dados.responsavelId, ...dados.pessoas]);

  const inicio = deIso(dados.inicio);
  const agendadas = encadearFases(
    dados.fases.map((f) => ({
      nome: f.nome,
      estado: f.estado,
      nota: f.nota,
      semanas: f.semanas,
    })),
    inicio,
  );

  if (!agendadas.length) {
    throw erros.validacao('Um projecto precisa de pelo menos uma fase com nome.', {
      fases: 'Dê nome a pelo menos uma fase.',
    });
  }

  const prefixo = taxNatureza.prefixo ?? 'PRJ';

  return db.transaction(async (tx) => {
    const codigo = await proximoCodigo(sessao.org, prefixo);

    const [projecto] = await tx
      .insert(projects)
      .values({
        organizationId: sessao.org,
        codigo,
        nome: dados.nome,
        cliente: dados.cliente,
        naturezaId: dados.naturezaId,
        estagioId: dados.estagioId,
        responsavelId: dados.responsavelId,
        inicio,
        deadline: deIso(dados.deadline),
        orcamentoCentavos: dados.orcamentoCentavos,
        antecedenciaAlerta: dados.antecedenciaAlerta,
      })
      .returning();

    if (!projecto) throw erros.interno('Não foi possível registar o projecto.');

    await tx.insert(phases).values(
      agendadas.map((f) => ({
        projectId: projecto.id,
        nome: f.nome,
        estado: f.estado,
        nota: f.nota,
        ordem: f.ordem,
        startsOn: f.startsOn,
        endsOn: f.endsOn,
        planeadoStartsOn: f.startsOn,
        planeadoEndsOn: f.endsOn,
      })),
    );

    // O responsavel entra sempre na equipa, mesmo que nao venha na lista de pessoas.
    const membros = new Set<string>([dados.responsavelId, ...dados.pessoas]);
    await tx.insert(projectMembers).values(
      [...membros].map((userId) => ({ projectId: projecto.id, userId })),
    );

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: 'projecto.criado',
      entidade: 'projecto',
      entidadeId: projecto.id,
      projectId: projecto.id,
      detalhe: { codigo, fases: agendadas.length },
    });

    return projecto;
  });
}

export async function actualizar(
  sessao: Sessao,
  projectId: string,
  dados: ActualizarProjectoInput,
) {
  await exigirGestaoProjecto(sessao, projectId);

  if (dados.naturezaId !== undefined) await exigirTaxonomia(sessao, dados.naturezaId, 'natureza');
  if (dados.estagioId !== undefined) await exigirTaxonomia(sessao, dados.estagioId, 'estagio');
  if (dados.responsavelId !== undefined) {
    await exigirMembroDaEmpresa(sessao, [dados.responsavelId]);
  }

  const alteracoes: Record<string, unknown> = { updatedAt: new Date() };
  if (dados.nome !== undefined) alteracoes.nome = dados.nome;
  if (dados.cliente !== undefined) alteracoes.cliente = dados.cliente;
  if (dados.naturezaId !== undefined) alteracoes.naturezaId = dados.naturezaId;
  if (dados.estagioId !== undefined) alteracoes.estagioId = dados.estagioId;
  if (dados.saude !== undefined) alteracoes.saude = dados.saude;
  if (dados.responsavelId !== undefined) alteracoes.responsavelId = dados.responsavelId;
  if (dados.deadline !== undefined) alteracoes.deadline = deIso(dados.deadline);
  if (dados.orcamentoCentavos !== undefined) alteracoes.orcamentoCentavos = dados.orcamentoCentavos;
  if (dados.consumidoCentavos !== undefined) alteracoes.consumidoCentavos = dados.consumidoCentavos;
  if (dados.antecedenciaAlerta !== undefined) {
    alteracoes.antecedenciaAlerta = dados.antecedenciaAlerta;
  }

  const [actualizado] = await db
    .update(projects)
    .set(alteracoes)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, sessao.org)))
    .returning();

  if (!actualizado) throw erros.naoEncontrado('Este projecto');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'projecto.actualizado',
    entidade: 'projecto',
    entidadeId: projectId,
    projectId,
    detalhe: { campos: Object.keys(alteracoes).filter((c) => c !== 'updatedAt') },
  });

  return actualizado;
}
