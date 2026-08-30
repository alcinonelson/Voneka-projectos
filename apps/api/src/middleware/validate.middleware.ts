import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodSchema } from 'zod';
import { erros } from '../utils/errors';
import { camposDeZod } from './error.middleware';
import { ZodError } from 'zod';

type Fonte = 'body' | 'query' | 'params';

/**
 * Valida uma parte do pedido contra um schema partilhado e substitui-a pelo valor ja convertido.
 *
 * Substituir e importante: a partir daqui o controlador trabalha com dados tipados e com os
 * valores por omissao ja aplicados, em vez de com o que veio da rede.
 */
export function validar(schema: ZodSchema, fonte: Fonte = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const valor = schema.parse(req[fonte]);
      if (fonte === 'query') {
        Object.defineProperty(req, 'query', { value: valor, writable: true, configurable: true });
      } else {
        req[fonte] = valor;
      }
      next();
    } catch (erro) {
      if (erro instanceof ZodError) {
        next(erros.validacao('Há campos por corrigir.', camposDeZod(erro)));
        return;
      }
      next(erro);
    }
  };
}
