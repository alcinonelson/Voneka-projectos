import type { Request, Response } from 'express';
import type { ActualizarMembroInput, CriarMembroInput } from '@nexora/shared';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './users.service';

export async function listarEquipa(req: Request, res: Response): Promise<Response> {
  const equipa = await servico.listarEquipa(sessaoDe(req));
  return sucesso(res, equipa, 'Equipa carregada');
}

export async function listarParaSelector(req: Request, res: Response): Promise<Response> {
  const pessoas = await servico.listarParaSelector(sessaoDe(req));
  return sucesso(res, pessoas, 'Pessoas carregadas');
}

export async function criar(req: Request, res: Response): Promise<Response> {
  const dados = req.body as CriarMembroInput;
  const membro = await servico.criarMembro(sessaoDe(req), dados);
  const mensagem = dados.enviarConvite
    ? `${membro.nome} registado como ${dados.nivelAcesso} · convite enviado`
    : `${membro.nome} registado como ${dados.nivelAcesso} · conta sem convite`;
  return sucesso(res, membro, mensagem, 201);
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  const membro = await servico.actualizarMembro(
    sessaoDe(req),
    String(req.params.id),
    req.body as ActualizarMembroInput,
  );
  return sucesso(res, membro, 'Ficha actualizada');
}

export async function reenviarConvite(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.reenviarConvite(sessaoDe(req), String(req.params.id));
  return sucesso(res, resultado, `Convite reenviado a ${resultado.email}`);
}
