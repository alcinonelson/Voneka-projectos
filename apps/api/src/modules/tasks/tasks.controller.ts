import type { Request, Response } from 'express';
import type {
  ActualizarTarefaInput,
  ConcluirTarefaInput,
  CriarTarefaInput,
  DecidirProrrogacaoInput,
  ListarTarefasInput,
  PedirProrrogacaoInput,
} from '@nexora/shared';
import { sessaoDe } from '../../middleware/auth.middleware';
import { sucesso } from '../../utils/response';
import * as servico from './tasks.service';

export async function listar(req: Request, res: Response): Promise<Response> {
  const tarefas = await servico.listar(sessaoDe(req), req.query as unknown as ListarTarefasInput);
  return sucesso(res, tarefas, 'Tarefas carregadas');
}

export async function criar(req: Request, res: Response): Promise<Response> {
  const tarefa = await servico.criar(sessaoDe(req), req.body as CriarTarefaInput);
  return sucesso(res, tarefa, 'Tarefa atribuída', 201);
}

export async function actualizar(req: Request, res: Response): Promise<Response> {
  const tarefa = await servico.actualizar(
    sessaoDe(req),
    String(req.params.id),
    req.body as ActualizarTarefaInput,
  );
  return sucesso(res, tarefa, 'Tarefa actualizada');
}

export async function concluir(req: Request, res: Response): Promise<Response> {
  const resultado = await servico.concluir(
    sessaoDe(req),
    String(req.params.id),
    req.body as ConcluirTarefaInput,
  );
  return sucesso(res, resultado, 'Tarefa cumprida · relatório enviado à gestão');
}

export async function pedirProrrogacao(req: Request, res: Response): Promise<Response> {
  const pedido = await servico.pedirProrrogacao(
    sessaoDe(req),
    String(req.params.id),
    req.body as PedirProrrogacaoInput,
  );
  return sucesso(res, pedido, 'Pedido de prorrogação enviado à gestão', 201);
}

export async function decidirProrrogacao(req: Request, res: Response): Promise<Response> {
  const corpo = req.body as DecidirProrrogacaoInput;
  const resultado = await servico.decidirProrrogacao(
    sessaoDe(req),
    String(req.params.extensionId),
    corpo.aceitar,
  );
  return sucesso(res, resultado, resultado.aceite ? 'Prazo alargado' : 'Pedido recusado');
}
