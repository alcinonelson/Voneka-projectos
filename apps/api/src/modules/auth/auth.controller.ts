import type { CookieOptions, Request, Response } from 'express';
import type { AceitarConviteInput, AlterarPasswordInput, LoginInput } from '@nexora/shared';
import { ehProducao, env } from '../../config/env';
import { erros } from '../../utils/errors';
import { sucesso } from '../../utils/response';
import { sessaoDe } from '../../middleware/auth.middleware';
import * as servico from './auth.service';

/**
 * O refresh token viaja num cookie httpOnly e o access token fica so em memoria no cliente.
 *
 * Guardar o refresh em localStorage poria a sessao inteira ao alcance de qualquer XSS. Assim, o
 * pior que um script injectado consegue e usar o access token durante os quinze minutos que ele
 * dura, sem conseguir renova-lo.
 */
const COOKIE_REFRESH = 'nx_refresh';

const opcoesCookie: CookieOptions = {
  httpOnly: true,
  secure: ehProducao,
  sameSite: ehProducao ? 'strict' : 'lax',
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DIAS * 86_400_000,
};

function responder(res: Response, resultado: servico.ResultadoAutenticacao, mensagem: string) {
  res.cookie(COOKIE_REFRESH, resultado.refreshToken, opcoesCookie);
  return sucesso(
    res,
    { utilizador: resultado.utilizador, accessToken: resultado.accessToken },
    mensagem,
  );
}

export async function login(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.entrar(req.body as LoginInput, req.headers['user-agent']);
  return responder(res, resultado, `Bem-vindo, ${resultado.utilizador.nome}`);
}

export async function refresh(req: Request, res: Response): Promise<Response> {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_REFRESH];
  if (!token) throw erros.sessaoExpirada();

  const resultado = await servico.renovar(token, req.headers['user-agent']);
  return responder(res, resultado, 'Sessão renovada');
}

export async function logout(req: Request, res: Response): Promise<Response> {
  const token = (req.cookies as Record<string, string> | undefined)?.[COOKIE_REFRESH];
  await servico.sair(token);
  res.clearCookie(COOKIE_REFRESH, { ...opcoesCookie, maxAge: undefined });
  return sucesso(res, null, 'Sessão terminada');
}

export async function aceitarConvite(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.aceitarConvite(
    req.body as AceitarConviteInput,
    req.headers['user-agent'],
  );
  return responder(res, resultado, 'Conta activada');
}

/**
 * Altera a palavra-passe.
 *
 * Responde como um login responde - com cookie novo e access token novo - porque e isso que
 * acontece: as sessoes antigas caem todas e esta e substituida por uma nova.
 */
export async function alterarPassword(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.alterarPassword(
    sessaoDe(req),
    req.body as AlterarPasswordInput,
    req.headers['user-agent'],
  );
  return responder(
    res,
    resultado,
    'Palavra-passe alterada. As sessões abertas noutros dispositivos foram terminadas.',
  );
}

export async function me(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const utilizador = await servico.perfil(sessao.sub);
  return sucesso(res, utilizador, 'Sessão activa');
}
