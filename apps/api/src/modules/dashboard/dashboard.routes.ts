import { Router } from 'express';
import { autenticar } from '../../middleware/auth.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './dashboard.controller';

export const dashboardRouter: Router = Router();

dashboardRouter.use(autenticar);
dashboardRouter.get('/', assincrono(controlador.painel));
