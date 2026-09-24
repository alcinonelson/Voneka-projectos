import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NivelAcesso } from '@nexora/shared';
import { useQueryClient } from '@tanstack/react-query';
import {
  api,
  definirAoPasswordTemporaria,
  definirAoSessaoExpirada,
  definirToken,
  retomarSessao,
} from './api';
import type { Empresa, Utilizador } from './tipos';

/**
 * Sessao da aplicacao.
 *
 * No arranque tenta uma renovacao silenciosa a partir do cookie httpOnly. E o que faz com que
 * recarregar a pagina nao obrigue a entrar de novo, sem ter de guardar credenciais no navegador.
 *
 * Nao ha "Ver como": cada conta ve o que o seu nivel de acesso lhe da, e mais nada. Deixar o
 * Administrador espreitar a vista de Colaborador punha no menu uma vertente que nao e dele e
 * confundia quem so queria trabalhar.
 */

interface Sessao {
  utilizador: Utilizador | null;
  empresa: Empresa | null;
  /** Verdadeiro enquanto a renovacao inicial nao termina. */
  aCarregar: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  /** Assume a sessao devolvida pelo registo de empresa, sem obrigar a um segundo login. */
  assumirSessao: (utilizador: Utilizador, accessToken: string) => void;
  sair: () => Promise<void>;
  nivel: NivelAcesso;
  /** Administrador ou Gestor: quem responde por carteira. */
  ehDireccao: boolean;
  /** Só o Administrador define a empresa e o seu vocabulário. */
  ehAdministrador: boolean;
}

const Contexto = createContext<Sessao | null>(null);

interface RespostaAuth {
  utilizador: Utilizador;
  accessToken: string;
}

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [utilizador, setUtilizador] = useState<Utilizador | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const consultas = useQueryClient();

  useEffect(() => {
    definirAoSessaoExpirada(() => {
      definirToken(null);
      setUtilizador(null);
      consultas.clear();
    });
    definirAoPasswordTemporaria(() => {
      setUtilizador((u) => (u ? { ...u, deveMudarPassword: true } : u));
    });
    return () => {
      definirAoSessaoExpirada(null);
      definirAoPasswordTemporaria(null);
    };
  }, [consultas]);

  useEffect(() => {
    let activo = true;
    void (async () => {
      const renovou = await retomarSessao();
      if (!activo) return;
      if (renovou) {
        try {
          const perfil = await api.get<Utilizador>('/auth/me');
          if (activo) setUtilizador(perfil);
        } catch {
          if (activo) setUtilizador(null);
        }
      }
      if (activo) setACarregar(false);
    })();
    return () => {
      activo = false;
    };
  }, []);

  const entrar = useCallback(async (email: string, password: string) => {
    const resposta = await api.post<RespostaAuth>('/auth/login', { email, password });
    definirToken(resposta.accessToken);
    setUtilizador(resposta.utilizador);
  }, []);

  const assumirSessao = useCallback((novo: Utilizador, accessToken: string) => {
    definirToken(accessToken);
    setUtilizador(novo);
  }, []);

  const sair = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      definirToken(null);
      setUtilizador(null);
      consultas.clear();
    }
  }, [consultas]);

  const valor = useMemo<Sessao>(() => {
    const nivel = utilizador?.nivelAcesso ?? 'colaborador';
    return {
      utilizador,
      empresa: utilizador?.empresa ?? null,
      aCarregar,
      entrar,
      assumirSessao,
      sair,
      nivel,
      ehDireccao: nivel !== 'colaborador',
      ehAdministrador: nivel === 'administrador',
    };
  }, [utilizador, aCarregar, entrar, assumirSessao, sair]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): Sessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao tem de ser usado dentro de ProvedorSessao.');
  return contexto;
}
