/**
 * Dados do design, portados de `NEXORA Projectos.dc.html`.
 *
 * Os offsets sao dias desde `BASE_ROTEIRO` (1 de Julho de 2026), tal como no design. O seed
 * converte-os em datas reais; como `HOJE = 59` corresponde a 29 de Agosto de 2026, a aplicacao
 * semeada abre exactamente no estado do prototipo.
 *
 * Este ficheiro e deliberadamente uma transcricao, nao uma interpretacao: os textos, os numeros e
 * as notas sao os do design, para que a comparacao lado a lado seja um teste honesto.
 */

import type {
  EstadoFase,
  EstadoTarefa,
  NivelAcesso,
  Saude,
  Situacao,
  Validacao,
} from '@nexora/shared';

/** Offset do dia de hoje no calendario interno do design. */
export const OFFSET_HOJE = 59;

export interface PessoaDesign {
  nome: string;
  funcao: string;
  email: string;
  dept: string;
  acesso: NivelAcesso;
  conviteAceite: boolean;
  entrada: string;
  alocacao: number;
}

/**
 * As seis pessoas do design mais a conta de Direccao.
 * `Alcino Maido` e quem valida os relatorios no design (`Validado por Alcino Maido`) e quem o
 * cabecalho identifica como `Direcção · Administrador`.
 */
export const PESSOAS: PessoaDesign[] = [
  {
    nome: 'Alcino Maido',
    funcao: 'Direcção',
    email: 'alcino.maido@nexora.co.mz',
    dept: 'Financeira',
    acesso: 'administrador',
    conviteAceite: true,
    entrada: '2021-01-04',
    alocacao: 100,
  },
  {
    nome: 'Cláudia Bila',
    funcao: 'Analista de Processos',
    email: 'claudia.bila@nexora.co.mz',
    dept: 'Consultoria',
    acesso: 'colaborador',
    conviteAceite: true,
    entrada: '2024-03-01',
    alocacao: 100,
  },
  {
    nome: 'Nuno Chirindza',
    funcao: 'Engenheiro de Dados',
    email: 'nuno.chirindza@nexora.co.mz',
    dept: 'Dados',
    acesso: 'colaborador',
    conviteAceite: true,
    entrada: '2023-09-01',
    alocacao: 75,
  },
  {
    nome: 'Ivete Macuácua',
    funcao: 'Consultora Sénior',
    email: 'ivete.macuacua@nexora.co.mz',
    dept: 'Consultoria',
    acesso: 'gestor',
    conviteAceite: true,
    entrada: '2022-01-03',
    alocacao: 100,
  },
  {
    nome: 'Hélder Tembe',
    funcao: 'Especialista de Integrações',
    email: 'helder.tembe@nexora.co.mz',
    dept: 'Dados',
    acesso: 'gestor',
    conviteAceite: true,
    entrada: '2023-06-01',
    alocacao: 75,
  },
  {
    nome: 'Sara Nhaca',
    funcao: 'Gestora de Mudança',
    email: 'sara.nhaca@nexora.co.mz',
    dept: 'Mudança',
    acesso: 'colaborador',
    conviteAceite: true,
    entrada: '2024-11-01',
    alocacao: 100,
  },
  {
    nome: 'Jorge Alfane',
    funcao: 'Coordenador de Terreno',
    email: 'jorge.alfane@nexora.co.mz',
    dept: 'Terreno',
    acesso: 'colaborador',
    /** No design aparece como `Convite pendente`: a conta existe mas ainda nao foi activada. */
    conviteAceite: false,
    entrada: '2026-08-01',
    alocacao: 50,
  },
];

export interface FaseDesign {
  nome: string;
  estado: EstadoFase;
  /** Offset de inicio. */
  s: number;
  /** Duracao em dias. */
  d: number;
  nota: string;
}

export interface ProjectoDesign {
  codigo: string;
  nome: string;
  cliente: string;
  /**
   * Codigo da natureza e do estagio no vocabulario da empresa de demonstracao.
   * Deixaram de ser enums do produto: o seed cria estas entradas e resolve-as por codigo.
   */
  natureza: string;
  estagio: string;
  saude: Saude;
  avancoPct: number;
  responsavel: string;
  /** Offset da deadline de entrega. */
  dl: number;
  /** Orcamento em meticais inteiros; `null` quando o design mostra um travessao. */
  orcamento: number | null;
  /** Percentagem de orcamento consumido. */
  consumidoPct: number | null;
  equipa: string[];
  fases: FaseDesign[];
}

