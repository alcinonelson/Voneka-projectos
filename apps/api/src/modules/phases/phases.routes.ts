import { Router } from 'express';
import { reagendarFaseSchema } from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './phases.controller';

export const phasesRouter: Router = Router();

phasesRouter.use(autenticar);

phasesRouter.get('/edicoes', assincrono(controlador.edicoes));
phasesRouter.patch(
  '/:faseId/schedule',
  exigirNivel('administrador', 'gestor'),
  validar(reagendarFaseSchema),
  assincrono(controlador.reagendar),
);
