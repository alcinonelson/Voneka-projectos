import { and, asc, eq, ne } from 'drizzle-orm';
import {
  type Alerta,
  type Situacao,
  alertaPrazo,
  dataExtensa,
  diferencaEmDias,
  hoje,
} from '@nexora/shared';
import { db } from '../../db/db';
import { orgTaxonomies } from '../../db/schema/organizations.schema';
import { phases, projects } from '../../db/schema/projects.schema';
import { reports, tasks } from '../../db/schema/tasks.schema';
import { users } from '../../db/schema/users.schema';
import type { Sessao } from '../../utils/tokens';
import { projectosVisiveis, tarefasVisiveis } from '../access';
import { estadoEfectivo } from '../tasks/tasks.service';

/**
 * O painel de acompanhamento.
 *
 * A faixa de foco e calculada aqui, no servidor, e nao escrita no interface. A frase que nomeia o
 * que esta a travar a operacao tem de sair dos dados: se um obstaculo for resolvido, a frase muda
 * sozinha. Uma frase fixa no frontend seria uma promessa que envelhece em silencio.
 */

export interface ItemDecisao {
  id: string;
  titulo: string;
  detalhe: string;
  alerta: Alerta;
  accao: 'Escalar' | 'Decidir' | 'Responder';
  projectoId: string;
  projectoNome: string;
  origem: 'tarefa' | 'relatorio';
}

/**
 * Avanco que o plano previa a esta data.
 *
 * Comparar o avanco declarado com a fraccao de calendario ja consumida e a leitura mais simples
 * que diz alguma coisa: se a carteira vai a 49 por cento e o calendario ja gastou 55, o atraso e
 * de seis pontos e nao uma impressao.
 */
function avancoPrevisto(fases: { startsOn: Date; endsOn: Date }[], referencia: Date): number | null {
  if (!fases.length) return null;

  const inicio = fases.reduce((a, f) => (f.startsOn < a ? f.startsOn : a), fases[0]!.startsOn);
  const fim = fases.reduce((a, f) => (f.endsOn > a ? f.endsOn : a), fases[0]!.endsOn);

  const total = diferencaEmDias(inicio, fim);
  if (total <= 0) return null;

  const decorrido = diferencaEmDias(inicio, referencia);
  return Math.max(0, Math.min(100, Math.round((decorrido / total) * 100)));
}

/** Frase que nomeia o que esta a travar a operacao. */
function frasesDeFoco(decisoes: ItemDecisao[]): { titulo: string; nota: string } {
  if (!decisoes.length) {
    return {
      titulo: 'Nada está à espera de si.',
      nota: 'Nenhuma tarefa passou do prazo e nenhum relatório reporta obstáculo por decidir. A carteira anda sem depender de si esta manhã.',
    };
  }

  const projectosTravados = new Set(decisoes.map((d) => d.projectoId)).size;
  const n = decisoes.length;

  const palavraDecisoes = n === 1 ? 'Uma decisão sua está' : `${porExtenso(n)} decisões suas estão`;
  const palavraProjectos =
    projectosTravados === 1 ? 'um projecto' : `${porExtenso(projectosTravados)} projectos`;

  const titulo = `${palavraDecisoes} a travar ${palavraProjectos}.`;

  const externas = decisoes.filter((d) => d.accao === 'Escalar');
  const internas = decisoes.filter((d) => d.accao !== 'Escalar');

  const partes: string[] = [];
  if (externas.length) {
    const clientes = [...new Set(externas.map((d) => d.projectoNome))].join(' e ');
    partes.push(
      externas.length === 1
        ? `O bloqueio em ${clientes} é uma dependência externa`
        : `Os bloqueios em ${clientes} são dependências externas`,
    );
  }
  if (internas.length) {
    partes.push(
      internas.length === 1
        ? 'a outra é uma decisão que só a Direcção pode tomar'
        : `as outras ${internas.length} são decisões que só a Direcção pode tomar`,
    );
  }

  return { titulo, nota: `${partes.join('; ')}.` };
}

function porExtenso(n: number): string {
  const nomes = ['Zero', 'Uma', 'Duas', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];
  return nomes[n] ?? String(n);
}

/**
 * O que precisa da decisao de quem esta a ver.
 *
 * Duas origens, ordenadas pela mesma escala de urgencia: tarefas que ja passaram do prazo e
 * relatorios que declararam obstaculo e continuam por validar. Um relatorio bloqueado pesa mais
 * do que um atraso de dias, porque o atraso costuma ser consequencia dele.
 */
