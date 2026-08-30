import { and, asc, count, eq, ne } from 'drizzle-orm';
import type {
  ActualizarTaxonomiaInput,
  CriarTaxonomiaInput,
  ListarTaxonomiasInput,
  TaxonomiaRef,
  TipoTaxonomia,
} from '@nexora/shared';
import { db } from '../../db/db';
import { orgTaxonomies } from '../../db/schema/organizations.schema';
import { projects } from '../../db/schema/projects.schema';
import { users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import type { Sessao } from '../../utils/tokens';
import { registar } from '../audit.service';

/**
 * Vocabulario da empresa.
 *
 * Uma entrada nunca desaparece a chamada de quem a criou se ja estiver a classificar trabalho:
 * apagar a natureza "Concurso" deixaria dezenas de projectos sem nome para o que sao. O caminho e
 * arquivar - sai das listas de escolha, continua a ler-se no que ja existe.
 */

/**
 * Slug ASCII estavel a partir do rotulo.
 *
 * Separar o codigo do rotulo permite corrigir "Implementaçao" para "Implementação" sem que nada
 * do que ja aponta para a entrada se perca.
 */
export function slugificar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

/** Prefixo por omissao de uma natureza: as tres primeiras letras uteis do rotulo. */
function prefixoPadrao(rotulo: string): string {
  const letras = slugificar(rotulo).replace(/[^a-z]/g, '');
  return (letras.slice(0, 3) || 'prj').toUpperCase();
}

function paraRef(linha: typeof orgTaxonomies.$inferSelect): TaxonomiaRef {
  return {
    id: linha.id,
    tipo: linha.tipo,
    codigo: linha.codigo,
    rotulo: linha.rotulo,
    cor: linha.cor,
    prefixo: linha.prefixo,
    fasesModelo: linha.fasesModelo ?? [],
    ordem: linha.ordem,
    arquivado: linha.arquivado,
  };
}

export async function listar(
  sessao: Sessao,
  filtros: ListarTaxonomiasInput,
): Promise<TaxonomiaRef[]> {
  const condicoes = [eq(orgTaxonomies.organizationId, sessao.org)];
  if (filtros.tipo) condicoes.push(eq(orgTaxonomies.tipo, filtros.tipo));
  if (!filtros.incluirArquivadas) condicoes.push(eq(orgTaxonomies.arquivado, false));

  const linhas = await db
    .select()
    .from(orgTaxonomies)
    .where(and(...condicoes))
    .orderBy(asc(orgTaxonomies.tipo), asc(orgTaxonomies.ordem), asc(orgTaxonomies.rotulo));

  return linhas.map(paraRef);
}

/** Quantos registos dependem de cada entrada. Decide se o ecra oferece apagar ou arquivar. */
export async function contarUso(sessao: Sessao): Promise<Record<string, number>> {
  const [porNatureza, porEstagio, porDepartamento] = await Promise.all([
    db
      .select({ id: projects.naturezaId, n: count() })
      .from(projects)
      .where(eq(projects.organizationId, sessao.org))
      .groupBy(projects.naturezaId),
    db
      .select({ id: projects.estagioId, n: count() })
      .from(projects)
      .where(eq(projects.organizationId, sessao.org))
      .groupBy(projects.estagioId),
    db
      .select({ id: users.departamentoId, n: count() })
      .from(users)
      .where(eq(users.organizationId, sessao.org))
      .groupBy(users.departamentoId),
  ]);

  const uso: Record<string, number> = {};
  for (const linha of [...porNatureza, ...porEstagio, ...porDepartamento]) {
    if (!linha.id) continue;
    uso[linha.id] = (uso[linha.id] ?? 0) + Number(linha.n);
  }
  return uso;
}

export async function criar(sessao: Sessao, dados: CriarTaxonomiaInput): Promise<TaxonomiaRef> {
  const codigo = slugificar(dados.rotulo);
  if (!codigo) {
    throw erros.validacao('Esse nome não dá um código utilizável. Use letras ou números.', {
      rotulo: 'Use pelo menos uma letra ou número.',
    });
  }

  const [existente] = await db
    .select({ id: orgTaxonomies.id, arquivado: orgTaxonomies.arquivado })
    .from(orgTaxonomies)
    .where(
      and(
        eq(orgTaxonomies.organizationId, sessao.org),
        eq(orgTaxonomies.tipo, dados.tipo),
        eq(orgTaxonomies.codigo, codigo),
      ),
    )
    .limit(1);

  if (existente) {
    // Recriar o que esta arquivado e, na cabeca de quem o faz, a mesma coisa que o repor.
    if (existente.arquivado) return reactivar(sessao, existente.id, dados);
    throw erros.conflito(`Já existe "${dados.rotulo}" no vocabulário da sua empresa.`);
  }

  const [maxOrdem] = await db
    .select({ n: count() })
    .from(orgTaxonomies)
    .where(
      and(eq(orgTaxonomies.organizationId, sessao.org), eq(orgTaxonomies.tipo, dados.tipo)),
    );

  const [linha] = await db
    .insert(orgTaxonomies)
    .values({
      organizationId: sessao.org,
      tipo: dados.tipo,
      codigo,
      rotulo: dados.rotulo,
      cor: dados.cor,
      prefixo: dados.tipo === 'natureza' ? (dados.prefixo ?? prefixoPadrao(dados.rotulo)) : null,
      fasesModelo: dados.tipo === 'natureza' ? dados.fasesModelo : null,
      ordem: Number(maxOrdem?.n ?? 0),
    })
    .returning();

  if (!linha) throw erros.interno('Não foi possível gravar esta entrada do vocabulário.');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'vocabulario.criado',
    entidade: 'taxonomia',
    entidadeId: linha.id,
    detalhe: { tipo: dados.tipo, rotulo: dados.rotulo },
  });

  return paraRef(linha);
}

