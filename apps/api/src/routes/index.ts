import { Router } from 'express';
import { pool } from '../db/db';
import { authRouter } from '../modules/auth/auth.routes';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { organizationsRouter } from '../modules/organizations/organizations.routes';
import { phasesRouter } from '../modules/phases/phases.routes';
import { projectsRouter } from '../modules/projects/projects.routes';
import { reportsRouter } from '../modules/reports/reports.routes';
import { tasksRouter } from '../modules/tasks/tasks.routes';
import { usersRouter } from '../modules/users/users.routes';
import { AppError } from '../utils/errors';
import { falha, sucesso } from '../utils/response';

export const apiRouter: Router = Router();

apiRouter.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    return sucesso(res, { estado: 'ok' }, 'API disponível');
  } catch {
    return falha(res, new AppError('ERRO_INTERNO', 'A base de dados não responde.', 503));
  }
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/phases', phasesRouter);
apiRouter.use('/tasks', tasksRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/organizations', organizationsRouter);
