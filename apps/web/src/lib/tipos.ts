import type {
  Alerta,
  EstadoFase,
  EstadoTarefa,
  NivelAcesso,
  Prioridade,
  Saude,
  Situacao,
  Validacao,
} from '@nexora/shared';

/**
 * Formas devolvidas pela API.
 *
 * As datas chegam como texto ISO no JSON e sao convertidas para `Date` na fronteira, em
 * `lib/datas.ts`. Estes tipos descrevem o que ja foi convertido, para que nenhum ecra tenha de se
 * lembrar de que aquele campo ainda e uma string.
 */

/**
 * Uma etiqueta do vocabulario da empresa.
 * Viaja resolvida do servidor - rotulo e cor - para o interface nao ter de fazer um segundo
 * pedido so para saber como se chama aquilo.
 */
export interface Etiqueta {
  id: string;
  rotulo: string;
  cor: string;
}

export interface Empresa {
  id: string;
  nome: string;
  moeda: string;
  inicialLogotipo: string | null;
  corMarca: string;
}

export interface Utilizador {
  id: string;
  nome: string;
  email: string;
  funcao: string;
  departamentoId: string | null;
  nivelAcesso: NivelAcesso;
  /** Entrou com palavra-passe temporaria: so pode escolher a sua. */
  deveMudarPassword: boolean;
  empresa: Empresa;
}

export interface Referencia {
  id: string;
  nome: string;
}

export interface LinhaCarteira {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  natureza: Etiqueta;
  estagio: Etiqueta;
  saude: Saude;
  avancoPct: number;
  deadline: Date;
  responsavel: Referencia;
  tarefasAbertas: number;
  tarefasTotal: number;
}

export interface Fase {
  id: string;
  projectId: string;
  nome: string;
  estado: EstadoFase;
  nota: string | null;
  ordem: number;
  startsOn: Date;
  endsOn: Date;
  planeadoStartsOn: Date;
  planeadoEndsOn: Date;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  deadline: Date;
  estado: EstadoTarefa;
  prioridade: Prioridade;
  esforcoEstimadoHoras: number;
  esforcoRealHoras: number;
  exigeRelatorio: boolean;
  concluidaEm: Date | null;
  projecto: Referencia;
  fase: Referencia | null;
  responsavel: Referencia & { funcao: string };
  atribuidoPor: Referencia;
}

export interface EntradaHistorico {
  id: string;
  accao: string;
  entidade: string;
  detalhe: Record<string, unknown> | null;
  createdAt: Date;
  autorNome: string | null;
}

export interface DetalheProjecto {
  id: string;
  codigo: string;
  nome: string;
  cliente: string;
  natureza: Etiqueta;
  estagio: Etiqueta;
  saude: Saude;
  avancoPct: number;
  inicio: Date;
  deadline: Date;
  orcamentoCentavos: number | null;
  consumidoCentavos: number | null;
  consumidoPct: number | null;
  antecedenciaAlerta: number;
  responsavel: Referencia;
  equipa: (Referencia & { funcao: string })[];
  fases: Fase[];
  tarefas: Tarefa[];
  historico: EntradaHistorico[];
}

export interface Relatorio {
  id: string;
  situacao: Situacao;
  texto: string;
  esforcoRealHoras: number;
  provaExecucao: string | null;
  validacao: Validacao;
  observacao: string | null;
  createdAt: Date;
  autor: Referencia & { funcao: string };
  tarefa: { id: string; titulo: string };
  projecto: Referencia;
  validadoPor: string | null;
}

export interface TipologiaObstaculos {
  porSituacao: Record<Situacao, number>;
  total: number;
  comObstaculo: number;
}

export interface ItemDecisao {
  id: string;
  titulo: string;
  detalhe: string;
  alerta: Alerta;
  accao: 'Escalar' | 'Decidir' | 'Responder';
  projectoId: string;
  projectoNome: string;
  origem: 'tarefa' | 'relatorio' | 'prorrogacao';
  idadeDias: number;
  texto: string | null;
}

export interface Painel {
  hoje: string;
  foco: { titulo: string; nota: string };
  resumo: {
    avancoMedio: number;
    previstoMedio: number | null;
    foraDePrazo: number;
    projectosComAtraso: number;
  };
  decisoes: ItemDecisao[];
  decisoesTotal: number;
  avancos: {
    id: string;
    nome: string;
    cliente: string;
    estagio: { rotulo: string; cor: string };
    saude: Saude;
    avancoPct: number;
    deadline: Date;
  }[];
  prazos: {
    id: string;
    titulo: string;
    responsavel: string;
    deadline: Date;
    alerta: Alerta;
  }[];
}

export interface MembroEquipa {
  id: string;
  nome: string;
  email: string;
  funcao: string;
  departamento: Etiqueta | null;
  dataEntrada: Date;
  alocacao: number;
  nivelAcesso: NivelAcesso;
  estado: 'activo' | 'convite_pendente';
  tarefasAbertas: number;
  carga: number;
  cumprimento: number | null;
  activo: boolean;
  telefone: string | null;
  projectos: string[];
}

export interface PessoaSelector {
  id: string;
  nome: string;
  funcao: string;
  nivelAcesso: NivelAcesso;
  tarefasAbertas: number;
}

export interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  detalhe: string | null;
  taskId: string | null;
  projectId: string | null;
  referenteA: Date;
  lida: boolean;
  createdAt: Date;
}
