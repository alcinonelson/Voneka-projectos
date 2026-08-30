import type { Request, Response } from 'express';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './notifications.service';

export async function listar(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const [avisos, porLer] = await Promise.all([
    servico.listar(sessao, req.query.porLer === 'true'),
    servico.contarPorLer(sessao),
  ]);
  return sucesso(res, { avisos, porLer }, 'Notificações carregadas');
}

export async function marcarLida(req: Request, res: Response): Promise<Response> {
  const aviso = await servico.marcarLida(sessaoDe(req), String(req.params.id));
  return sucesso(res, aviso, 'Notificação lida');
}

export async function marcarTodasLidas(req: Request, res: Response): Promise<Response> {
  const n = await servico.marcarTodasLidas(sessaoDe(req));
  return sucesso(res, { lidas: n }, 'Notificações lidas');
}
