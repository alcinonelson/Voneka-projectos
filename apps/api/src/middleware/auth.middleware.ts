import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { NivelAcesso } from '@nexora/shared';
import { erros } from '../utils/errors';
import { lerAccessToken, type Sessao } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      sessao?: Sessao;
      requestId?: string;
    }
  }
}

function lerSessao(req: Request): Sessao | Error {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith('Bearer ')) return erros.naoAutenticado();
  return lerAccessToken(cabecalho.slice(7).trim()) ?? erros.sessaoExpirada();
}

/**
 * Exige uma sessao valida.
 * Le o token do cabecalho `Authorization: Bearer`.
 *
 * Uma sessao aberta com palavra-passe temporaria e recusada aqui, e nao ecra a ecra: o bloqueio
 * vale por omissao para qualquer rota, incluindo as que ainda nao existem. So a troca de
 * palavra-passe e o perfil usam `autenticarComTemporaria`.
 */
export const autenticar: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const sessao = lerSessao(req);
  if (sessao instanceof Error) {
    next(sessao);
    return;
  }
  if (sessao.tmp) {
    next(erros.passwordTemporaria());
    return;
  }

  req.sessao = sessao;
  next();
};

/** Como `autenticar`, mas aceita a sessao de palavra-passe temporaria. */
export const autenticarComTemporaria: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const sessao = lerSessao(req);
  if (sessao instanceof Error) {
    next(sessao);
    return;
  }

  req.sessao = sessao;
  next();
};

/**
 * Exige um dos niveis de acesso indicados.
 *
 * Isto e a primeira barreira, nao a unica: o scoping fino - que projectos e que tarefas cada
 * pessoa ve - vive nos servicos, porque a rota nao sabe de que projecto se trata.
 */
export function exigirNivel(...niveis: NivelAcesso[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.sessao) {
      next(erros.naoAutenticado());
      return;
    }
    if (!niveis.includes(req.sessao.nivel)) {
      next(erros.semPermissao('Esta acção exige um nível de acesso superior.'));
      return;
    }
    next();
  };
}

/** Devolve a sessao, garantindo ao TypeScript que ela existe depois de `autenticar`. */
export function sessaoDe(req: Request): Sessao {
  if (!req.sessao) throw erros.naoAutenticado();
  return req.sessao;
}
