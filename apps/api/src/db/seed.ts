import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { dataDeOffset, deIso } from '@nexora/shared';
import { BCRYPT_ROUNDS } from '../config/env';
import { logModulo, logger } from '../utils/logger';
import { db, fecharLigacao } from './db';
import {
  OFFSET_HOJE,
  PESSOAS,
  PROJECTOS,
  RELATORIOS,
  TAREFAS,
  type RelatorioDesign,
} from './design-data';
import { organizations, orgTaxonomies } from './schema/organizations.schema';
import { phases, projectMembers, projects } from './schema/projects.schema';
import { reports, tasks } from './schema/tasks.schema';
import { users } from './schema/users.schema';

/**
 * Empresa de demonstracao.
 *
 * Deixou de ser a porta de entrada do produto: quem tem uma empresa a serio cria-a na pagina
 * publica, com o seu proprio vocabulario. Isto existe para desenvolvimento e para os testes - uma
 * empresa completa, com o estado do prototipo, sem ter de a construir a mao de cada vez.
 *
 * Como `HOJE = 59` corresponde a 29 de Agosto de 2026, a empresa semeada abre exactamente no
 * estado do prototipo: os mesmos atrasos, os mesmos alertas, as mesmas barras no roteiro.
 */

/** Palavra-passe das contas semeadas. So para desenvolvimento. */
const PASSWORD_SEED = process.env.SEED_PASSWORD ?? 'Voneka#2026!';

const EMPRESA_DEMO = { nome: 'Voneka Consultoria', slug: 'voneka-consultoria', inicial: 'VC' };

/**
 * Vocabulario da empresa de demonstracao.
 * No produto isto e escrito por quem usa; aqui reproduz o que o prototipo tinha fixo no codigo.
 */
const NATUREZAS_DEMO = [
  { codigo: 'implementacao', rotulo: 'Implementação', cor: 'tinta', prefixo: 'PRJ' },
  { codigo: 'concurso', rotulo: 'Concurso', cor: 'ambar', prefixo: 'CNC' },
  { codigo: 'marketing', rotulo: 'Marketing', cor: 'azul', prefixo: 'MKT' },
  { codigo: 'prospeccao', rotulo: 'Prospecção', cor: 'verde', prefixo: 'PRS' },
  { codigo: 'tarefa_regular', rotulo: 'Tarefa regular', cor: 'neutro', prefixo: 'OPS' },
];

const ESTAGIOS_DEMO = [
  { codigo: 'descoberta', rotulo: 'Descoberta', cor: 'neutro' },
  { codigo: 'planeamento', rotulo: 'Planeamento', cor: 'turquesa' },
  { codigo: 'execucao', rotulo: 'Execução', cor: 'tinta' },
  { codigo: 'validacao', rotulo: 'Validação', cor: 'ambar' },
  { codigo: 'entrega', rotulo: 'Entrega', cor: 'verde' },
];

const DEPARTAMENTOS_DEMO = ['Consultoria', 'Dados', 'Terreno', 'Mudança', 'Financeira'];

interface Vocabulario {
  naturezas: Map<string, string>;
  estagios: Map<string, string>;
  departamentos: Map<string, string>;
}

/** Constroi um timestamp a partir de um offset de dia e de uma hora `HH:MM`. */
function instante(offset: number, hora: string): Date {
  const dia = dataDeOffset(offset);
  const [h, m] = hora.split(':').map(Number);
  return new Date(Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), h ?? 0, m ?? 0));
}

/** Resolve um codigo do vocabulario, falhando alto quando o seed e o design divergem. */
function exigir(mapa: Map<string, string>, codigo: string, tipo: string): string {
  const id = mapa.get(codigo);
  if (!id) throw new Error(`Vocabulario em falta: ${tipo} "${codigo}"`);
  return id;
}

