import { and, asc, eq, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  type ActualizarTarefaInput,
  type ConcluirTarefaInput,
  type CriarTarefaInput,
  type EstadoTarefa,
  type ListarTarefasInput,
  type PedirProrrogacaoInput,
  MENSAGEM_RELATORIO_CURTO,
  MIN_CARACTERES_RELATORIO,
  deIso,
  estaAtrasada,
  hoje,
} from '@nexora/shared';
import { db } from '../../db/db';
import { phases, projects } from '../../db/schema/projects.schema';
import { reports, taskExtensions, tasks } from '../../db/schema/tasks.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import { logModulo, logger } from '../../utils/logger';
import type { Sessao } from '../../utils/tokens';
import { ehAdministrador, exigirGestaoProjecto, tarefasVisiveis } from '../access';
import { registar } from '../audit.service';

/**
 * Estado efectivo de uma tarefa.
 *
 * O atraso e derivado da deadline, nao guardado. Uma coluna com "atrasada" escrita a mao ficaria
 * errada a cada meia-noite ate alguem correr um job para a corrigir; derivada, esta sempre certa.
 */
export function estadoEfectivo(estado: EstadoTarefa, deadline: Date, referencia?: Date): EstadoTarefa {
  if (estado === 'concluida') return 'concluida';
  return estaAtrasada(deadline, false, referencia) ? 'atrasada' : estado;
}

export interface LinhaTarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  deadline: Date;
  estado: EstadoTarefa;
  prioridade: string;
  esforcoEstimadoHoras: number;
  esforcoRealHoras: number;
  exigeRelatorio: boolean;
  concluidaEm: Date | null;
  projecto: { id: string; nome: string };
  fase: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string; funcao: string };
  atribuidoPor: { id: string; nome: string };
}

/**
 * Alias da tabela de utilizadores para quem atribuiu a tarefa.
 * Sem alias, o segundo `join` a `users` colidiria com o do responsavel.
 */
const atribuidor = alias(users, 'atribuidor');

export async function listar(sessao: Sessao, filtros: ListarTarefasInput): Promise<LinhaTarefa[]> {
  const referencia = hoje();
  const condicoes = [tarefasVisiveis(sessao)];

  if (filtros.minhas) condicoes.push(eq(tasks.responsavelId, sessao.sub));
  if (filtros.projectoId) condicoes.push(eq(tasks.projectId, filtros.projectoId));
  if (filtros.responsavelId) condicoes.push(eq(tasks.responsavelId, filtros.responsavelId));

  if (filtros.filtro === 'concluidas') {
    condicoes.push(eq(tasks.estado, 'concluida'));
  } else if (filtros.filtro === 'abertas' || filtros.filtro === 'atrasadas') {
    condicoes.push(ne(tasks.estado, 'concluida'));
  }

  const linhas = await db
    .select({
      id: tasks.id,
      titulo: tasks.titulo,
      descricao: tasks.descricao,
      deadline: tasks.deadline,
      estado: tasks.estado,
      prioridade: tasks.prioridade,
      esforcoEstimadoHoras: tasks.esforcoEstimadoHoras,
      esforcoRealHoras: tasks.esforcoRealHoras,
      exigeRelatorio: tasks.exigeRelatorio,
      concluidaEm: tasks.concluidaEm,
      projectoId: projects.id,
      projectoNome: projects.nome,
      faseId: phases.id,
      faseNome: phases.nome,
      responsavelId: users.id,
      responsavelNome: users.nome,
      responsavelFuncao: users.funcao,
      atribuidoPorId: atribuidor.id,
      atribuidoPorNome: atribuidor.nome,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, tasks.responsavelId))
    .innerJoin(atribuidor, eq(atribuidor.id, tasks.atribuidoPorId))
    .leftJoin(phases, eq(phases.id, tasks.phaseId))
    .where(and(...condicoes))
    .orderBy(asc(tasks.deadline));

  const comEstado = linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    deadline: l.deadline,
    estado: estadoEfectivo(l.estado, l.deadline, referencia),
    prioridade: l.prioridade,
    esforcoEstimadoHoras: l.esforcoEstimadoHoras,
    esforcoRealHoras: l.esforcoRealHoras,
    exigeRelatorio: l.exigeRelatorio,
    concluidaEm: l.concluidaEm,
    projecto: { id: l.projectoId, nome: l.projectoNome },
    fase: l.faseId && l.faseNome ? { id: l.faseId, nome: l.faseNome } : null,
    responsavel: { id: l.responsavelId, nome: l.responsavelNome, funcao: l.responsavelFuncao },
    atribuidoPor: { id: l.atribuidoPorId, nome: l.atribuidoPorNome },
  }));

  // O filtro "Atrasadas" so pode ser aplicado depois de o estado efectivo ser calculado.
  return filtros.filtro === 'atrasadas'
    ? comEstado.filter((t) => t.estado === 'atrasada')
    : comEstado;
}