async function decisoesPendentes(sessao: Sessao, referencia: Date): Promise<ItemDecisao[]> {
  const atrasadas = await db
    .select({
      id: tasks.id,
      titulo: tasks.titulo,
      deadline: tasks.deadline,
      estado: tasks.estado,
      projectoId: projects.id,
      projectoNome: projects.nome,
      cliente: projects.cliente,
      responsavel: users.nome,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, tasks.responsavelId))
    .where(and(ne(tasks.estado, 'concluida'), tarefasVisiveis(sessao)))
    .orderBy(asc(tasks.deadline));

  const bloqueados = await db
    .select({
      id: reports.id,
      situacao: reports.situacao,
      autor: users.nome,
      tarefaTitulo: tasks.titulo,
      deadline: tasks.deadline,
      projectoId: projects.id,
      projectoNome: projects.nome,
      cliente: projects.cliente,
    })
    .from(reports)
    .innerJoin(tasks, eq(tasks.id, reports.taskId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, reports.autorId))
    .where(and(ne(reports.situacao, 'sem_obstaculos'), projectosVisiveis(sessao)))
    .orderBy(asc(reports.createdAt));

  const itens: ItemDecisao[] = [];

  for (const r of bloqueados) {
    const situacao = r.situacao as Situacao;
    itens.push({
      id: r.id,
      titulo: r.tarefaTitulo,
      detalhe: `${r.cliente} · relatado por ${r.autor}`,
      alerta: alertaPrazo(r.deadline, false, referencia),
      accao: situacao === 'bloqueado' ? 'Escalar' : 'Responder',
      projectoId: r.projectoId,
      projectoNome: r.cliente,
      origem: 'relatorio',
    });
  }

  const jaCitadas = new Set(bloqueados.map((r) => r.tarefaTitulo));
  for (const t of atrasadas) {
    if (estadoEfectivo(t.estado, t.deadline, referencia) !== 'atrasada') continue;
    if (jaCitadas.has(t.titulo)) continue;
    itens.push({
      id: t.id,
      titulo: t.titulo,
      detalhe: `${t.cliente} · ${t.responsavel}`,
      alerta: alertaPrazo(t.deadline, false, referencia),
      accao: 'Decidir',
      projectoId: t.projectoId,
      projectoNome: t.cliente,
      origem: 'tarefa',
    });
  }

  const peso = (i: ItemDecisao) => (i.accao === 'Escalar' ? 0 : i.origem === 'relatorio' ? 1 : 2);
  itens.sort((a, b) => peso(a) - peso(b) || a.alerta.dias - b.alerta.dias);

  return itens.slice(0, 3);
}

export async function painel(sessao: Sessao) {
  const referencia = hoje();

  const carteira = await db
    .select({
      id: projects.id,
      nome: projects.nome,
      cliente: projects.cliente,
      estagioRotulo: orgTaxonomies.rotulo,
      estagioCor: orgTaxonomies.cor,
      saude: projects.saude,
      avancoPct: projects.avancoPct,
      deadline: projects.deadline,
    })
    .from(projects)
    .innerJoin(orgTaxonomies, eq(orgTaxonomies.id, projects.estagioId))
    .where(and(eq(projects.arquivado, false), projectosVisiveis(sessao)))
    .orderBy(asc(projects.deadline));

  const todasFases = await db
    .select({ projectId: phases.projectId, startsOn: phases.startsOn, endsOn: phases.endsOn })
    .from(phases);

  const fasesPorProjecto = new Map<string, { startsOn: Date; endsOn: Date }[]>();
  for (const f of todasFases) {
    const lista = fasesPorProjecto.get(f.projectId) ?? [];
    lista.push({ startsOn: f.startsOn, endsOn: f.endsOn });
    fasesPorProjecto.set(f.projectId, lista);
  }

  const avancoMedio = carteira.length
    ? Math.round(carteira.reduce((a, p) => a + p.avancoPct, 0) / carteira.length)
    : 0;

  const previstos = carteira
    .map((p) => avancoPrevisto(fasesPorProjecto.get(p.id) ?? [], referencia))
    .filter((v): v is number => v !== null);
  const previstoMedio = previstos.length
    ? Math.round(previstos.reduce((a, b) => a + b, 0) / previstos.length)
    : null;

  const abertas = await db
    .select({
      id: tasks.id,
      titulo: tasks.titulo,
      deadline: tasks.deadline,
      estado: tasks.estado,
      projectoId: projects.id,
      responsavel: users.nome,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(users, eq(users.id, tasks.responsavelId))
    .where(and(ne(tasks.estado, 'concluida'), tarefasVisiveis(sessao)))
    .orderBy(asc(tasks.deadline));

  const foraDePrazo = abertas.filter(
    (t) => estadoEfectivo(t.estado, t.deadline, referencia) === 'atrasada',
  );
  const projectosComAtraso = new Set(foraDePrazo.map((t) => t.projectoId)).size;

  const decisoes = await decisoesPendentes(sessao, referencia);
  const foco = frasesDeFoco(decisoes);

  return {
    hoje: dataExtensa(referencia),
    foco,
    resumo: {
      avancoMedio,
      previstoMedio,
      foraDePrazo: foraDePrazo.length,
      projectosComAtraso,
    },
    decisoes,
    avancos: carteira.slice(0, 5).map((p) => ({
      id: p.id,
      nome: p.nome,
      cliente: p.cliente,
      estagio: { rotulo: p.estagioRotulo, cor: p.estagioCor },
      saude: p.saude,
      avancoPct: p.avancoPct,
      deadline: p.deadline,
    })),
    prazos: abertas.slice(0, 5).map((t) => ({
      id: t.id,
      titulo: t.titulo,
      responsavel: t.responsavel,
      deadline: t.deadline,
      alerta: alertaPrazo(t.deadline, false, referencia),
    })),
  };
}
