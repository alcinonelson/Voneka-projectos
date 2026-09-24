import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AcessoEmitido,
  ActualizarEmpresaInput,
  ActualizarMembroInput,
  ConcluirTarefaInput,
  CriarMembroInput,
  CriarProjectoInput,
  CriarTarefaInput,
  CriarTaxonomiaInput,
  FiltroTarefa,
  GravarRoteiroInput,
  TaxonomiaRef,
  TipoTaxonomia,
  ValidarRelatorioInput,
} from '@nexora/shared';
import { api, query } from './api';
import type {
  DetalheProjecto,
  Empresa,
  Fase,
  LinhaCarteira,
  MembroEquipa,
  Notificacao,
  Painel,
  PessoaSelector,
  Relatorio,
  Tarefa,
  TipologiaObstaculos,
} from './tipos';

/**
 * Chaves de cache.
 *
 * Agrupadas por raiz para que uma mutacao possa invalidar uma familia inteira. Fechar uma tarefa,
 * por exemplo, mexe nas tarefas, nos relatorios, no painel e na gaveta do projecto - e mais
 * seguro invalidar as quatro raizes do que tentar adivinhar quais das entradas ficaram velhas.
 */
export const chaves = {
  painel: ['painel'] as const,
  projectos: ['projectos'] as const,
  projecto: (id: string) => ['projectos', id] as const,
  fases: ['fases'] as const,
  fasesCarteira: ['fases', 'carteira'] as const,
  tarefas: ['tarefas'] as const,
  relatorios: ['relatorios'] as const,
  equipa: ['equipa'] as const,
  pessoas: ['pessoas'] as const,
  notificacoes: ['notificacoes'] as const,
  empresa: ['empresa'] as const,
  vocabulario: ['vocabulario'] as const,
  arranque: ['arranque'] as const,
};

/** `todos` e `em_risco` sao transversais; o resto e o id de uma natureza da empresa. */
export type FiltroCarteira = 'todos' | 'em_risco' | (string & {});

interface RespostaCarteira {
  projectos: LinhaCarteira[];
  contagens: Record<string, number>;
}

interface RespostaRelatorios {
  relatorios: Relatorio[];
  tipologia: TipologiaObstaculos;
}

interface RespostaNotificacoes {
  avisos: Notificacao[];
  porLer: number;
}

export interface EstadoArranque {
  naturezas: number;
  estagios: number;
  departamentos: number;
  membros: number;
  projectos: number;
  vocabularioPronto: boolean;
}

export function usePainel() {
  return useQuery({
    queryKey: chaves.painel,
    queryFn: () => api.get<Painel>('/dashboard'),
  });
}

export function useCarteira(filtro: FiltroCarteira) {
  return useQuery({
    queryKey: [...chaves.projectos, filtro],
    queryFn: () => api.get<RespostaCarteira>(`/projects${query({ filtro })}`),
  });
}

export function useProjecto(id: string | null) {
  return useQuery({
    queryKey: chaves.projecto(id ?? ''),
    queryFn: () => api.get<DetalheProjecto>(`/projects/${id ?? ''}`),
    enabled: Boolean(id),
  });
}

/**
 * O plano de fases de toda a carteira, num pedido.
 *
 * Substitui os N pedidos que o roteiro fazia, um por projecto. Alem de pesar menos, resolve um
 * defeito: a resposta vem indexada pelo identificador do projecto, pelo que o ecra deixa de casar
 * fases com projectos por posicao num array que mudava de tamanho a cada invalidacao.
 */
export function useFasesDaCarteira() {
  return useQuery({
    queryKey: chaves.fasesCarteira,
    queryFn: () => api.get<Record<string, Fase[]>>('/projects/phases'),
  });
}

export function useTarefas(filtro: FiltroTarefa, minhas = false) {
  return useQuery({
    queryKey: [...chaves.tarefas, filtro, minhas],
    queryFn: () => api.get<Tarefa[]>(`/tasks${query({ filtro, minhas })}`),
  });
}

export function useRelatorios(meus = false) {
  return useQuery({
    queryKey: [...chaves.relatorios, meus],
    queryFn: () => api.get<RespostaRelatorios>(`/reports${query({ meus })}`),
  });
}

export function useEquipa() {
  return useQuery({
    queryKey: chaves.equipa,
    queryFn: () => api.get<MembroEquipa[]>('/users'),
  });
}

