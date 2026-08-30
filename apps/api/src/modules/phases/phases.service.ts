import { and, asc, count, eq, ne, or } from 'drizzle-orm';
import {
  type GravarRoteiroInput,
  type ReagendarFaseInput,
  deIso,
  encadearFases,
} from '@nexora/shared';
import { db } from '../../db/db';
import { type Fase, phases, projects } from '../../db/schema/projects.schema';
import { tasks } from '../../db/schema/tasks.schema';
import { erros } from '../../utils/errors';
import type { Sessao } from '../../utils/tokens';
import { exigirGestaoProjecto, exigirLeituraProjecto, projectosVisiveis } from '../access';
import { registar } from '../audit.service';

export async function listar(sessao: Sessao, projectId: string) {
  await exigirLeituraProjecto(sessao, projectId);
  return db.select().from(phases).where(eq(phases.projectId, projectId)).orderBy(asc(phases.ordem));
}

/**
 * Todas as fases da carteira visivel, agrupadas por projecto.
 *
 * O roteiro precisa do plano de toda a carteira de uma vez. Pedir projecto a projecto dava N+1
 * pedidos e - pior - deixava o ecra a casar fases com projectos por posicao no array, o que
 * bastava a carteira mudar de tamanho para encostar as fases ao projecto errado. Com uma resposta
 * indexada pelo identificador, esse erro deixa de ser possivel.
 */
export async function listarDaCarteira(sessao: Sessao): Promise<Record<string, Fase[]>> {
  const linhas = await db
    .select({ fase: phases })
    .from(phases)
    .innerJoin(projects, eq(projects.id, phases.projectId))
    .where(and(eq(projects.arquivado, false), projectosVisiveis(sessao)))
    .orderBy(asc(phases.projectId), asc(phases.ordem));

  const porProjecto: Record<string, Fase[]> = {};
  for (const { fase } of linhas) {
    (porProjecto[fase.projectId] ??= []).push(fase);
  }
  return porProjecto;
}

/**
 * Grava o roteiro completo de um projecto.
 *
 * O editor de fases envia sempre a lista inteira, pela ordem em que ficou depois de renomear,
 * reordenar por arrasto, acrescentar ou remover. Reencadear tudo a partir do inicio e mais simples
 * e mais fiavel do que tentar deduzir que linhas mudaram - e e o que o design ja fazia.
 *
 * As tarefas ligadas a fases removidas nao sao apagadas: ficam sem fase. Apagar o trabalho de
 * alguem porque uma fase foi reorganizada seria destruir dados por causa de uma decisao de
 * planeamento.
 */
export async function gravarRoteiro(
  sessao: Sessao,
  projectId: string,
  dados: GravarRoteiroInput,
) {
  await exigirGestaoProjecto(sessao, projectId);

  const existentes = await db
    .select()
    .from(phases)
    .where(eq(phases.projectId, projectId))
    .orderBy(asc(phases.ordem));

  const [projecto] = await db
    .select({ inicio: projects.inicio })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const inicio = dados.inicio
    ? deIso(dados.inicio)
    : (existentes[0]?.startsOn ?? projecto?.inicio ?? new Date());

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
    throw erros.validacao('O roteiro precisa de pelo menos uma fase com nome.', {
      fases: 'Dê nome a pelo menos uma fase.',
    });
  }

  return db.transaction(async (tx) => {
    // Preserva o identificador das fases que se mantem na mesma posicao, para que as tarefas
    // ligadas a elas nao percam a ligacao.
    const reaproveitados = agendadas.map((_, i) => existentes[i]?.id ?? null);

    const orfas = existentes.slice(agendadas.length).map((f) => f.id);
    if (orfas.length) {
      for (const id of orfas) {
        await tx.update(tasks).set({ phaseId: null }).where(eq(tasks.phaseId, id));
        await tx.delete(phases).where(eq(phases.id, id));
      }
    }

    const gravadas = [];
    for (let i = 0; i < agendadas.length; i += 1) {
      const f = agendadas[i]!;
      const idExistente = reaproveitados[i];

      const valores = {
        nome: f.nome,
        estado: f.estado,
        nota: f.nota,
        ordem: f.ordem,
        startsOn: f.startsOn,
        endsOn: f.endsOn,
        planeadoStartsOn: f.startsOn,
        planeadoEndsOn: f.endsOn,
        updatedAt: new Date(),
      };

      if (idExistente) {
        const [linha] = await tx
          .update(phases)
          .set(valores)
          .where(eq(phases.id, idExistente))
          .returning();
        if (linha) gravadas.push(linha);
      } else {
        const [linha] = await tx
          .insert(phases)
          .values({ projectId, ...valores })
          .returning();
        if (linha) gravadas.push(linha);
      }
    }

    await registar(tx, {
      organizationId: sessao.org,
      actorId: sessao.sub,
      accao: 'roteiro.gravado',
      entidade: 'projecto',
      entidadeId: projectId,
      projectId,
      detalhe: { fases: gravadas.length, removidas: orfas.length },
    });

    return gravadas;
  });
}

/**
 * Reagenda uma fase por arrasto no roteiro.
 *
 * Mover e redimensionar chegam aqui pela mesma porta: as duas operacoes escrevem duas datas. O
 * plano original fica intacto, e e por isso que "Repor plano original" continua a funcionar
 * depois de qualquer numero de arrastos.
 */
export async function reagendar(sessao: Sessao, phaseId: string, dados: ReagendarFaseInput) {
  const [fase] = await db.select().from(phases).where(eq(phases.id, phaseId)).limit(1);
  if (!fase) throw erros.naoEncontrado('Esta fase');

  await exigirGestaoProjecto(sessao, fase.projectId);

  const [actualizada] = await db
    .update(phases)
    .set({
      startsOn: deIso(dados.startsOn),
      endsOn: deIso(dados.endsOn),
      updatedAt: new Date(),
    })
    .where(eq(phases.id, phaseId))
    .returning();

  if (!actualizada) throw erros.naoEncontrado('Esta fase');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'fase.reagendada',
    entidade: 'fase',
    entidadeId: phaseId,
    projectId: fase.projectId,
    detalhe: { nome: fase.nome, de: dados.startsOn, ate: dados.endsOn },
  });

  return actualizada;
}

/** Repoe todas as fases do projecto no plano original gravado no editor. */
export async function reporPlano(sessao: Sessao, projectId: string) {
  await exigirGestaoProjecto(sessao, projectId);

  const repostas = await db
    .update(phases)
    .set({
      startsOn: phases.planeadoStartsOn,
      endsOn: phases.planeadoEndsOn,
      updatedAt: new Date(),
    })
    .where(eq(phases.projectId, projectId))
    .returning();

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'roteiro.reposto',
    entidade: 'projecto',
    entidadeId: projectId,
    projectId,
    detalhe: { fases: repostas.length },
  });

  return repostas.sort((a, b) => a.ordem - b.ordem);
}

/**
 * Numero de fases arrastadas para fora do plano original.
 * Alimenta o contador de "Repor plano original" no roteiro, dentro do ambito da sessao.
 */
export async function contarEdicoes(sessao: Sessao): Promise<number> {
  const [linha] = await db
    .select({ n: count() })
    .from(phases)
    .innerJoin(projects, eq(projects.id, phases.projectId))
    .where(
      and(
        eq(projects.arquivado, false),
        projectosVisiveis(sessao),
        or(
          ne(phases.startsOn, phases.planeadoStartsOn),
          ne(phases.endsOn, phases.planeadoEndsOn),
        ),
      ),
    );

  return Number(linha?.n ?? 0);
}
