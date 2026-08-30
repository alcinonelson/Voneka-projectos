/**
 * Vocabulario do dominio.
 *
 * Cada enum guarda um codigo ASCII estavel (o que vai para a base de dados e para a API) e uma
 * etiqueta em portugues de Mocambique (o que o interface mostra). Separar os dois evita que uma
 * mudanca de texto obrigue a uma migracao, e deixa a porta aberta para outra lingua sem tocar
 * nos dados.
 *
 * O que esta aqui e logica do produto: saude, estado de tarefa, situacao, nivel de acesso. Nao
 * muda de empresa para empresa e a aplicacao raciocina sobre estes valores.
 *
 * O vocabulario que cada empresa nomeia a sua maneira - natureza do projecto, estagio,
 * departamento - nao esta aqui: vive em `org_taxonomies`, e criado por quem usa o produto.
 */

function codigos<T extends Record<string, string>>(mapa: T): (keyof T)[] {
  return Object.keys(mapa) as (keyof T)[];
}

/** Familias do vocabulario que cada empresa define por si. */
export const TIPO_TAXONOMIA = {
  natureza: 'Natureza do projecto',
  estagio: 'Estágio',
  departamento: 'Departamento',
} as const;
export type TipoTaxonomia = keyof typeof TIPO_TAXONOMIA;
export const TIPOS_TAXONOMIA = codigos(TIPO_TAXONOMIA);

/** O que cada familia significa, mostrado no ecra de vocabulario. */
export const TIPO_TAXONOMIA_NOTA: Record<TipoTaxonomia, string> = {
  natureza:
    'Como classifica o trabalho que faz. Cada natureza tem o seu prefixo de código e o seu modelo de fases.',
  estagio: 'Em que ponto do ciclo está um projecto, da primeira conversa à entrega.',
  departamento: 'As equipas internas a que as pessoas pertencem.',
};

/** Saude do projecto. Define a cor da barra de avanco. */
export const SAUDE = {
  no_prazo: 'No prazo',
  em_risco: 'Em risco',
  atrasado: 'Atrasado',
} as const;
export type Saude = keyof typeof SAUDE;
export const SAUDES = codigos(SAUDE);

/**
 * Estado de uma fase do roteiro.
 * A ordem deste array e a ordem do ciclo no editor de fases: um clique avanca para o seguinte.
 */
export const ESTADO_FASE = {
  planeada: 'Planeada',
  em_curso: 'Em curso',
  concluida: 'Concluída',
  atrasada: 'Atrasada',
} as const;
export type EstadoFase = keyof typeof ESTADO_FASE;
export const ESTADOS_FASE = codigos(ESTADO_FASE);

/** Devolve o estado seguinte no ciclo do editor de fases. */
export function cicloEstadoFase(actual: EstadoFase): EstadoFase {
  const i = ESTADOS_FASE.indexOf(actual);
  return ESTADOS_FASE[(i + 1) % ESTADOS_FASE.length] as EstadoFase;
}

/** Estado de uma tarefa atribuida. */
export const ESTADO_TAREFA = {
  pendente: 'Pendente',
  em_curso: 'Em curso',
  atrasada: 'Atrasada',
  concluida: 'Concluída',
} as const;
export type EstadoTarefa = keyof typeof ESTADO_TAREFA;
export const ESTADOS_TAREFA = codigos(ESTADO_TAREFA);

/** Situacao declarada pelo colaborador no mini relatorio. */
export const SITUACAO = {
  sem_obstaculos: 'Sem obstáculos',
  com_obstaculo: 'Com obstáculo',
  bloqueado: 'Bloqueado',
} as const;
export type Situacao = keyof typeof SITUACAO;
export const SITUACOES = codigos(SITUACAO);

/** Nota que acompanha cada situacao no modal de conclusao. */
export const SITUACAO_NOTA: Record<Situacao, string> = {
  sem_obstaculos: 'Entregue como planeado',
  com_obstaculo: 'Feito, com ressalva a registar',
  bloqueado: 'Depende de terceiros',
};

/** Estado de validacao de um mini relatorio. */
export const VALIDACAO = {
  a_espera: 'À espera de validação',
  validado: 'Validado',
  escalado: 'Escalado à Direcção',
} as const;
export type Validacao = keyof typeof VALIDACAO;
export const VALIDACOES = codigos(VALIDACAO);

