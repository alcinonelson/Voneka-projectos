import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logModulo, logger } from '../utils/logger';

/**
 * Identificador do pedido.
 *
 * Se o cliente manda `X-Request-Id`, usa-se esse. Se nao manda, gera-se um. Vai para o cabecalho
 * da resposta e para o log HTTP, para um 500 no servidor e o relato de quem o viu casarem.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const recebido = req.header('x-request-id');
  const id = recebido && recebido.trim().length > 0 && recebido.length <= 128
    ? recebido.trim()
    : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);

  const inicio = Date.now();
  res.on('finish', () => {
    logger.info(
      { requestId: id, metodo: req.method, caminho: req.originalUrl, estado: res.statusCode },
      logModulo('http', `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - inicio}ms`),
    );
  });

  next();
}
