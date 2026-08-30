import { Router } from 'express';
import { autenticar } from '../../middleware/auth.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './notifications.controller';

export const notificationsRouter: Router = Router();

notificationsRouter.use(autenticar);
notificationsRouter.get('/', assincrono(controlador.listar));
notificationsRouter.post('/read-all', assincrono(controlador.marcarTodasLidas));
notificationsRouter.post('/:id/read', assincrono(controlador.marcarLida));