export const PROJECTOS: ProjectoDesign[] = [
  {
    codigo: 'PRJ-114',
    nome: 'Migração do ERP — fase 2',
    cliente: 'Cimentos de Moçambique',
    natureza: 'implementacao',
    estagio: 'execucao',
    saude: 'no_prazo',
    avancoPct: 62,
    responsavel: 'Ivete Macuácua',
    dl: 170,
    orcamento: 4_200_000,
    consumidoPct: 61,
    equipa: ['Ivete Macuácua', 'Nuno Chirindza', 'Cláudia Bila', 'Sara Nhaca', 'Jorge Alfane', 'Hélder Tembe'],
    fases: [
      { nome: 'Descoberta', estado: 'concluida', s: 0, d: 23, nota: 'Levantamento em quatro unidades. Relatório aceite pelo cliente a 24 Jul.' },
      { nome: 'Desenho da solução', estado: 'concluida', s: 25, d: 30, nota: 'Arquitectura de integração validada com a equipa de TI do cliente.' },
      { nome: 'Configuração e migração', estado: 'em_curso', s: 57, d: 57, nota: 'Dois módulos migrados. Falta contabilidade analítica e activos fixos.' },
      { nome: 'Testes de aceitação', estado: 'planeada', s: 116, d: 28, nota: 'Depende do encerramento do mês de Outubro no sistema antigo.' },
      { nome: 'Entrada em produção', estado: 'planeada', s: 146, d: 32, nota: 'Janela de corte a 15 Dez, com duas semanas de apoio reforçado.' },
    ],
  },
  {
    codigo: 'PRJ-108',
    nome: 'Central de facturação electrónica',
    cliente: 'Grupo Madal',
    natureza: 'implementacao',
    estagio: 'validacao',
    saude: 'em_risco',
    avancoPct: 84,
    responsavel: 'Hélder Tembe',
    dl: 87,
    orcamento: 2_750_000,
    consumidoPct: 88,
    equipa: ['Hélder Tembe', 'Cláudia Bila', 'Sara Nhaca', 'Nuno Chirindza'],
    fases: [
      { nome: 'Descoberta', estado: 'concluida', s: 0, d: 20, nota: 'Requisitos fiscais confirmados com a Autoridade Tributária.' },
      { nome: 'Desenvolvimento', estado: 'concluida', s: 22, d: 62, nota: 'Emissão, anulação e séries documentais entregues.' },
      { nome: 'Validação fiscal', estado: 'atrasada', s: 86, d: 28, nota: 'Parecer externo pendente há 11 dias. Risco directo na data de entrada.' },
      { nome: 'Entrega', estado: 'planeada', s: 116, d: 24, nota: 'Formação de facturação em duas sessões.' },
    ],
  },
  {
    codigo: 'PRJ-121',
    nome: 'Reestruturação do armazém central',
    cliente: 'Distribuidora Zambeze',
    natureza: 'implementacao',
    estagio: 'planeamento',
    saude: 'no_prazo',
    avancoPct: 28,
    responsavel: 'Jorge Alfane',
    dl: 152,
    orcamento: 1_900_000,
    consumidoPct: 24,
    equipa: ['Jorge Alfane', 'Cláudia Bila', 'Ivete Macuácua', 'Sara Nhaca', 'Nuno Chirindza'],
    fases: [
      { nome: 'Diagnóstico de fluxos', estado: 'concluida', s: 28, d: 30, nota: 'Medição de tempos de picking em três turnos.' },
      { nome: 'Plano de layout', estado: 'em_curso', s: 60, d: 30, nota: 'Proposta de duas plantas alternativas em avaliação.' },
      { nome: 'Obra e reorganização', estado: 'planeada', s: 92, d: 58, nota: 'Execução por sectores para não parar a expedição.' },
    ],
  },
  {
    codigo: 'PRJ-096',
    nome: 'Painel de indicadores da Direcção',
    cliente: 'Banco Índico',
    natureza: 'implementacao',
    estagio: 'entrega',
    saude: 'no_prazo',
    avancoPct: 95,
    responsavel: 'Nuno Chirindza',
    dl: 66,
    orcamento: 3_100_000,
    consumidoPct: 92,
    equipa: ['Nuno Chirindza', 'Ivete Macuácua', 'Cláudia Bila', 'Hélder Tembe'],
    fases: [
      { nome: 'Modelo de dados', estado: 'concluida', s: 0, d: 30, nota: 'Camada semântica sobre o data warehouse existente.' },
      { nome: 'Construção dos painéis', estado: 'concluida', s: 32, d: 30, nota: 'Nove painéis, três perfis de acesso.' },
      { nome: 'Aceitação e passagem', estado: 'em_curso', s: 64, d: 24, nota: 'Falta assinatura de aceitação da Direcção Financeira.' },
    ],
  },
  {
    codigo: 'PRJ-129',
    nome: 'Programa de conformidade fiscal',
    cliente: 'Petromoc Serviços',
    natureza: 'implementacao',
    estagio: 'descoberta',
    saude: 'no_prazo',
    avancoPct: 11,
    responsavel: 'Cláudia Bila',
    dl: 234,
    orcamento: 2_400_000,
    consumidoPct: 7,
    equipa: ['Cláudia Bila', 'Ivete Macuácua', 'Hélder Tembe'],
    fases: [
      { nome: 'Enquadramento legal', estado: 'em_curso', s: 62, d: 30, nota: 'Inventário de obrigações por tipo de contrato.' },
      { nome: 'Desenho do programa', estado: 'planeada', s: 94, d: 58, nota: 'Políticas, matriz de responsabilidades e calendário fiscal.' },
    ],
  },
  {
    codigo: 'PRJ-117',
    nome: 'Digitalização de arquivo contratual',
    cliente: 'Seguradora Costa Sul',
    natureza: 'implementacao',
    estagio: 'execucao',
    saude: 'atrasado',
    avancoPct: 46,
    responsavel: 'Sara Nhaca',
    dl: 136,
    orcamento: 1_350_000,
    consumidoPct: 58,
    equipa: ['Sara Nhaca', 'Cláudia Bila', 'Jorge Alfane', 'Nuno Chirindza', 'Ivete Macuácua'],
    fases: [
      { nome: 'Inventário físico', estado: 'concluida', s: 0, d: 48, nota: '18 400 contratos catalogados em dois arquivos.' },
      { nome: 'Digitalização', estado: 'atrasada', s: 50, d: 68, nota: 'Ritmo 40% abaixo do plano por avaria de dois scanners.' },
      { nome: 'Indexação e pesquisa', estado: 'planeada', s: 120, d: 30, nota: 'Indexação por apólice, titular e data de renovação.' },
    ],
  },
  {
    codigo: 'PRJ-132',
    nome: 'Integração da rede de agentes',
    cliente: 'Mozambique Fintech',
    natureza: 'implementacao',
    estagio: 'planeamento',
    saude: 'no_prazo',
    avancoPct: 19,
    responsavel: 'Hélder Tembe',
    dl: 214,
    orcamento: 5_600_000,
    consumidoPct: 12,
    equipa: ['Hélder Tembe', 'Ivete Macuácua', 'Nuno Chirindza', 'Cláudia Bila', 'Sara Nhaca', 'Jorge Alfane'],
    fases: [
      { nome: 'Arquitectura de integração', estado: 'em_curso', s: 62, d: 48, nota: 'Escolha entre barramento próprio e plataforma gerida.' },
      { nome: 'Piloto em 12 agentes', estado: 'planeada', s: 112, d: 66, nota: 'Piloto em Maputo e Beira antes do alargamento nacional.' },
    ],
  },
  {
    codigo: 'CNC-041',
    nome: 'Concurso público — gestão portuária',
    cliente: 'Portos e Caminhos de Ferro (CFM)',
    natureza: 'concurso',
    estagio: 'planeamento',
    saude: 'em_risco',
    avancoPct: 35,
    responsavel: 'Ivete Macuácua',
    dl: 74,
    orcamento: null,
    consumidoPct: null,
    equipa: ['Ivete Macuácua', 'Cláudia Bila', 'Hélder Tembe'],
    fases: [
      { nome: 'Elegibilidade e caderno de encargos', estado: 'concluida', s: 40, d: 16, nota: 'Requisitos de elegibilidade confirmados; garantia bancária em preparação.' },
      { nome: 'Proposta técnica e financeira', estado: 'em_curso', s: 58, d: 14, nota: 'Preço em fecho. Falta a carta de referências de três clientes.' },
      { nome: 'Submissão e defesa', estado: 'planeada', s: 74, d: 10, nota: 'Entrega em mão até 12 Set, defesa oral prevista para a semana seguinte.' },
    ],
  },
  {
    codigo: 'MKT-012',
    nome: 'Posicionamento no sector financeiro',
    cliente: 'Voneka · interno',
    natureza: 'marketing',
    estagio: 'execucao',
    saude: 'no_prazo',
    avancoPct: 58,
    responsavel: 'Sara Nhaca',
    dl: 122,
    orcamento: 860_000,
    consumidoPct: 54,
    equipa: ['Sara Nhaca', 'Cláudia Bila', 'Ivete Macuácua'],
    fases: [
      { nome: 'Mensagem e provas', estado: 'concluida', s: 31, d: 24, nota: 'Três casos de cliente documentados com números autorizados.' },
      { nome: 'Produção de conteúdos', estado: 'em_curso', s: 57, d: 40, nota: 'Dois estudos de caso e a série de artigos técnicos.' },
      { nome: 'Activação e medição', estado: 'planeada', s: 99, d: 30, nota: 'Evento com directores financeiros em Novembro.' },
    ],
  },
  {
    codigo: 'PRS-007',
    nome: 'Prospecção — agro-indústria da região centro',
    cliente: 'Voneka · interno',
    natureza: 'prospeccao',
    estagio: 'descoberta',
    saude: 'no_prazo',
    avancoPct: 22,
    responsavel: 'Jorge Alfane',
    dl: 153,
    orcamento: 320_000,
    consumidoPct: 18,
    equipa: ['Jorge Alfane', 'Sara Nhaca'],
    fases: [
      { nome: 'Mapa de contas-alvo', estado: 'em_curso', s: 50, d: 35, nota: '28 empresas identificadas em Manica, Sofala e Zambézia.' },
      { nome: 'Abordagem e reuniões', estado: 'planeada', s: 88, d: 42, nota: 'Duas semanas de terreno por província.' },
    ],
  },
  {
    codigo: 'OPS-003',
    nome: 'Fecho mensal e reporte de carteira',
    cliente: 'Voneka · interno',
    natureza: 'tarefa_regular',
    estagio: 'execucao',
    saude: 'no_prazo',
    avancoPct: 67,
    responsavel: 'Cláudia Bila',
    dl: 63,
    orcamento: null,
    consumidoPct: null,
    equipa: ['Cláudia Bila', 'Alcino Maido'],
    fases: [
      { nome: 'Recolha de dados', estado: 'em_curso', s: 57, d: 5, nota: 'Horas, custos e avanço declarado por cada gestor.' },
      { nome: 'Consolidação', estado: 'planeada', s: 62, d: 3, nota: 'Conferência com a contabilidade.' },
      { nome: 'Reporte à Direcção', estado: 'planeada', s: 65, d: 2, nota: 'Reunião de carteira na primeira segunda-feira.' },
    ],
  },
];

