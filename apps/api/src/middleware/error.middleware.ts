import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ehProducao } from '../config/env';
import { AppError, erros } from '../utils/errors';
import { logModulo, logger } from '../utils/logger';
import { falha } from '../utils/response';

/** Converte os problemas do Zod num mapa campo -> mensagem, para a validacao inline. */
export function camposDeZod(erro: ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const problema of erro.issues) {
    const chave = problema.path.join('.') || '_';
    if (!campos[chave]) campos[chave] = problema.message;
  }
  return campos;
}

/** Rota inexistente. */
export function naoEncontrado(_req: Request, res: Response): void {
  falha(res, erros.naoEncontrado('O endereço pedido'));
}

/**
 * Middleware de erro.
 *
 * Erros de dominio saem tal como foram lancados. Tudo o resto vira 500 com uma mensagem generica:
 * a mensagem original vai para o log, nunca para o cliente, porque pode conter nomes de tabelas,
 * caminhos ou fragmentos de consulta.
 */
export function tratarErros(
  erro: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (erro instanceof ZodError) {
    falha(res, erros.validacao('Há campos por corrigir.', camposDeZod(erro)));
    return;
  }

  if (erro instanceof AppError) {
    if (erro.status >= 500) {
      logger.error(logModulo('http', `${req.method} ${req.path}: ${erro.message}`));
    }
    falha(res, erro);
    return;
  }

  const mensagem = erro instanceof Error ? erro.message : String(erro);
  logger.error(logModulo('http', `${req.method} ${req.path} falhou: ${mensagem}`));
  falha(res, erros.interno(ehProducao ? 'Ocorreu um erro inesperado.' : mensagem));
}