async function reactivar(
  sessao: Sessao,
  id: string,
  dados: CriarTaxonomiaInput,
): Promise<TaxonomiaRef> {
  const [linha] = await db
    .update(orgTaxonomies)
    .set({
      arquivado: false,
      rotulo: dados.rotulo,
      cor: dados.cor,
      prefixo: dados.tipo === 'natureza' ? (dados.prefixo ?? prefixoPadrao(dados.rotulo)) : null,
      fasesModelo: dados.tipo === 'natureza' ? dados.fasesModelo : null,
      updatedAt: new Date(),
    })
    .where(and(eq(orgTaxonomies.id, id), eq(orgTaxonomies.organizationId, sessao.org)))
    .returning();

  if (!linha) throw erros.naoEncontrado('Esta entrada do vocabulário');
  return paraRef(linha);
}

export async function actualizar(
  sessao: Sessao,
  id: string,
  dados: ActualizarTaxonomiaInput,
): Promise<TaxonomiaRef> {
  const alteracoes: Record<string, unknown> = { updatedAt: new Date() };
  if (dados.rotulo !== undefined) {
    alteracoes.rotulo = dados.rotulo;
    // O codigo segue o rotulo apenas quando ainda nao ha nada a apontar para ele; depois disso
    // mudar o codigo partiria referencias sem que ninguem tivesse pedido isso.
  }
  if (dados.cor !== undefined) alteracoes.cor = dados.cor;
  if (dados.prefixo !== undefined) alteracoes.prefixo = dados.prefixo;
  if (dados.fasesModelo !== undefined) alteracoes.fasesModelo = dados.fasesModelo;
  if (dados.ordem !== undefined) alteracoes.ordem = dados.ordem;
  if (dados.arquivado !== undefined) alteracoes.arquivado = dados.arquivado;

  const [linha] = await db
    .update(orgTaxonomies)
    .set(alteracoes)
    .where(and(eq(orgTaxonomies.id, id), eq(orgTaxonomies.organizationId, sessao.org)))
    .returning();

  if (!linha) throw erros.naoEncontrado('Esta entrada do vocabulário');

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: dados.arquivado ? 'vocabulario.arquivado' : 'vocabulario.actualizado',
    entidade: 'taxonomia',
    entidadeId: id,
    detalhe: { campos: Object.keys(alteracoes).filter((c) => c !== 'updatedAt') },
  });

  return paraRef(linha);
}

/**
 * Remove uma entrada do vocabulario.
 *
 * So apaga a serio o que nunca foi usado. O que ja classifica trabalho e arquivado, e a resposta
 * diz quantos registos dependem dele - a pessoa fica a saber porque e que o produto recusou,
 * em vez de receber um erro de chave estrangeira.
 */
