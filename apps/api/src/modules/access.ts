import { type SQL, and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/db';
import { orgTaxonomies } from '../db/schema/organizations.schema';
import { projectMembers, projects } from '../db/schema/projects.schema';
import { tasks } from '../db/schema/tasks.schema';
import { users } from '../db/schema/users.schema';
import { erros } from '../utils/errors';
import type { Sessao } from '../utils/tokens';

/**
 * Ambito de leitura: primeiro a empresa, depois o nivel de acesso.
 *
 * Estas condicoes entram na clausula WHERE das consultas, e nao numa filtragem posterior em
 * memoria. A diferenca importa: assim um Colaborador nunca chega a receber da base de dados um
 * projecto que nao e seu, mesmo que forje o identificador no pedido. O controlo esta no servico,
 * onde ha contexto para o exercer, e nao apenas na rota, que so sabe o caminho.
 *
 * A empresa e a condicao exterior e nao tem excepcao. Um Administrador ve toda a carteira **da
 * sua empresa**; nao existe nivel de acesso que atravesse a fronteira entre empresas.
 */

export function ehAdministrador(sessao: Sessao): boolean {
  return sessao.nivel === 'administrador';
}

/**
 * Condicao que limita os projectos visiveis.
 *
 * Devolve sempre uma condicao - nunca `undefined`. Devolver `undefined` para o Administrador,
 * como acontecia antes de existirem empresas, passaria a significar "toda a carteira de toda a
 * gente", que e exactamente a fuga que este modulo existe para impedir.
 */
export function projectosVisiveis(sessao: Sessao): SQL {
  const daEmpresa = eq(projects.organizationId, sessao.org);
  if (ehAdministrador(sessao)) return daEmpresa;

  const alocado = db
    .select({ id: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, sessao.sub));

  return and(
    daEmpresa,
    or(eq(projects.responsavelId, sessao.sub), inArray(projects.id, alocado)),
  ) as SQL;
}

/**
 * Condicao que limita as tarefas visiveis.
 *
 * O Colaborador ve apenas as tarefas que lhe foram atribuidas - nao as dos colegas no mesmo
 * projecto. O Gestor ve tudo o que se passa nos projectos por que responde.
 */
export function tarefasVisiveis(sessao: Sessao): SQL {
  const daEmpresa = eq(tasks.organizationId, sessao.org);
  if (ehAdministrador(sessao)) return daEmpresa;

  if (sessao.nivel === 'colaborador') {
    return and(daEmpresa, eq(tasks.responsavelId, sessao.sub)) as SQL;
  }

  const geridos = db.select({ id: projects.id }).from(projects).where(projectosVisiveis(sessao));

  return and(
    daEmpresa,
    or(eq(tasks.responsavelId, sessao.sub), inArray(tasks.projectId, geridos)),
  ) as SQL;
}

/** Identificadores dos projectos a que a sessao tem acesso. */
export async function idsProjectosVisiveis(sessao: Sessao): Promise<string[]> {
  const linhas = await db
    .select({ id: projects.id })
    .from(projects)
    .where(projectosVisiveis(sessao));
  return linhas.map((l) => l.id);
}

/**
 * Garante que a sessao pode ler o projecto.
 *
 * Lanca 404 e nao 403 de proposito: responder "não tem acesso" confirmaria a existencia do
 * projecto a quem esta a experimentar identificadores - e, entre empresas, confirmaria tambem a
 * existencia da empresa vizinha.
 */
export async function exigirLeituraProjecto(sessao: Sessao, projectId: string): Promise<void> {
  const [linha] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), projectosVisiveis(sessao)))
    .limit(1);

  if (!linha) throw erros.naoEncontrado('Este projecto');
}

/**
 * Garante que a sessao pode alterar o projecto: definir roteiro, atribuir tarefas, editar factos.
 * Administrador em toda a carteira da sua empresa; Gestor apenas nos projectos por que responde.
 */
export async function exigirGestaoProjecto(sessao: Sessao, projectId: string): Promise<void> {
  if (ehAdministrador(sessao)) {
    // Existir nao chega: tem de existir dentro da empresa de quem pede.
    const [existe] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, sessao.org)))
      .limit(1);
    if (!existe) throw erros.naoEncontrado('Este projecto');
    return;
  }

  if (sessao.nivel !== 'gestor') {
    throw erros.semPermissao('Só a Direcção ou o gestor do projecto podem fazer esta alteração.');
  }

  // Ser membro do projecto nao chega: o Gestor gere apenas onde e o responsavel.
  const [linha] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, sessao.org),
        eq(projects.responsavelId, sessao.sub),
      ),
    )
    .limit(1);

  if (!linha) {
    throw erros.semPermissao('Só a Direcção ou o gestor do projecto podem fazer esta alteração.');
  }
}

/**
 * Resolve uma entrada do vocabulario dentro da empresa da sessao.
 *
 * Usado sempre que um pedido traz o identificador de uma natureza, estagio ou departamento: sem
 * esta verificacao, um pedido forjado podia classificar um projecto com o vocabulario de outra
 * empresa e revelar, na resposta, o nome que essa empresa deu ao seu trabalho.
 */
export async function exigirTaxonomia(
  sessao: Sessao,
  id: string,
  tipo: 'natureza' | 'estagio' | 'departamento',
): Promise<{ id: string; rotulo: string; prefixo: string | null }> {
  const [linha] = await db
    .select({
      id: orgTaxonomies.id,
      rotulo: orgTaxonomies.rotulo,
      prefixo: orgTaxonomies.prefixo,
    })
    .from(orgTaxonomies)
    .where(
      and(
        eq(orgTaxonomies.id, id),
        eq(orgTaxonomies.organizationId, sessao.org),
        eq(orgTaxonomies.tipo, tipo),
      ),
    )
    .limit(1);

  if (!linha) {
    const nome =
      tipo === 'natureza' ? 'Essa natureza' : tipo === 'estagio' ? 'Esse estágio' : 'Esse departamento';
    throw erros.validacao(`${nome} não existe no vocabulário da sua empresa.`);
  }
  return linha;
}

/**
 * Garante que todas as pessoas indicadas pertencem a empresa da sessao.
 *
 * Sem isto, um pedido forjado podia nomear alguem de outra empresa como responsavel e, a partir
 * dai, essa pessoa passaria a ver projectos que nao sao da sua casa.
 */
export async function exigirMembroDaEmpresa(sessao: Sessao, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return;

  const encontrados = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.organizationId, sessao.org), inArray(users.id, unicos)));

  if (encontrados.length !== unicos.length) {
    throw erros.validacao('Uma das pessoas indicadas não pertence a esta empresa.');
  }
}

/**
 * Garante que os projectos indicados existem dentro da empresa da sessao.
 *
 * Usado ao alocar um membro: sem isto, um identificador forjado ligava a pessoa a um projecto
 * vizinho e, no dia seguinte, ela via a carteira da outra casa.
 */
export async function exigirProjectosDaEmpresa(sessao: Sessao, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)].filter(Boolean);
  if (!unicos.length) return;

  const encontrados = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.organizationId, sessao.org), inArray(projects.id, unicos)));

  if (encontrados.length !== unicos.length) {
    throw erros.validacao('Um dos projectos indicados não pertence a esta empresa.');
  }
}
