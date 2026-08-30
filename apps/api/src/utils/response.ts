import type { Response } from 'express';
import type { RespostaErro, RespostaSucesso } from '@nexora/shared';
import type { AppError } from './errors';

/** Resposta de sucesso no formato fixado pelo CLAUDE.md. */
export function sucesso<T>(
  res: Response,
  data: T,
  message = 'Operação concluída',
  status = 200,
): Response<RespostaSucesso<T>> {
  return res.status(status).json({ success: true, data, message });
}

/** Resposta de erro. Nunca inclui stack trace nem detalhes internos. */
export function falha(res: Response, erro: AppError): Response<RespostaErro> {
  const corpo: RespostaErro = {
    success: false,
    error: {
      code: erro.codigo,
      message: erro.message,
      ...(erro.campos ? { fields: erro.campos } : {}),
    },
  };
  return res.status(erro.status).json(corpo);
}