export interface TarefaDesign {
  titulo: string;
  fase: string;
  responsavel: string;
  projecto: string;
  dl: number;
  estado: EstadoTarefa;
  horas: number;
  horasEst: number;
}

export const TAREFAS: TarefaDesign[] = [
  { titulo: 'Validar plano de contas com o cliente', fase: 'Configuração e migração', responsavel: 'Ivete Macuácua', projecto: 'Migração do ERP — fase 2', dl: 51, estado: 'atrasada', horas: 14, horasEst: 10 },
  { titulo: 'Obter parecer fiscal externo', fase: 'Validação fiscal', responsavel: 'Hélder Tembe', projecto: 'Central de facturação electrónica', dl: 48, estado: 'atrasada', horas: 9, horasEst: 6 },
  { titulo: 'Repor capacidade de digitalização', fase: 'Digitalização', responsavel: 'Sara Nhaca', projecto: 'Digitalização de arquivo contratual', dl: 57, estado: 'atrasada', horas: 5, horasEst: 4 },
  { titulo: 'Revisão de qualidade por amostragem', fase: 'Digitalização', responsavel: 'Cláudia Bila', projecto: 'Digitalização de arquivo contratual', dl: 57, estado: 'atrasada', horas: 6, horasEst: 12 },
  { titulo: 'Recolher aceitação formal da Direcção', fase: 'Aceitação e passagem', responsavel: 'Nuno Chirindza', projecto: 'Painel de indicadores da Direcção', dl: 59, estado: 'em_curso', horas: 3, horasEst: 4 },
  { titulo: 'Mapear activos fixos por unidade', fase: 'Configuração e migração', responsavel: 'Jorge Alfane', projecto: 'Migração do ERP — fase 2', dl: 60, estado: 'em_curso', horas: 11, horasEst: 20 },
  { titulo: 'Migrar contabilidade analítica', fase: 'Configuração e migração', responsavel: 'Nuno Chirindza', projecto: 'Migração do ERP — fase 2', dl: 63, estado: 'em_curso', horas: 22, horasEst: 30 },
  { titulo: 'Decidir plataforma de integração', fase: 'Arquitectura de integração', responsavel: 'Hélder Tembe', projecto: 'Integração da rede de agentes', dl: 66, estado: 'em_curso', horas: 12, horasEst: 20 },
  { titulo: 'Fechar planta definitiva do armazém', fase: 'Plano de layout', responsavel: 'Jorge Alfane', projecto: 'Reestruturação do armazém central', dl: 69, estado: 'em_curso', horas: 18, horasEst: 26 },
  { titulo: 'Inventariar obrigações declarativas', fase: 'Enquadramento legal', responsavel: 'Cláudia Bila', projecto: 'Programa de conformidade fiscal', dl: 71, estado: 'em_curso', horas: 7, horasEst: 18 },
  { titulo: 'Guião de formação para 40 utilizadores', fase: 'Testes de aceitação', responsavel: 'Sara Nhaca', projecto: 'Migração do ERP — fase 2', dl: 72, estado: 'pendente', horas: 0, horasEst: 16 },
  { titulo: 'Orçamentar obra civil', fase: 'Plano de layout', responsavel: 'Cláudia Bila', projecto: 'Reestruturação do armazém central', dl: 73, estado: 'pendente', horas: 0, horasEst: 12 },
  { titulo: 'Levantamento de processos — 4 unidades', fase: 'Descoberta', responsavel: 'Cláudia Bila', projecto: 'Migração do ERP — fase 2', dl: 23, estado: 'concluida', horas: 38, horasEst: 36 },
];

