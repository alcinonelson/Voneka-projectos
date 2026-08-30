/**
 * Contrato de resposta da API, partilhado pelo servidor que a escreve e pelo cliente que a le.
 * Formato fixado no CLAUDE.md.
 */

export interface RespostaSucesso<T> {
  success: true;
  data: T;
  message: string;
}

export interface RespostaErro {
  success: false;
  error: {
    code: CodigoErro;
    message: string;
    /** Erros por campo, para pintar a validacao inline nos formularios. */
    fields?: Record<string, string>;
  };
}

export type Resposta<T> = RespostaSucesso<T> | RespostaErro;

/**
 * Codigos de erro da API.
 *
 * O cliente reage ao codigo, nunca ao texto: a mensagem e para a pessoa, o codigo e para o
 * programa. `RELATORIO_OBRIGATORIO` existe em separado de `VALIDACAO` porque o interface tem de
 * conseguir abrir o modal do mini relatorio quando o encontra.
 */
export type CodigoErro =
  | 'VALIDACAO'
  | 'NAO_AUTENTICADO'
  | 'CREDENCIAIS_INVALIDAS'
  | 'SESSAO_EXPIRADA'
  | 'SEM_PERMISSAO'
  | 'NAO_ENCONTRADO'
  | 'CONFLITO'
  | 'EMAIL_EM_USO'
  | 'RELATORIO_OBRIGATORIO'
  | 'CONVITE_INVALIDO'
  | 'DEMASIADOS_PEDIDOS'
  | 'ERRO_INTERNO';

/** Envelope de listagem paginada. */
export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export function ehErro<T>(resposta: Resposta<T>): resposta is RespostaErro {
  return resposta.success === false;
}