/**
 * Nivel de acesso da conta. Aplicado no servico, nao apenas na rota.
 * A nota e o texto mostrado no modal de registo de membro.
 */
export const NIVEL_ACESSO = {
  administrador: 'Administrador',
  gestor: 'Gestor de projecto',
  colaborador: 'Colaborador',
} as const;
export type NivelAcesso = keyof typeof NIVEL_ACESSO;
export const NIVEIS_ACESSO = codigos(NIVEL_ACESSO);

export const NIVEL_ACESSO_NOTA: Record<NivelAcesso, string> = {
  administrador:
    'Regista projectos, define roteiros, atribui funções e valida relatórios de toda a carteira.',
  gestor:
    'Gere os projectos onde é responsável: roteiro, atribuições e validação dos relatórios da sua equipa.',
  colaborador:
    'Vê apenas as suas tarefas e projectos, assinala conclusões e submete mini relatórios.',
};

/** Estado da conta de utilizador. */
export const ESTADO_CONTA = {
  activo: 'Activo',
  convite_pendente: 'Convite pendente',
} as const;
export type EstadoConta = keyof typeof ESTADO_CONTA;
export const ESTADOS_CONTA = codigos(ESTADO_CONTA);

/** Prioridade de uma tarefa. */
export const PRIORIDADE = {
  baixa: 'Baixa',
  normal: 'Normal',
  critica: 'Crítica',
} as const;
export type Prioridade = keyof typeof PRIORIDADE;
export const PRIORIDADES = codigos(PRIORIDADE);

/** Antecedencia do alerta de deadline, em dias. `0` significa sem alerta. */
export const ANTECEDENCIA = {
  1: '1 dia',
  3: '3 dias',
  7: '1 semana',
  0: 'Sem alerta',
} as const;
export type Antecedencia = 0 | 1 | 3 | 7;
export const ANTECEDENCIAS: Antecedencia[] = [1, 3, 7, 0];

/**
 * Valores oferecidos como atalho nos formularios. Sao sugestoes, nao a lista do possivel: os
 * campos correspondentes aceitam qualquer numero dentro do intervalo valido.
 */

/** Alocacao de uma pessoa, em percentagem. O campo aceita 1 a 100. */
export const ALOCACOES_SUGERIDAS = [25, 50, 75, 100] as const;

/** Esforco estimado sugerido no modal de atribuicao, em horas. O campo aceita 1 a 2000. */
export const ESFORCOS_SUGERIDOS = [4, 8, 16, 40] as const;

/** Conjunto de partida oferecido no assistente de arranque. Preenche o formulario, nao o fecha. */
export const VOCABULARIO_SUGERIDO: Record<
  TipoTaxonomia,
  { rotulo: string; cor: string; prefixo?: string; fasesModelo?: { nome: string; semanas: number }[] }[]
> = {
  natureza: [
    {
      rotulo: 'Implementação',
      cor: 'azul',
      prefixo: 'PRJ',
      fasesModelo: [
        { nome: 'Descoberta', semanas: 3 },
        { nome: 'Desenho da solução', semanas: 4 },
        { nome: 'Execução', semanas: 8 },
        { nome: 'Validação', semanas: 3 },
        { nome: 'Entrega', semanas: 2 },
      ],
    },
    {
      rotulo: 'Concurso',
      cor: 'violeta',
      prefixo: 'CNC',
      fasesModelo: [
        { nome: 'Leitura do caderno de encargos', semanas: 2 },
        { nome: 'Preparação da proposta', semanas: 3 },
        { nome: 'Submissão', semanas: 1 },
      ],
    },
    {
      rotulo: 'Tarefa regular',
      cor: 'neutro',
      prefixo: 'OPS',
      fasesModelo: [{ nome: 'Execução contínua', semanas: 12 }],
    },
  ],
  estagio: [
    { rotulo: 'Descoberta', cor: 'neutro' },
    { rotulo: 'Planeamento', cor: 'turquesa' },
    { rotulo: 'Execução', cor: 'azul' },
    { rotulo: 'Validação', cor: 'ambar' },
    { rotulo: 'Entrega', cor: 'verde' },
  ],
  departamento: [
    { rotulo: 'Consultoria', cor: 'azul' },
    { rotulo: 'Financeira', cor: 'verde' },
    { rotulo: 'Terreno', cor: 'ambar' },
  ],
};
