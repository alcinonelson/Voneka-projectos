import { Router } from 'express';
import { listarRelatoriosSchema, validarRelatorioSchema } from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './reports.controller';

export const reportsRouter: Router = Router();

reportsRouter.use(autenticar);

reportsRouter.get('/', validar(listarRelatoriosSchema, 'query'), assincrono(controlador.listar));
reportsRouter.post(
  '/:id/validate',
  exigirNivel('administrador', 'gestor'),
  validar(validarRelatorioSchema),
  assincrono(controlador.decidir),
);
