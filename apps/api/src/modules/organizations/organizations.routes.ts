import { Router } from 'express';
import {
  actualizarEmpresaSchema,
  actualizarTaxonomiaSchema,
  criarTaxonomiaSchema,
  criarTaxonomiasEmLoteSchema,
  listarTaxonomiasSchema,
} from '@nexora/shared';
import { autenticar, exigirNivel } from '../../middleware/auth.middleware';
import { validar } from '../../middleware/validate.middleware';
import { assincrono } from '../../utils/async-handler';
import * as controlador from './organizations.controller';

/**
 * Empresa e vocabulario.
 *
 * O registo de empresa nao esta aqui: e publico e vive em `/api/auth/register-company`, junto do
 * resto do que se pode fazer sem sessao e sob o mesmo limite de tentativas.
 */
export const organizationsRouter: Router = Router();

organizationsRouter.use(autenticar);

// Qualquer pessoa autenticada precisa de ler o vocabulario para ver etiquetas com sentido;
// escrever nele e definir a linguagem da casa, e isso e do Administrador.
organizationsRouter.get('/me', assincrono(controlador.minha));
organizationsRouter.get('/me/setup', assincrono(controlador.arranque));
organizationsRouter.get(
  '/me/taxonomies',
  validar(listarTaxonomiasSchema, 'query'),
  assincrono(controlador.listarVocabulario),
);

organizationsRouter.patch(
  '/me',
  exigirNivel('administrador'),
  validar(actualizarEmpresaSchema),
  assincrono(controlador.actualizar),
);
organizationsRouter.post(
  '/me/taxonomies',
  exigirNivel('administrador'),
  validar(criarTaxonomiaSchema),
  assincrono(controlador.criarEntrada),
);
organizationsRouter.post(
  '/me/taxonomies/batch',
  exigirNivel('administrador'),
  validar(criarTaxonomiasEmLoteSchema),
  assincrono(controlador.criarEntradasEmLote),
);
organizationsRouter.patch(
  '/me/taxonomies/:id',
  exigirNivel('administrador'),
  validar(actualizarTaxonomiaSchema),
  assincrono(controlador.actualizarEntrada),
);
organizationsRouter.delete(
  '/me/taxonomies/:id',
  exigirNivel('administrador'),
  assincrono(controlador.removerEntrada),
);
