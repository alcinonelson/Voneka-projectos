import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { naoEncontrado, tratarErros } from './middleware/error.middleware';
import { requestId } from './middleware/request-id.middleware';
import { apiRouter } from './routes';

export function criarApp(): Express {
  const app = express();

  // Atras de um proxy - Render, Fly, Nginx - o IP real vem no X-Forwarded-For. Sem isto o rate
  // limit contaria todos os pedidos como vindos do mesmo endereco.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()),
      // O refresh token viaja em cookie, logo o pedido tem de poder levar credenciais.
      credentials: true,
    }),
  );
  app.use(requestId);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    }),
  );

  app.use('/api', apiRouter);

  app.use(naoEncontrado);
  app.use(tratarErros);

  return app;
}
