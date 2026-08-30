import { Router } from 'express';
import {
  actualizarTarefaSchema,
  concluirTarefaSchema,
  criarTarefaSchema,
  decidirProrrogacaoSchema,
  listarTarefasSchema,
  pedirProrrogacaoSchema,
} from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './tasks.controller';

export const tasksRouter: Router = Router();

tasksRouter.use(autenticar);

tasksRouter.get('/', validar(listarTarefasSchema, 'query'), assincrono(controlador.listar));

tasksRouter.post(
  '/',
  exigirNivel('administrador', 'gestor'),
  validar(criarTarefaSchema),
  assincrono(controlador.criar),
);
tasksRouter.patch('/:id', validar(actualizarTarefaSchema), assincrono(controlador.actualizar));

// Concluir nao exige nivel: o servico exige que seja o responsavel pela tarefa, que e mais
// restritivo do que qualquer nivel de acesso.
tasksRouter.post(
  '/:id/complete',
  validar(concluirTarefaSchema),
  assincrono(controlador.concluir),
);
tasksRouter.post(
  '/:id/extension',
  validar(pedirProrrogacaoSchema),
  assincrono(controlador.pedirProrrogacao),
);
tasksRouter.post(
  '/extensions/:extensionId/decide',
  exigirNivel('administrador', 'gestor'),
  validar(decidirProrrogacaoSchema),
  assincrono(controlador.decidirProrrogacao),
);