export async function remover(
  sessao: Sessao,
  id: string,
): Promise<{ apagada: boolean; emUso: number }> {
  const [linha] = await db
    .select()
    .from(orgTaxonomies)
    .where(and(eq(orgTaxonomies.id, id), eq(orgTaxonomies.organizationId, sessao.org)))
    .limit(1);

  if (!linha) throw erros.naoEncontrado('Esta entrada do vocabulário');

  const emUso = await contarUsoDe(sessao, linha.tipo, id);

  if (emUso > 0) {
    await actualizar(sessao, id, { arquivado: true });
    return { apagada: false, emUso };
  }

  await exigirNaoSerAUltima(sessao, linha.tipo, id);

  await db
    .delete(orgTaxonomies)
    .where(and(eq(orgTaxonomies.id, id), eq(orgTaxonomies.organizationId, sessao.org)));

  await registar(db, {
    organizationId: sessao.org,
    actorId: sessao.sub,
    accao: 'vocabulario.removido',
    entidade: 'taxonomia',
    entidadeId: id,
    detalhe: { tipo: linha.tipo, rotulo: linha.rotulo },
  });

  return { apagada: true, emUso: 0 };
}

async function contarUsoDe(sessao: Sessao, tipo: TipoTaxonomia, id: string): Promise<number> {
  if (tipo === 'departamento') {
    const [linha] = await db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.organizationId, sessao.org), eq(users.departamentoId, id)));
    return Number(linha?.n ?? 0);
  }

  const coluna = tipo === 'natureza' ? projects.naturezaId : projects.estagioId;
  const [linha] = await db
    .select({ n: count() })
    .from(projects)
    .where(and(eq(projects.organizationId, sessao.org), eq(coluna, id)));
  return Number(linha?.n ?? 0);
}

/**
 * Naturezas e estagios nao podem ficar a zero: sem eles nao se consegue registar um projecto, e
 * o produto ficaria num beco onde a unica saida seria criar de novo o que se acabou de apagar.
 */
async function exigirNaoSerAUltima(
  sessao: Sessao,
  tipo: TipoTaxonomia,
  id: string,
): Promise<void> {
  if (tipo === 'departamento') return;

  const [linha] = await db
    .select({ n: count() })
    .from(orgTaxonomies)
    .where(
      and(
        eq(orgTaxonomies.organizationId, sessao.org),
        eq(orgTaxonomies.tipo, tipo),
        eq(orgTaxonomies.arquivado, false),
        ne(orgTaxonomies.id, id),
      ),
    );

  if (Number(linha?.n ?? 0) === 0) {
    const nome = tipo === 'natureza' ? 'natureza' : 'estágio';
    throw erros.conflito(
      `Esta é a última ${nome}. Crie outra antes de remover esta, ou não conseguirá registar projectos.`,
    );
  }
}

/** Criacao em lote, usada pelo assistente de arranque. */
export async function criarEmLote(
  sessao: Sessao,
  entradas: CriarTaxonomiaInput[],
): Promise<TaxonomiaRef[]> {
  const criadas: TaxonomiaRef[] = [];
  for (const entrada of entradas) {
    criadas.push(await criar(sessao, entrada));
  }
  return criadas;
}

/** Estado do arranque: o que a empresa ja definiu e o que lhe falta. */
export async function estadoArranque(sessao: Sessao) {
  const [vocabulario, equipa, carteira] = await Promise.all([
    db
      .select({ tipo: orgTaxonomies.tipo, n: count() })
      .from(orgTaxonomies)
      .where(
        and(eq(orgTaxonomies.organizationId, sessao.org), eq(orgTaxonomies.arquivado, false)),
      )
      .groupBy(orgTaxonomies.tipo),
    db
      .select({ n: count() })
      .from(users)
      .where(and(eq(users.organizationId, sessao.org), ne(users.nivelAcesso, 'administrador'))),
    db.select({ n: count() }).from(projects).where(eq(projects.organizationId, sessao.org)),
  ]);

  const porTipo = new Map(vocabulario.map((v) => [v.tipo, Number(v.n)]));
  const naturezas = porTipo.get('natureza') ?? 0;
  const estagios = porTipo.get('estagio') ?? 0;

  return {
    naturezas,
    estagios,
    departamentos: porTipo.get('departamento') ?? 0,
    membros: Number(equipa[0]?.n ?? 0),
    projectos: Number(carteira[0]?.n ?? 0),
    /** O portal so e utilizavel quando ha com que classificar um projecto. */
    vocabularioPronto: naturezas > 0 && estagios > 0,
  };
}
