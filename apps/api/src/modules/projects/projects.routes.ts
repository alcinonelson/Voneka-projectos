import { Router } from 'express';
import {
  actualizarProjectoSchema,
  criarProjectoSchema,
  gravarRoteiroSchema,
  listarProjectosSchema,
} from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as fases from '../phases/phases.controller';
import * as controlador from './projects.controller';

export const projectsRouter: Router = Router();

projectsRouter.use(autenticar);

projectsRouter.get('/', validar(listarProjectosSchema, 'query'), assincrono(controlador.listar));
// O roteiro carrega o plano de toda a carteira num pedido so. Antes de '/:id' de proposito, para
// 'phases' nao ser lido como um identificador de projecto.
projectsRouter.get('/phases', assincrono(fases.listarDaCarteira));
projectsRouter.get('/:id', assincrono(controlador.detalhe));

projectsRouter.post(
  '/',
  exigirNivel('administrador', 'gestor'),
  validar(criarProjectoSchema),
  assincrono(controlador.criar),
);
projectsRouter.patch(
  '/:id',
  exigirNivel('administrador', 'gestor'),
  validar(actualizarProjectoSchema),
  assincrono(controlador.actualizar),
);

projectsRouter.get('/:id/phases', assincrono(fases.listar));
projectsRouter.put(
  '/:id/phases',
  exigirNivel('administrador', 'gestor'),
  validar(gravarRoteiroSchema),
  assincrono(fases.gravar),
);
projectsRouter.post(
  '/:id/phases/reset',
  exigirNivel('administrador', 'gestor'),
  assincrono(fases.repor),
);
