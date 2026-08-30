import type { CodigoErro } from '@nexora/shared';

/**
 * Erro de dominio com codigo e estado HTTP.
 *
 * Lancar em vez de devolver deixa os servicos escreverem o caminho feliz sem o interromper a cada
 * verificacao. O middleware de erro traduz isto na resposta; nada daqui expoe stack traces nem
 * caminhos internos.
 */
export class AppError extends Error {
  readonly codigo: CodigoErro;
  readonly status: number;
  readonly campos?: Record<string, string>;

  constructor(
    codigo: CodigoErro,
    mensagem: string,
    status: number,
    campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = 'AppError';
    this.codigo = codigo;
    this.status = status;
    if (campos) this.campos = campos;
  }
}

export const erros = {
  validacao: (mensagem: string, campos?: Record<string, string>) =>
    new AppError('VALIDACAO', mensagem, 422, campos),

  naoAutenticado: (mensagem = 'Precisa de iniciar sessão.') =>
    new AppError('NAO_AUTENTICADO', mensagem, 401),

  credenciaisInvalidas: () =>
    new AppError('CREDENCIAIS_INVALIDAS', 'Email ou palavra-passe incorrectos.', 401),

  sessaoExpirada: (mensagem = 'A sessão expirou. Volte a iniciar sessão.') =>
    new AppError('SESSAO_EXPIRADA', mensagem, 401),

  semPermissao: (mensagem = 'Não tem acesso a este recurso.') =>
    new AppError('SEM_PERMISSAO', mensagem, 403),

  naoEncontrado: (recurso = 'O recurso pedido') =>
    new AppError('NAO_ENCONTRADO', `${recurso} não existe ou já foi removido.`, 404),

  conflito: (mensagem: string) => new AppError('CONFLITO', mensagem, 409),

  emailEmUso: () =>
    new AppError('EMAIL_EM_USO', 'Já existe uma conta com esse email.', 409, {
      email: 'Já existe uma conta com esse email.',
    }),

  relatorioObrigatorio: (mensagem: string, campos?: Record<string, string>) =>
    new AppError('RELATORIO_OBRIGATORIO', mensagem, 422, campos),

  conviteInvalido: (mensagem = 'Convite inválido ou expirado.') =>
    new AppError('CONVITE_INVALIDO', mensagem, 400),

  interno: (mensagem = 'Ocorreu um erro inesperado.') =>
    new AppError('ERRO_INTERNO', mensagem, 500),
};
