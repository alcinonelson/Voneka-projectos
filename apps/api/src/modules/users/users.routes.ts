import { Router } from 'express';
import { actualizarMembroSchema, criarMembroSchema } from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './users.controller';

export const usersRouter: Router = Router();

usersRouter.use(autenticar);

// O selector de responsavel e preciso a qualquer pessoa que atribua trabalho; a tabela completa
// de Equipa e acessos, com carga e cumprimento, e so da Direccao.
usersRouter.get('/selector', assincrono(controlador.listarParaSelector));

usersRouter.get('/', exigirNivel('administrador'), assincrono(controlador.listarEquipa));
usersRouter.post(
  '/',
  exigirNivel('administrador'),
  validar(criarMembroSchema),
  assincrono(controlador.criar),
);
usersRouter.patch(
  '/:id',
  exigirNivel('administrador'),
  validar(actualizarMembroSchema),
  assincrono(controlador.actualizar),
);
usersRouter.post(
  '/:id/resend-invite',
  exigirNivel('administrador'),
  assincrono(controlador.reenviarConvite),
);
