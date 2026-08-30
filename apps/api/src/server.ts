import cron from 'node-cron';
import { criarApp } from './app';
import { env } from './config/env';
import { fecharLigacao } from './db/db';
import { limparAuditoriaAntiga } from './modules/audit.service';
import { limparSessoes } from './modules/auth/auth.service';
import { correrAlertas } from './modules/notifications/notifications.service';
import { logModulo, logger } from './utils/logger';

const app = criarApp();
const servidor = app.listen(env.PORT, () => {
  logger.info(logModulo('servidor', `A escutar na porta ${env.PORT}`));
});

/**
 * Alertas de prazo, todas as manhas as 07:00 de Maputo.
 *
 * A hora e deliberada: o aviso serve para organizar o dia, e por isso tem de chegar antes de ele
 * comecar. O job e idempotente, logo um reinicio a meio da manha nao duplica avisos.
 */
const tarefaAlertas = cron.schedule(
  '0 7 * * *',
  () => {
    correrAlertas().catch((erro: unknown) => {
      logger.error(logModulo('alertas', `Falhou: ${(erro as Error).message}`));
    });
  },
  { timezone: 'Africa/Maputo' },
);

/** Limpeza de sessoes expiradas e de auditoria com mais de 24 meses, de madrugada. */
const tarefaSessoes = cron.schedule(
  '30 3 * * *',
  () => {
    limparSessoes()
      .then((n) => logger.info(logModulo('auth', `${n} sessões expiradas removidas`)))
      .catch((erro: unknown) => {
        logger.error(logModulo('auth', `Limpeza falhou: ${(erro as Error).message}`));
      });
    limparAuditoriaAntiga()
      .then((n) => logger.info(logModulo('auditoria', `${n} registos com mais de 24 meses removidos`)))
      .catch((erro: unknown) => {
        logger.error(logModulo('auditoria', `Retenção falhou: ${(erro as Error).message}`));
      });
  },
  { timezone: 'Africa/Maputo' },
);

async function encerrar(sinal: string): Promise<void> {
  logger.info(logModulo('servidor', `${sinal} recebido, a encerrar`));
  tarefaAlertas.stop();
  tarefaSessoes.stop();
  servidor.close(() => {
    void fecharLigacao().finally(() => process.exit(0));
  });
  // Se as ligacoes abertas nao fecharem em dez segundos, sai a forca.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void encerrar('SIGTERM'));
process.on('SIGINT', () => void encerrar('SIGINT'));