/** Atribui uma tarefa. Escrita por quem atribui, nunca pre-configurada. */
export async function criar(sessao: Sessao, dados: CriarTarefaInput) {
  await exigirGestaoProjecto(sessao, dados.projectoId);

  if (dados.faseId) {
    const [fase] = await db
      .select({ id: phases.id })
      .from(phases)
      .where(and(eq(phases.id, dados.faseId), eq(phases.projectId, dados.projectoId)))
      .limit(1);
    if (!fase) {
      throw erros.validacao('A fase indicada não pertence a este projecto.', {
        faseId: 'Escolha uma fase deste projecto.',
      });
    }
  }

  // O responsavel tem de ser da empresa de quem atribui. Sem a condicao, um pedido forjado
  // conseguiria atribuir trabalho a alguem de outra casa - e essa pessoa passaria a ver a tarefa.
  const [responsavel] = await db
    .select({ id: users.id, activo: users.activo })
    .from(users)
    .where(and(eq(users.id, dados.responsavelId), eq(users.organizationId, sessao.org)))
    .limit(1);

  if (!responsavel || !responsavel.activo) {
    throw erros.validacao('O responsável indicado não existe ou está desactivado.', {
      responsavelId: 'Escolha uma pessoa activa.',
    });
  }

  const [tarefa] = await db
    .insert(tasks)
    .values({
      organizationId: sessao.org,
      projectId: dados.projectoId,
      phaseId: dados.faseId,
      titulo: dados.titulo,
      descricao: dados.descricao || null,
      responsavelId: dados.responsavelId,
      atribuidoPorId: sessao.sub,
      deadline: deIso(dados.deadline),
      esforcoEstimadoHoras: dados.esforcoEstimadoHoras,
      prioridade: dados.prioridade,
      antecedenciaAlerta: dados.antecedenciaAlerta,
      exigeRelatorio: dados.exigeRelatorio,
      estado: 'pendente',
    })
    .returning();

  if (!tarefa) throw erros.interno('Não foi possível atribuir a tarefa.');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'tarefa.atribuida',
    entidade: 'tarefa',
    entidadeId: tarefa.id,
    projectId: dados.projectoId,
    detalhe: { titulo: tarefa.titulo, responsavelId: dados.responsavelId },
  });

  return tarefa;
}

/**
 * Carrega uma tarefa dentro da empresa da sessao.
 *
 * A empresa entra aqui e nao em cada chamador porque esquecer-se dela num so sitio bastaria para
 * abrir a tarefa de outra casa a quem soubesse o identificador.
 */
async function carregarTarefa(sessao: Sessao, taskId: string) {
  const [tarefa] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, sessao.org)))
    .limit(1);
  if (!tarefa) throw erros.naoEncontrado('Esta tarefa');
  return tarefa;
}

