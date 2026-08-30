import type { CookieOptions, Request, Response } from 'express';
import type {
  ActualizarEmpresaInput,
  ActualizarTaxonomiaInput,
  CriarTaxonomiaInput,
  CriarTaxonomiasEmLoteInput,
  ListarTaxonomiasInput,
  RegistarEmpresaInput,
} from '@nexora/shared';
import { ehProducao, env } from '../../config/env';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as empresas from './organizations.service';
import * as vocabulario from './taxonomies.service';

/** O mesmo cookie do modulo de autenticacao: registar uma empresa deixa a pessoa com sessao. */
const COOKIE_REFRESH = 'nx_refresh';

const opcoesCookie: CookieOptions = {
  httpOnly: true,
  secure: ehProducao,
  sameSite: ehProducao ? 'strict' : 'lax',
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DIAS * 86_400_000,
};

export async function registar(req: Request, res: Response): Promise<Response> {
  const resultado = await empresas.registarEmpresa(
    req.body as RegistarEmpresaInput,
    req.headers['user-agent'],
  );

  res.cookie(COOKIE_REFRESH, resultado.refreshToken, opcoesCookie);
  return sucesso(
    res,
    {
      utilizador: resultado.utilizador,
      empresa: resultado.empresa,
      accessToken: resultado.accessToken,
    },
    `${resultado.empresa.nome} está criada. Vamos definir como trabalha.`,
    201,
  );
}

export async function minha(req: Request, res: Response): Promise<Response> {
  const empresa = await empresas.minhaEmpresa(sessaoDe(req));
  return sucesso(res, empresa, 'Dados da empresa');
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  const empresa = await empresas.actualizarEmpresa(
    sessaoDe(req),
    req.body as ActualizarEmpresaInput,
  );
  return sucesso(res, empresa, 'Dados da empresa actualizados');
}

export async function arranque(req: Request, res: Response): Promise<Response> {
  const estado = await vocabulario.estadoArranque(sessaoDe(req));
  return sucesso(res, estado, 'Estado do arranque');
}

export async function listarVocabulario(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const filtros = req.query as unknown as ListarTaxonomiasInput;
  const [entradas, uso] = await Promise.all([
    vocabulario.listar(sessao, filtros),
    vocabulario.contarUso(sessao),
  ]);
  return sucesso(
    res,
    entradas.map((e) => ({ ...e, emUso: uso[e.id] ?? 0 })),
    'Vocabulário da empresa',
  );
}

export async function criarEntrada(req: Request, res: Response): Promise<Response> {
  const entrada = await vocabulario.criar(sessaoDe(req), req.body as CriarTaxonomiaInput);
  return sucesso(res, entrada, `"${entrada.rotulo}" ficou disponível`, 201);
}

export async function criarEntradasEmLote(req: Request, res: Response): Promise<Response> {
  const { entradas } = req.body as CriarTaxonomiasEmLoteInput;
  const criadas = await vocabulario.criarEmLote(sessaoDe(req), entradas);
  return sucesso(res, criadas, `${criadas.length} entradas gravadas`, 201);
}

export async function actualizarEntrada(req: Request, res: Response): Promise<Response> {
  const entrada = await vocabulario.actualizar(
    sessaoDe(req),
    req.params.id as string,
    req.body as ActualizarTaxonomiaInput,
  );
  return sucesso(res, entrada, `"${entrada.rotulo}" actualizado`);
}

export async function removerEntrada(req: Request, res: Response): Promise<Response> {
  const resultado = await vocabulario.remover(sessaoDe(req), req.params.id as string);
  return sucesso(
    res,
    resultado,
    resultado.apagada
      ? 'Entrada removida do vocabulário'
      : `Ainda classifica ${resultado.emUso} registo${resultado.emUso === 1 ? '' : 's'}, por isso foi arquivada em vez de apagada.`,
  );
}
