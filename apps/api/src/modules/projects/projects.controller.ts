import type { Request, Response } from 'express';
import type {
  ActualizarProjectoInput,
  CriarProjectoInput,
  ListarProjectosInput,
} from '@nexora/shared';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import { historicoDoProjecto } from '../audit.service';
import * as tarefas from '../tasks/tasks.service';
import * as servico from './projects.service';

export async function listar(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const filtros = req.query as unknown as ListarProjectosInput;
  const [projectos, contagens] = await Promise.all([
    servico.listar(sessao, filtros),
    servico.contagensPorFiltro(sessao),
  ]);
  return sucesso(res, { projectos, contagens }, 'Carteira carregada');
}

export async function detalhe(req: Request, res: Response): Promise<Response> {
  const sessao = sessaoDe(req);
  const id = String(req.params.id);
  const [projecto, listaTarefas, historico] = await Promise.all([
    servico.detalhe(sessao, id),
    tarefas.doProjecto(sessao, id),
    historicoDoProjecto(sessao.org, id, 20),
  ]);
  return sucesso(res, { ...projecto, tarefas: listaTarefas, historico }, 'Projecto carregado');
}

export async function criar(req: Request, res: Response): Promise<Response> {
  const projecto = await servico.criar(sessaoDe(req), req.body as CriarProjectoInput);
  return sucesso(res, projecto, `Projecto ${projecto.codigo} registado`, 201);
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  const projecto = await servico.actualizar(
    sessaoDe(req),
    String(req.params.id),
    req.body as ActualizarProjectoInput,
  );
  return sucesso(res, projecto, 'Projecto actualizado');
}

export async function pedirPontoSituacao(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.pedirPontoSituacao(sessaoDe(req), String(req.params.id));
  return sucesso(res, resultado, `Ponto de situação pedido a ${resultado.destinatario}`);
}

/** CSV da carteira visivel. Sai como ficheiro, nao como JSON. */
export async function exportar(req: Request, res: Response): Promise<void> {
  const csv = await servico.exportarCsv(sessaoDe(req));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="carteira.csv"');
  res.status(200).send(csv);
}
