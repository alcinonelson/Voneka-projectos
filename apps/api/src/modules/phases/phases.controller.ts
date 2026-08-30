import type { Request, Response } from 'express';
import type { GravarRoteiroInput, ReagendarFaseInput } from '@nexora/shared';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './phases.service';

export async function listar(req: Request, res: Response): Promise<Response> {
  const fases = await servico.listar(sessaoDe(req), String(req.params.id));
  return sucesso(res, fases, 'Roteiro carregado');
}

export async function listarDaCarteira(req: Request, res: Response): Promise<Response> {
  const porProjecto = await servico.listarDaCarteira(sessaoDe(req));
  return sucesso(res, porProjecto, 'Roteiro da carteira carregado');
}

export async function gravar(req: Request, res: Response): Promise<Response> {
  const fases = await servico.gravarRoteiro(
    sessaoDe(req),
    String(req.params.id),
    req.body as GravarRoteiroInput,
  );
  return sucesso(res, fases, `Roteiro de ${fases.length} fases gravado`);
}

export async function reagendar(req: Request, res: Response): Promise<Response> {
  const fase = await servico.reagendar(
    sessaoDe(req),
    String(req.params.faseId),
    req.body as ReagendarFaseInput,
  );
  return sucesso(res, fase, 'Plano actualizado');
}

export async function repor(req: Request, res: Response): Promise<Response> {
  const fases = await servico.reporPlano(sessaoDe(req), String(req.params.id));
  return sucesso(res, fases, 'Roteiro reposto no plano original');
}

export async function edicoes(req: Request, res: Response): Promise<Response> {
  const n = await servico.contarEdicoes(sessaoDe(req));
  return sucesso(res, { edicoes: n }, 'Contagem de edições');
}
