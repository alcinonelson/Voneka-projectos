import type { Request, Response } from 'express';
import type { ListarRelatoriosInput, ValidarRelatorioInput } from '@nexora/shared';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './reports.service';

export async function listar(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const [relatorios, tipologia] = await Promise.all([
    servico.listar(sessao, req.query as unknown as ListarRelatoriosInput),
    servico.tipologiaDaSemana(sessao),
  ]);
  return sucesso(res, { relatorios, tipologia }, 'Relatórios carregados');
}

export async function decidir(req: Request, res: Response): Promise<Response> {
  const dados = req.body as ValidarRelatorioInput;
  const relatorio = await servico.decidir(sessaoDe(req), String(req.params.id), dados);
  return sucesso(
    res,
    relatorio,
    dados.decisao === 'validar' ? 'Entrega validada' : 'Obstáculo escalado à Direcção',
  );
}
