import type { Request, Response } from 'express';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './dashboard.service';

export async function painel(req: Request, res: Response): Promise<Response> {
  const dados = await servico.painel(sessaoDe(req));
  return sucesso(res, dados, 'Painel carregado');
}
