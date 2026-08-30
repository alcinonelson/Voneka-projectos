import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Encaminha rejeicoes de handlers assincronos para o middleware de erro.
 *
 * O Express 4 nao apanha promessas rejeitadas: sem isto, um `await` que falhe num controlador
 * deixaria o pedido pendurado ate ao timeout em vez de devolver 500.
 */
export function assincrono(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