/** Codigo ASCII estavel a partir de um rotulo, como o servico de vocabulario faz. */
function codigoDe(rotulo: string): string {
  return rotulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function limpar(): Promise<void> {
  // Uma so instrucao: o CASCADE trata das dependencias e o RESTART limpa as sequencias.
  await db.execute(sql`
    TRUNCATE TABLE
      audit_log, notifications, task_extensions, reports, tasks,
      phases, project_members, projects, org_taxonomies, refresh_tokens, users, organizations
    RESTART IDENTITY CASCADE
  `);
  logger.info(logModulo('seed', 'Tabelas limpas'));
}

async function semearEmpresa(): Promise<{ empresaId: string; vocabulario: Vocabulario }> {
  const [empresa] = await db
    .insert(organizations)
    .values({
      nome: EMPRESA_DEMO.nome,
      slug: EMPRESA_DEMO.slug,
      inicialLogotipo: EMPRESA_DEMO.inicial,
    })
    .returning({ id: organizations.id });

  if (!empresa) throw new Error('Falha ao criar a empresa de demonstracao.');

  const naturezas = new Map<string, string>();
  const estagios = new Map<string, string>();
  const departamentos = new Map<string, string>();

  for (const [ordem, n] of NATUREZAS_DEMO.entries()) {
    const [linha] = await db
      .insert(orgTaxonomies)
      .values({
        organizationId: empresa.id,
        tipo: 'natureza',
        codigo: n.codigo,
        rotulo: n.rotulo,
        cor: n.cor,
        prefixo: n.prefixo,
        ordem,
      })
      .returning({ id: orgTaxonomies.id });
    if (linha) naturezas.set(n.codigo, linha.id);
  }

  for (const [ordem, e] of ESTAGIOS_DEMO.entries()) {
    const [linha] = await db
      .insert(orgTaxonomies)
      .values({
        organizationId: empresa.id,
        tipo: 'estagio',
        codigo: e.codigo,
        rotulo: e.rotulo,
        cor: e.cor,
        ordem,
      })
      .returning({ id: orgTaxonomies.id });
    if (linha) estagios.set(e.codigo, linha.id);
  }

  for (const [ordem, d] of DEPARTAMENTOS_DEMO.entries()) {
    const [linha] = await db
      .insert(orgTaxonomies)
      .values({
        organizationId: empresa.id,
        tipo: 'departamento',
        codigo: codigoDe(d),
        rotulo: d,
        cor: 'neutro',
        ordem,
      })
      .returning({ id: orgTaxonomies.id });
    if (linha) departamentos.set(d, linha.id);
  }

  logger.info(logModulo('seed', `Empresa ${EMPRESA_DEMO.nome} criada com o seu vocabulario`));
  return { empresaId: empresa.id, vocabulario: { naturezas, estagios, departamentos } };
}

async function semearUtilizadores(
  empresaId: string,
  vocabulario: Vocabulario,
): Promise<Map<string, string>> {
  const hash = await bcrypt.hash(PASSWORD_SEED, BCRYPT_ROUNDS);
  const porNome = new Map<string, string>();

  for (const pessoa of PESSOAS) {
    const [linha] = await db
      .insert(users)
      .values({
        organizationId: empresaId,
        nome: pessoa.nome,
        email: pessoa.email,
        // Quem tem convite pendente ainda nao definiu palavra-passe e nao consegue entrar.
        passwordHash: pessoa.conviteAceite ? hash : null,
        funcao: pessoa.funcao,
        departamentoId: vocabulario.departamentos.get(pessoa.dept) ?? null,
        dataEntrada: deIso(pessoa.entrada),
        alocacao: pessoa.alocacao,
        nivelAcesso: pessoa.acesso,
        estado: pessoa.conviteAceite ? 'activo' : 'convite_pendente',
      })
      .returning({ id: users.id });

    if (linha) porNome.set(pessoa.nome, linha.id);
  }

  logger.info(logModulo('seed', `${porNome.size} utilizadores criados`));
  return porNome;
}

interface RefFase {
  id: string;
  nome: string;
}

async function semearProjectos(
  empresaId: string,
  vocabulario: Vocabulario,
  utilizadores: Map<string, string>,
): Promise<{ projectos: Map<string, string>; fases: Map<string, RefFase[]> }> {
  const porNome = new Map<string, string>();
  const fasesPorProjecto = new Map<string, RefFase[]>();

  for (const p of PROJECTOS) {
    const responsavelId = utilizadores.get(p.responsavel);
    if (!responsavelId) throw new Error(`Responsavel desconhecido: ${p.responsavel}`);

    // O design mostrava o consumo como percentagem; aqui guardamos o valor em centavos e a
    // percentagem volta a ser derivada na leitura, que e como deve ser.
    const orcamentoCentavos = p.orcamento === null ? null : p.orcamento * 100;
    const consumidoCentavos =
      orcamentoCentavos === null || p.consumidoPct === null
        ? null
        : Math.round((orcamentoCentavos * p.consumidoPct) / 100);

    const inicioProjecto = dataDeOffset(Math.min(...p.fases.map((f) => f.s)));

    const [projecto] = await db
      .insert(projects)
      .values({
        organizationId: empresaId,
        codigo: p.codigo,
        nome: p.nome,
        cliente: p.cliente,
        naturezaId: exigir(vocabulario.naturezas, p.natureza, 'natureza'),
        estagioId: exigir(vocabulario.estagios, p.estagio, 'estagio'),
        saude: p.saude,
        responsavelId,
        inicio: inicioProjecto,
        deadline: dataDeOffset(p.dl),
        avancoPct: p.avancoPct,
        orcamentoCentavos,
        consumidoCentavos,
      })
      .returning({ id: projects.id });

    if (!projecto) throw new Error(`Falha ao criar o projecto ${p.codigo}`);
    porNome.set(p.nome, projecto.id);

    const membros = p.equipa
      .map((nome) => utilizadores.get(nome))
      .filter((id): id is string => Boolean(id))
      .map((userId) => ({ projectId: projecto.id, userId }));
    if (membros.length) await db.insert(projectMembers).values(membros);

    const linhasFase = p.fases.map((f, ordem) => {
      const startsOn = dataDeOffset(f.s);
      const endsOn = dataDeOffset(f.s + f.d);
      return {
        projectId: projecto.id,
        nome: f.nome,
        estado: f.estado,
        nota: f.nota,
        ordem,
        startsOn,
        endsOn,
        // O plano semeado e o plano original: e a ele que "Repor plano original" regressa.
        planeadoStartsOn: startsOn,
        planeadoEndsOn: endsOn,
      };
    });

    const criadas = await db
      .insert(phases)
      .values(linhasFase)
      .returning({ id: phases.id, nome: phases.nome });
    fasesPorProjecto.set(p.nome, criadas);
  }

  logger.info(logModulo('seed', `${porNome.size} projectos criados`));
  return { projectos: porNome, fases: fasesPorProjecto };
}

async function semearTarefas(
  empresaId: string,
  utilizadores: Map<string, string>,
  projectos: Map<string, string>,
  fases: Map<string, RefFase[]>,
): Promise<Map<string, string>> {
  const adminId = utilizadores.get('Alcino Maido');
  if (!adminId) throw new Error('Conta de Direccao em falta.');

  const idPorTitulo = new Map<string, string>();

  const faseId = (projecto: string, nomeFase: string): string | null =>
    fases.get(projecto)?.find((f) => f.nome === nomeFase)?.id ?? null;

  for (const t of TAREFAS) {
    const projectId = projectos.get(t.projecto);
    const responsavelId = utilizadores.get(t.responsavel);
    if (!projectId || !responsavelId) throw new Error(`Tarefa sem projecto ou responsavel: ${t.titulo}`);

    const concluida = t.estado === 'concluida';
    const [linha] = await db
      .insert(tasks)
      .values({
        organizationId: empresaId,
        projectId,
        phaseId: faseId(t.projecto, t.fase),
        titulo: t.titulo,
        responsavelId,
        // Quem atribui e sempre a Direccao ou o gestor; no seed fica a Direccao.
        atribuidoPorId: adminId,
        deadline: dataDeOffset(t.dl),
        esforcoEstimadoHoras: t.horasEst,
        esforcoRealHoras: t.horas,
        estado: t.estado,
        concluidaEm: concluida ? instante(t.dl, '17:00') : null,
      })
      .returning({ id: tasks.id });

    if (linha) idPorTitulo.set(t.titulo, linha.id);
  }

  // Cada relatorio nasce de uma tarefa. As tarefas que o design citava apenas no feed sao criadas
  // aqui, ja fechadas, para que nenhum relatorio fique orfao.
  const emFalta = RELATORIOS.filter((r) => !idPorTitulo.has(r.tarefa));
  for (const r of emFalta) {
    const projectId = projectos.get(r.projecto);
    const responsavelId = utilizadores.get(r.autor);
    if (!projectId || !responsavelId) throw new Error(`Relatorio sem projecto ou autor: ${r.tarefa}`);

    const [linha] = await db
      .insert(tasks)
      .values({
        organizationId: empresaId,
        projectId,
        phaseId: faseId(r.projecto, r.fase),
        titulo: r.tarefa,
        responsavelId,
        atribuidoPorId: adminId,
        deadline: dataDeOffset(r.diaOffset),
        esforcoEstimadoHoras: r.horasEst,
        esforcoRealHoras: r.horasReais,
        estado: 'concluida',
        concluidaEm: instante(r.diaOffset, r.hora),
      })
      .returning({ id: tasks.id });

    if (linha) idPorTitulo.set(r.tarefa, linha.id);
  }

  logger.info(logModulo('seed', `${idPorTitulo.size} tarefas criadas`));
  return idPorTitulo;
}

async function semearRelatorios(
  empresaId: string,
  utilizadores: Map<string, string>,
  tarefas: Map<string, string>,
): Promise<void> {
  const adminId = utilizadores.get('Alcino Maido');

  const linhas = RELATORIOS.map((r: RelatorioDesign) => {
    const taskId = tarefas.get(r.tarefa);
    const autorId = utilizadores.get(r.autor);
    if (!taskId || !autorId) throw new Error(`Relatorio sem tarefa ou autor: ${r.tarefa}`);

    const submetidoEm = instante(r.diaOffset, r.hora);
    const decidido = r.validacao !== 'a_espera';

    return {
      organizationId: empresaId,
      taskId,
      autorId,
      situacao: r.situacao,
      texto: r.texto,
      esforcoRealHoras: r.horasReais,
      validacao: r.validacao,
      validadoPorId: decidido ? (adminId ?? null) : null,
      validadoEm: decidido ? submetidoEm : null,
      createdAt: submetidoEm,
    };
  });

  await db.insert(reports).values(linhas);
  logger.info(logModulo('seed', `${linhas.length} relatorios criados`));
}

async function main(): Promise<void> {
  // O seed apaga a base inteira. Em producao isso nunca e o que se quer, por muito que o comando
  // tenha sido escrito por engano.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('O seed apaga todos os dados e não corre em produção.');
  }

  logger.info(logModulo('seed', `A semear com hoje = offset ${OFFSET_HOJE}`));

  await limpar();
  const { empresaId, vocabulario } = await semearEmpresa();
  const utilizadores = await semearUtilizadores(empresaId, vocabulario);
  const { projectos, fases } = await semearProjectos(empresaId, vocabulario, utilizadores);
  const tarefas = await semearTarefas(empresaId, utilizadores, projectos, fases);
  await semearRelatorios(empresaId, utilizadores, tarefas);

  logger.info(logModulo('seed', 'Concluido'));
  logger.info(
    logModulo('seed', `Contas activas usam a palavra-passe: ${PASSWORD_SEED} (apenas desenvolvimento)`),
  );
  await fecharLigacao();
}

main().catch(async (erro: unknown) => {
  logger.error(logModulo('seed', `Falhou: ${(erro as Error).message}`));
  await fecharLigacao();
  process.exit(1);
});