export async function actualizar(sessao: Sessao, taskId: string, dados: ActualizarTarefaInput) {
  const tarefa = await carregarTarefa(sessao, taskId);

  // Esta regra vem antes da verificacao de permissao de proposito. Vale para toda a gente, e
  // dizer "use o mini relatorio" e mais util do que um 403 que deixaria quem tentou sem saber
  // qual e o caminho certo.
  if (dados.estado === 'concluida') {
    throw erros.relatorioObrigatorio(
      'Uma tarefa fecha-se com o mini relatório, não por mudança de estado.',
    );
  }

  // O responsavel pode marcar que comecou; alterar prazo, esforco ou destinatario e de quem gere.
  const soMudaEstado = Object.keys(dados).length === 1 && dados.estado !== undefined;

  if (!(soMudaEstado && tarefa.responsavelId === sessao.sub)) {
    await exigirGestaoProjecto(sessao, tarefa.projectId);
  }

  const alteracoes: Record<string, unknown> = { updatedAt: new Date() };
  if (dados.titulo !== undefined) alteracoes.titulo = dados.titulo;
  if (dados.descricao !== undefined) alteracoes.descricao = dados.descricao || null;
  if (dados.faseId !== undefined) alteracoes.phaseId = dados.faseId;
  if (dados.responsavelId !== undefined) alteracoes.responsavelId = dados.responsavelId;
  if (dados.deadline !== undefined) alteracoes.deadline = deIso(dados.deadline);
  if (dados.esforcoEstimadoHoras !== undefined) {
    alteracoes.esforcoEstimadoHoras = dados.esforcoEstimadoHoras;
  }
  if (dados.prioridade !== undefined) alteracoes.prioridade = dados.prioridade;
  if (dados.antecedenciaAlerta !== undefined) {
    alteracoes.antecedenciaAlerta = dados.antecedenciaAlerta;
  }
  if (dados.exigeRelatorio !== undefined) alteracoes.exigeRelatorio = dados.exigeRelatorio;
  if (dados.estado !== undefined) alteracoes.estado = dados.estado;

  const [actualizada] = await db
    .update(tasks)
    .set(alteracoes)
    .where(eq(tasks.id, taskId))
    .returning();

  return actualizada;
}

/**
 * Conclui uma tarefa com o seu mini relatorio.
 *
 * Este e o eixo do produto, e por isso a regra vive aqui e nao no formulario:
 *
 * 1. So o responsavel pode dar a tarefa por cumprida - quem fez o trabalho e quem o relata.
 * 2. Se a tarefa exige relatorio, o texto tem de ter pelo menos `MIN_CARACTERES_RELATORIO`
 *    caracteres. O servidor volta a medir o que o formulario ja mediu, porque o formulario pode
 *    ser contornado e a Direccao decide a partir deste texto.
 * 3. Fechar a tarefa e criar o relatorio acontecem na mesma transaccao. Sem isso existiria uma
 *    janela, por curta que fosse, em que a tarefa estaria fechada sem relato nenhum - exactamente
 *    o estado que o produto existe para tornar impossivel.
 */
export async function concluir(sessao: Sessao, taskId: string, dados: ConcluirTarefaInput) {
  const tarefa = await carregarTarefa(sessao, taskId);

  if (tarefa.responsavelId !== sessao.sub) {
    throw erros.semPermissao('Só quem tem a tarefa atribuída a pode dar por cumprida.');
  }

  if (tarefa.estado === 'concluida') {
    throw erros.conflito('Esta tarefa já foi dada como cumprida.');
  }

  const texto = dados.texto.trim();
  if (tarefa.exigeRelatorio && texto.length < MIN_CARACTERES_RELATORIO) {
    throw erros.relatorioObrigatorio(MENSAGEM_RELATORIO_CURTO, { texto: MENSAGEM_RELATORIO_CURTO });
  }

  return db.transaction(async (tx) => {
    const agora = new Date();

    const [fechada] = await tx
      .update(tasks)
      .set({
        estado: 'concluida',
        concluidaEm: agora,
        esforcoRealHoras: dados.esforcoRealHoras,
        updatedAt: agora,
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!fechada) throw erros.naoEncontrado('Esta tarefa');

    const [relatorio] = await tx
      .insert(reports)
      .values({
        organizationId: sessao.org,
        taskId,
        autorId: sessao.sub,
        situacao: dados.situacao,
        texto,
        esforcoRealHoras: dados.esforcoRealHoras,
        provaExecucao: dados.provaExecucao || null,
        validacao: 'a_espera',
      })
      .returning();

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: 'tarefa.cumprida',
      entidade: 'tarefa',
      entidadeId: taskId,
      projectId: tarefa.projectId,
      detalhe: { situacao: dados.situacao, esforcoRealHoras: dados.esforcoRealHoras },
    });

    logger.info(logModulo('tarefas', `Tarefa ${taskId} cumprida com relatorio`));
    return { tarefa: fechada, relatorio };
  });
}

