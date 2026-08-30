import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  aceitarConviteSchema,
  alterarPasswordSchema,
  loginSchema,
  registarEmpresaSchema,
} from '@nexora/shared';
import { autenticar } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './auth.controller';
import * as empresas from '../organizations/organizations.controller';

/**
 * As rotas que aceitam credenciais sao limitadas por IP.
 *
 * Vinte tentativas em quinze minutos nao incomodam quem se enganou a escrever, mas travam a
 * enumeracao de palavras-passe muito antes de ela ter hipotese de resultar.
 */
const limiteCredenciais = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'DEMASIADOS_PEDIDOS',
      message: 'Demasiadas tentativas. Aguarde alguns minutos antes de tentar de novo.',
    },
  },
});

export const authRouter: Router = Router();

authRouter.post('/login', limiteCredenciais, validar(loginSchema), assincrono(controlador.login));
authRouter.post('/refresh', assincrono(controlador.refresh));
authRouter.post('/logout', assincrono(controlador.logout));
authRouter.post(
  '/accept-invite',
  limiteCredenciais,
  validar(aceitarConviteSchema),
  assincrono(controlador.aceitarConvite),
);
// Criar empresa e a unica escrita publica que gera uma conta. Fica sob o mesmo limite das
// credenciais: sem isso, seria a rota mais barata para encher a base de contas.
authRouter.post(
  '/register-company',
  limiteCredenciais,
  validar(registarEmpresaSchema),
  assincrono(empresas.registar),
);
// Sob o limite das credenciais como o login: quem tenta adivinhar a palavra-passe actual a
// partir de uma sessao roubada nao pode ter mais tentativas do que quem tenta a partir da porta.
authRouter.post(
  '/change-password',
  autenticar,
  limiteCredenciais,
  validar(alterarPasswordSchema),
  assincrono(controlador.alterarPassword),
);
authRouter.get('/me', autenticar, assincrono(controlador.me));