export interface RelatorioDesign {
  autor: string;
  situacao: Situacao;
  /** Offset do dia em que foi submetido. */
  diaOffset: number;
  hora: string;
  tarefa: string;
  projecto: string;
  fase: string;
  validacao: Validacao;
  horasReais: number;
  horasEst: number;
  texto: string;
}

/**
 * Os seis relatorios do feed.
 *
 * No design os relatorios citavam tarefas que nao existiam na lista de tarefas. Aqui cada
 * relatorio nasce de uma tarefa concluida - um relato sem tarefa nao teria de onde vir - e por
 * isso o seed cria tambem essas tarefas, ja fechadas.
 */
export const RELATORIOS: RelatorioDesign[] = [
  {
    autor: 'Cláudia Bila',
    situacao: 'sem_obstaculos',
    diaOffset: 59,
    hora: '09:14',
    tarefa: 'Levantamento de processos — 4 unidades',
    projecto: 'Migração do ERP — fase 2',
    fase: 'Descoberta',
    validacao: 'validado',
    horasReais: 38,
    horasEst: 36,
    texto:
      'Levantamento fechado nas quatro unidades dentro do prazo. A única divergência relevante está no fluxo de compras da Matola, onde as requisições passam por uma dupla aprovação informal que não existe no manual. Proponho normalizar isto já na fase de desenho para não arrastarmos a excepção para o sistema novo.',
  },
  {
    autor: 'Nuno Chirindza',
    situacao: 'com_obstaculo',
    diaOffset: 59,
    hora: '08:02',
    tarefa: 'Extracção do histórico contabilístico',
    projecto: 'Migração do ERP — fase 2',
    fase: 'Configuração e migração',
    validacao: 'a_espera',
    horasReais: 26,
    horasEst: 24,
    texto:
      'Extracção concluída para 2023 e 2024. O ano de 2022 tem 1 840 lançamentos sem centro de custo, o que trava a validação automática. Preciso de uma decisão da Direcção Financeira: atribuir um centro de custo genérico ou deixar esse histórico fora do sistema novo.',
  },
  {
    autor: 'Sara Nhaca',
    situacao: 'bloqueado',
    diaOffset: 58,
    hora: '17:40',
    tarefa: 'Digitalização do lote 6',
    projecto: 'Digitalização de arquivo contratual',
    fase: 'Digitalização',
    validacao: 'escalado',
    horasReais: 31,
    horasEst: 28,
    texto:
      'Dois dos quatro scanners estão avariados desde 21 de Agosto e o fornecedor não confirma data de reparação. O ritmo caiu para 380 contratos por dia contra os 620 planeados. Sem equipamento de substituição esta semana, a fase escorrega para Novembro.',
  },
  {
    autor: 'Hélder Tembe',
    situacao: 'com_obstaculo',
    diaOffset: 58,
    hora: '15:12',
    tarefa: 'Testes de emissão em ambiente fiscal',
    projecto: 'Central de facturação electrónica',
    fase: 'Validação fiscal',
    validacao: 'a_espera',
    horasReais: 19,
    horasEst: 16,
    texto:
      'Emissão, anulação e notas de crédito passam todos os testes. Continuamos à espera do parecer fiscal externo, pedido a 18 de Agosto. Enquanto não chegar não posso fechar a fase de validação, e a data de entrada em produção fica sob risco.',
  },
  {
    autor: 'Jorge Alfane',
    situacao: 'sem_obstaculos',
    diaOffset: 58,
    hora: '11:26',
    tarefa: 'Medição de tempos de picking',
    projecto: 'Reestruturação do armazém central',
    fase: 'Diagnóstico de fluxos',
    validacao: 'validado',
    horasReais: 44,
    horasEst: 40,
    texto:
      'Medições feitas nos três turnos ao longo de duas semanas. O turno da noite tem 34% mais deslocação por linha recolhida, quase todo explicado pela dispersão dos artigos de alta rotação. Isso sustenta a planta alternativa que junta esses artigos junto à expedição.',
  },
  {
    autor: 'Cláudia Bila',
    situacao: 'sem_obstaculos',
    diaOffset: 56,
    hora: '16:55',
    tarefa: 'Matriz de requisitos fiscais',
    projecto: 'Programa de conformidade fiscal',
    fase: 'Enquadramento legal',
    validacao: 'validado',
    horasReais: 22,
    horasEst: 20,
    texto:
      'Matriz fechada com 62 obrigações declarativas mapeadas por tipo de contrato. Duas obrigações municipais precisam de confirmação jurídica antes de entrarem no calendário fiscal, mas não bloqueiam o desenho do programa.',
  },
];

/**
 * Carga e cumprimento de prazos por pessoa, na ordem em que aparecem na tabela de Equipa.
 * No design eram dois arrays de constantes ao lado da lista de pessoas.
 */
export const METRICAS_EQUIPA: Record<string, { carga: number; cumprimento: number }> = {
  'Cláudia Bila': { carga: 86, cumprimento: 92 },
  'Nuno Chirindza': { carga: 72, cumprimento: 88 },
  'Ivete Macuácua': { carga: 94, cumprimento: 74 },
  'Hélder Tembe': { carga: 68, cumprimento: 81 },
  'Sara Nhaca': { carga: 91, cumprimento: 69 },
  'Jorge Alfane': { carga: 57, cumprimento: 95 },
  'Alcino Maido': { carga: 40, cumprimento: 96 },
};
