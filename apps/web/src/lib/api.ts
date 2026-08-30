import type { CodigoErro, Resposta } from '@nexora/shared';
import { reviverDatas } from './datas';

/**
 * Cliente da API.
 *
 * O access token vive apenas em memoria neste modulo. Nao vai para `localStorage` de proposito:
 * ali ficaria ao alcance de qualquer script injectado e sobreviveria ao fecho do separador. O
 * refresh token esta num cookie httpOnly que o navegador envia sozinho e que nenhum JavaScript
 * consegue ler - por isso e ele, e nao o access token, que sustenta a sessao entre visitas.
 */

let accessToken: string | null = null;

export function definirToken(token: string | null): void {
  accessToken = token;
}

export function temToken(): boolean {
  return accessToken !== null;
}

export class ErroApi extends Error {
  readonly codigo: CodigoErro;
  readonly campos: Record<string, string>;
  readonly status: number;

  constructor(codigo: CodigoErro, mensagem: string, status: number, campos?: Record<string, string>) {
    super(mensagem);
    this.name = 'ErroApi';
    this.codigo = codigo;
    this.status = status;
    this.campos = campos ?? {};
  }
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  corpo?: unknown;
  /** Interno: evita que uma renovacao falhada entre em ciclo. */
  jaRenovou?: boolean;
}

async function renovarSessao(): Promise<boolean> {
  try {
    const resposta = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!resposta.ok) return false;
    const corpo = (await resposta.json()) as Resposta<{ accessToken: string }>;
    if (!corpo.success) return false;
    accessToken = corpo.data.accessToken;
    return true;
  } catch {
    return false;
  }
}

/**
 * Faz um pedido a API.
 *
 * Um 401 por token expirado dispara uma renovacao silenciosa e uma segunda tentativa. E o que
 * evita que alguem seja atirado para o ecra de entrada a meio de escrever um relatorio, quinze
 * minutos depois de ter entrado.
 */
export async function pedir<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, jaRenovou = false } = opcoes;

  const cabecalhos: Record<string, string> = {};
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (accessToken) cabecalhos.Authorization = `Bearer ${accessToken}`;

  const resposta = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    credentials: 'include',
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  let dados: Resposta<T>;
  try {
    dados = (await resposta.json()) as Resposta<T>;
  } catch {
    throw new ErroApi('ERRO_INTERNO', 'O servidor não respondeu como esperado.', resposta.status);
  }

  // As datas sao convertidas aqui, na fronteira, para que nenhum ecra receba um dia como texto.
  if (dados.success) return reviverDatas<T>(dados.data);

  const expirou = dados.error.code === 'SESSAO_EXPIRADA' || resposta.status === 401;
  if (expirou && !jaRenovou && caminho !== '/auth/refresh') {
    const renovou = await renovarSessao();
    if (renovou) return pedir<T>(caminho, { ...opcoes, jaRenovou: true });
    accessToken = null;
  }

  throw new ErroApi(dados.error.code, dados.error.message, resposta.status, dados.error.fields);
}

/** Constroi uma query string, ignorando valores vazios. */
export function query(params: Record<string, string | number | boolean | undefined>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

export const api = {
  get: <T>(caminho: string) => pedir<T>(caminho),
  post: <T>(caminho: string, corpo?: unknown) => pedir<T>(caminho, { metodo: 'POST', corpo }),
  patch: <T>(caminho: string, corpo?: unknown) => pedir<T>(caminho, { metodo: 'PATCH', corpo }),
  put: <T>(caminho: string, corpo?: unknown) => pedir<T>(caminho, { metodo: 'PUT', corpo }),
  delete: <T>(caminho: string) => pedir<T>(caminho, { metodo: 'DELETE' }),
};

/** Renova a sessao a partir do cookie, no arranque da aplicacao. */
export async function retomarSessao(): Promise<boolean> {
  return renovarSessao();
}