export function usePessoas() {
  return useQuery({
    queryKey: chaves.pessoas,
    queryFn: () => api.get<PessoaSelector[]>('/users/selector'),
  });
}

export function useNotificacoes() {
  return useQuery({
    queryKey: chaves.notificacoes,
    queryFn: () => api.get<RespostaNotificacoes>('/notifications'),
    // O sino tem de acompanhar o dia sem obrigar a recarregar a pagina.
    refetchInterval: 120_000,
  });
}

export function useEmpresa() {
  return useQuery({
    queryKey: chaves.empresa,
    queryFn: () => api.get<Empresa & { fusoHorario: string; slug: string }>('/organizations/me'),
  });
}

export function useEstadoArranque() {
  return useQuery({
    queryKey: chaves.arranque,
    queryFn: () => api.get<EstadoArranque>('/organizations/me/setup'),
  });
}

/** O vocabulário da empresa. Sem `tipo`, devolve tudo. */
export function useVocabulario(tipo?: TipoTaxonomia, incluirArquivadas = false) {
  return useQuery({
    queryKey: [...chaves.vocabulario, tipo ?? 'todos', incluirArquivadas],
    queryFn: () =>
      api.get<TaxonomiaRef[]>(`/organizations/me/taxonomies${query({ tipo, incluirArquivadas })}`),
  });
}

/** Invalida as raizes que uma escrita costuma tornar velhas. */
function useInvalidar() {
  const cliente = useQueryClient();
  return (raizes: readonly (readonly unknown[])[]) => {
    for (const raiz of raizes) void cliente.invalidateQueries({ queryKey: raiz });
  };
}

export function useCriarProjecto() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: CriarProjectoInput) => api.post<{ id: string; codigo: string }>('/projects', dados),
    onSuccess: () => invalidar([chaves.projectos, chaves.painel, chaves.fases, chaves.arranque]),
  });
}

export function useCriarTarefa() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: CriarTarefaInput) => api.post<Tarefa>('/tasks', dados),
    onSuccess: () => invalidar([chaves.tarefas, chaves.projectos, chaves.painel, chaves.equipa]),
  });
}

export function useConcluirTarefa() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: ConcluirTarefaInput }) =>
      api.post<{ tarefa: Tarefa; relatorio: Relatorio }>(`/tasks/${id}/complete`, dados),
    onSuccess: () =>
      invalidar([chaves.tarefas, chaves.relatorios, chaves.painel, chaves.projectos, chaves.equipa]),
  });
}

export function usePedirProrrogacao() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, novaDeadline, motivo }: { id: string; novaDeadline: string; motivo: string }) =>
      api.post(`/tasks/${id}/extension`, { novaDeadline, motivo }),
    onSuccess: () => invalidar([chaves.tarefas, chaves.painel]),
  });
}

export function useDecidirProrrogacao() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ extensionId, aceitar }: { extensionId: string; aceitar: boolean }) =>
      api.post<{ aceite: boolean }>(`/tasks/extensions/${extensionId}/decide`, { aceitar }),
    onSuccess: () => invalidar([chaves.tarefas, chaves.painel, chaves.projectos]),
  });
}

export function useGravarRoteiro() {
  const invalidar = useInvalidar();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ projectoId, dados }: { projectoId: string; dados: GravarRoteiroInput }) =>
      api.put<Fase[]>(`/projects/${projectoId}/phases`, dados),
    onSuccess: (fases, { projectoId }) => {
      // Escrever o resultado directamente na cache faz o roteiro mostrar o novo plano na mesma
      // pintura em que o modal fecha, em vez de esperar pela ida e volta da invalidacao.
      cliente.setQueryData<Record<string, Fase[]>>(chaves.fasesCarteira, (actual) =>
        actual ? { ...actual, [projectoId]: fases } : actual,
      );
      invalidar([chaves.fases, chaves.projectos, chaves.painel]);
    },
  });
}

/**
 * Reagendamento de uma fase por arrasto.
 *
 * A actualizacao optimista escreve na cache antes de o servidor responder e desfaz-se sozinha se
 * ele recusar. Sem isto, a barra largada saltava para a posicao antiga e so voltava ao sitio
 * quando a resposta chegasse - o que parecia um erro mesmo quando estava tudo bem.
 */
