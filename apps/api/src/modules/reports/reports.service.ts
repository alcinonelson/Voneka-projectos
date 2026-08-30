import { type SQL, and, count, desc, eq, gte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  type ListarRelatoriosInput,
  type Situacao,
  type ValidarRelatorioInput,
  somarDias,
  hoje,
} from '@nexora/shared';
import { db } from '../../db/db';
import { projects } from '../../db/schema/projects.schema';
import { reports, tasks } from '../../db/schema/tasks.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import type { Sessao } from '../../utils/tokens';
import { ehAdministrador, projectosVisiveis } from '../access';
import { registar } from '../audit.service';

/** Alias para quem validou o relatorio, separado do autor. */
const validador = alias(users, 'validador');

export interface LinhaRelatorio {
  id: string;
  situacao: Situacao;
  texto: string;
  esforcoRealHoras: number;
  provaExecucao: string | null;
  validacao: string;
  observacao: string | null;
  createdAt: Date;
  autor: { id: string; nome: string; funcao: string };
  tarefa: { id: string; titulo: string };
  projecto: { id: string; nome: string };
  validadoPor: string | null;
}

/**
 * Feed dos mini relatorios.
 *
 * O ambito segue o dos projectos: um Colaborador ve os relatorios que escreveu, um Gestor os da
 * sua carteira, a Direccao todos. A ordem e a do design - o mais recente primeiro, porque e o que
 * ainda esta por ler.
 */
export async function listar(
  sessao: Sessao,
  filtros: ListarRelatoriosInput,
): Promise<LinhaRelatorio[]> {
  const condicoes = [];

  if (filtros.meus || sessao.nivel === 'colaborador') {
    condicoes.push(eq(reports.autorId, sessao.sub));
  } else {
    condicoes.push(projectosVisiveis(sessao));
  }

  if (filtros.projectoId) condicoes.push(eq(tasks.projectId, filtros.projectoId));
  if (filtros.autorId) condicoes.push(eq(reports.autorId, filtros.autorId));
  if (filtros.situacao) condicoes.push(eq(reports.situacao, filtros.situacao));

  const linhas = await db
    .select({
      id: reports.id,
      situacao: reports.situacao,
      texto: reports.texto,
      esforcoRealHoras: reports.esforcoRealHoras,
      provaExecucao: reports.provaExecucao,
      validacao: reports.validacao,
      observacao: reports.observacao,
      createdAt: reports.createdAt,
      autorId: users.id,
      autorNome: users.nome,
      autorFuncao: users.funcao,
      validadoPorNome: validador.nome,
      tarefaId: tasks.id,
      tarefaTitulo: tasks.titulo,
      projectoId: projects.id,
      projectoNome: projects.nome,
    })
    .from(reports)
    .innerJoin(tasks, eq(tasks.id, reports.taskId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, reports.autorId))
    .leftJoin(validador, eq(validador.id, reports.validadoPorId))
    .where(and(...condicoes))
    .orderBy(desc(reports.createdAt));

  return linhas.map((l) => ({
    id: l.id,
    situacao: l.situacao,
    texto: l.texto,
    esforcoRealHoras: l.esforcoRealHoras,
    provaExecucao: l.provaExecucao,
    validacao: l.validacao,
    observacao: l.observacao,
    createdAt: l.createdAt,
    autor: { id: l.autorId, nome: l.autorNome, funcao: l.autorFuncao },
    tarefa: { id: l.tarefaId, titulo: l.tarefaTitulo },
    projecto: { id: l.projectoId, nome: l.projectoNome },
    validadoPor: l.validadoPorNome,
  }));
}

/**
 * Tipologia dos obstaculos da semana, para a coluna lateral do ecra de Relatorios.
 * Conta por situacao declarada nos ultimos sete dias.
 */
export async function tipologiaDaSemana(sessao: Sessao) {
  const desde = somarDias(hoje(), -7);

  // `projectosVisiveis` devolve `undefined` para a Direccao; `and` ignora esses valores.
  const condicoes: (SQL | undefined)[] = [gte(reports.createdAt, desde)];
  if (sessao.nivel === 'colaborador') {
    condicoes.push(eq(reports.autorId, sessao.sub));
  } else if (!ehAdministrador(sessao)) {
    condicoes.push(projectosVisiveis(sessao));
  }

  const linhas = await db
    .select({ situacao: reports.situacao, n: count() })
    .from(reports)
    .innerJoin(tasks, eq(tasks.id, reports.taskId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(...condicoes))
    .groupBy(reports.situacao);

  const porSituacao: Record<Situacao, number> = {
    sem_obstaculos: 0,
    com_obstaculo: 0,
    bloqueado: 0,
  };
  for (const l of linhas) porSituacao[l.situacao] = Number(l.n);

  const total = Object.values(porSituacao).reduce((a, b) => a + b, 0);
  const comObstaculo = porSituacao.com_obstaculo + porSituacao.bloqueado;

  return { porSituacao, total, comObstaculo };
}

/**
 * Valida ou escala um relatorio.
 *
 * Validar e a Direccao a dizer que aceita a entrega. Escalar e reconhecer que o obstaculo relatado
 * precisa de uma decisao acima de quem gere o projecto - e por isso e uma accao distinta e nao um
 * comentario.
 */
export async function decidir(
  sessao: Sessao,
  reportId: string,
  dados: ValidarRelatorioInput,
) {
  if (!ehAdministrador(sessao) && sessao.nivel !== 'gestor') {
    throw erros.semPermissao('Só a Direcção ou um gestor validam relatórios.');
  }

  const [relatorio] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!relatorio) throw erros.naoEncontrado('Este relatório');

  if (relatorio.autorId === sessao.sub && !ehAdministrador(sessao)) {
    throw erros.semPermissao('Não pode validar o seu próprio relatório.');
  }

  const [tarefa] = await db
    .select({ projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.id, relatorio.taskId))
    .limit(1);

  const [actualizado] = await db
    .update(reports)
    .set({
      validacao: dados.decisao === 'validar' ? 'validado' : 'escalado',
      validadoPorId: sessao.sub,
      validadoEm: new Date(),
      observacao: dados.observacao || null,
    })
    .where(eq(reports.id, reportId))
    .returning();

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: dados.decisao === 'validar' ? 'relatorio.validado' : 'relatorio.escalado',
    entidade: 'relatorio',
    entidadeId: reportId,
    projectId: tarefa?.projectId ?? null,
  });

  return actualizado;
}