/** Pedido de prorrogacao, feito pelo responsavel e decidido por quem gere o projecto. */
export async function pedirProrrogacao(
  sessao: Sessao,
  taskId: string,
  dados: PedirProrrogacaoInput,
) {
  const tarefa = await carregarTarefa(sessao, taskId);

  if (tarefa.responsavelId !== sessao.sub) {
    throw erros.semPermissao('Só o responsável pela tarefa pode pedir prorrogação.');
  }

  const nova = deIso(dados.novaDeadline);
  if (nova.getTime() <= tarefa.deadline.getTime()) {
    throw erros.validacao('A nova data tem de ser posterior à deadline actual.', {
      novaDeadline: 'Escolha uma data posterior à actual.',
    });
  }

  const [pedido] = await db
    .insert(taskExtensions)
    .values({
      organizationId: sessao.org,
      taskId,
      solicitanteId: sessao.sub,
      deadlineAnterior: tarefa.deadline,
      novaDeadline: nova,
      motivo: dados.motivo,
    })
    .returning();

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'tarefa.prorrogacao_pedida',
    entidade: 'tarefa',
    entidadeId: taskId,
    projectId: tarefa.projectId,
    detalhe: { novaDeadline: dados.novaDeadline },
  });

  return pedido;
}

/** Decide um pedido de prorrogacao. Aceitar move a deadline da tarefa. */
export async function decidirProrrogacao(
  sessao: Sessao,
  extensionId: string,
  aceitar: boolean,
) {
  const [pedido] = await db
    .select()
    .from(taskExtensions)
    .where(
      and(eq(taskExtensions.id, extensionId), eq(taskExtensions.organizationId, sessao.org)),
    )
    .limit(1);

  if (!pedido) throw erros.naoEncontrado('Este pedido');
  if (pedido.estado !== 'pendente') throw erros.conflito('Este pedido já foi decidido.');

  const tarefa = await carregarTarefa(sessao, pedido.taskId);
  await exigirGestaoProjecto(sessao, tarefa.projectId);

  return db.transaction(async (tx) => {
    const agora = new Date();

    await tx
      .update(taskExtensions)
      .set({
        estado: aceitar ? 'aceite' : 'recusada',
        decididoPorId: sessao.sub,
        decididoEm: agora,
      })
      .where(eq(taskExtensions.id, extensionId));

    if (aceitar) {
      await tx
        .update(tasks)
        .set({ deadline: pedido.novaDeadline, updatedAt: agora })
        .where(eq(tasks.id, pedido.taskId));
    }

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: aceitar ? 'tarefa.prorrogacao_aceite' : 'tarefa.prorrogacao_recusada',
      entidade: 'tarefa',
      entidadeId: pedido.taskId,
      projectId: tarefa.projectId,
    });

    return { aceite: aceitar };
  });
}

/** Contagem de tarefas abertas por pessoa. Alimenta a carga mostrada no modal de atribuicao. */
export async function tarefasAbertasPorPessoa(): Promise<Map<string, number>> {
  const linhas = await db
    .select({ responsavelId: tasks.responsavelId, id: tasks.id })
    .from(tasks)
    .where(ne(tasks.estado, 'concluida'));

  const contagem = new Map<string, number>();
  for (const l of linhas) {
    contagem.set(l.responsavelId, (contagem.get(l.responsavelId) ?? 0) + 1);
  }
  return contagem;
}

/** Tarefas de um projecto, para a gaveta. */
export async function doProjecto(sessao: Sessao, projectId: string): Promise<LinhaTarefa[]> {
  return listar(sessao, {
    filtro: 'todas',
    projectoId: projectId,
    minhas: false,
  } as ListarTarefasInput);
}