export function useReagendarFase() {
  const invalidar = useInvalidar();
  const cliente = useQueryClient();

  return useMutation({
    mutationFn: ({ faseId, startsOn, endsOn }: { faseId: string; startsOn: string; endsOn: string }) =>
      api.patch<Fase>(`/phases/${faseId}/schedule`, { startsOn, endsOn }),

    onMutate: async ({ faseId, startsOn, endsOn }) => {
      await cliente.cancelQueries({ queryKey: chaves.fasesCarteira });
      const anterior = cliente.getQueryData<Record<string, Fase[]>>(chaves.fasesCarteira);

      cliente.setQueryData<Record<string, Fase[]>>(chaves.fasesCarteira, (actual) => {
        if (!actual) return actual;
        const copia: Record<string, Fase[]> = {};
        for (const [projectoId, fases] of Object.entries(actual)) {
          copia[projectoId] = fases.map((f) =>
            f.id === faseId
              ? { ...f, startsOn: new Date(`${startsOn}T00:00:00Z`), endsOn: new Date(`${endsOn}T00:00:00Z`) }
              : f,
          );
        }
        return copia;
      });

      return { anterior };
    },

    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) cliente.setQueryData(chaves.fasesCarteira, contexto.anterior);
    },

    onSettled: () => invalidar([chaves.fases, chaves.projectos]),
  });
}

export function useReporPlano() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (projectoId: string) => api.post<Fase[]>(`/projects/${projectoId}/phases/reset`),
    onSuccess: () => invalidar([chaves.fases, chaves.projectos]),
  });
}

export function useValidarRelatorio() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: ValidarRelatorioInput }) =>
      api.post<Relatorio>(`/reports/${id}/validate`, dados),
    onSuccess: () => invalidar([chaves.relatorios, chaves.painel]),
  });
}

export function useCriarMembro() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: CriarMembroInput) =>
      api.post<{ membro: Pick<MembroEquipa, 'id' | 'nome' | 'email'>; acesso: AcessoEmitido | null }>(
        '/users',
        dados,
      ),
    onSuccess: () => invalidar([chaves.equipa, chaves.pessoas, chaves.arranque]),
  });
}

export function useActualizarMembro() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: ActualizarMembroInput }) =>
      api.patch<MembroEquipa>(`/users/${id}`, dados),
    onSuccess: () => invalidar([chaves.equipa, chaves.pessoas]),
  });
}

export function useReenviarConvite() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => api.post<AcessoEmitido>(`/users/${id}/resend-invite`),
    onSuccess: () => invalidar([chaves.equipa]),
  });
}

export function useGerarPasswordTemporaria() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => api.post<AcessoEmitido>(`/users/${id}/temporary-password`),
    onSuccess: () => invalidar([chaves.equipa]),
  });
}

export function useMarcarNotificacaoLida() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => invalidar([chaves.notificacoes]),
  });
}

export function useActualizarEmpresa() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: ActualizarEmpresaInput) => api.patch<Empresa>('/organizations/me', dados),
    onSuccess: () => invalidar([chaves.empresa]),
  });
}

export function useCriarEntradaVocabulario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: CriarTaxonomiaInput) =>
      api.post<TaxonomiaRef>('/organizations/me/taxonomies', dados),
    onSuccess: () => invalidar([chaves.vocabulario, chaves.arranque]),
  });
}

export function useCriarVocabularioEmLote() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (entradas: CriarTaxonomiaInput[]) =>
      api.post<TaxonomiaRef[]>('/organizations/me/taxonomies/batch', { entradas }),
    onSuccess: () => invalidar([chaves.vocabulario, chaves.arranque]),
  });
}

export function useActualizarEntradaVocabulario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Record<string, unknown> }) =>
      api.patch<TaxonomiaRef>(`/organizations/me/taxonomies/${id}`, dados),
    onSuccess: () => invalidar([chaves.vocabulario, chaves.projectos, chaves.equipa]),
  });
}

export function useRemoverEntradaVocabulario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ apagada: boolean; emUso: number }>(`/organizations/me/taxonomies/${id}`),
    onSuccess: () => invalidar([chaves.vocabulario, chaves.arranque]),
  });
}

export function useReordenarVocabulario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: { tipo: TipoTaxonomia; ids: string[] }) =>
      api.patch<TaxonomiaRef[]>('/organizations/me/taxonomies/ordem', dados),
    onSuccess: () => invalidar([chaves.vocabulario]),
  });
}

export function useMarcarTodasNotificacoesLidas() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: () => api.post<{ lidas: number }>('/notifications/read-all'),
    onSuccess: () => invalidar([chaves.notificacoes]),
  });
}
