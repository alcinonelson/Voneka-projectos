import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, fecharLigacao } from './db';
import { logModulo, logger } from '../utils/logger';

/**
 * Aplica as migracoes pendentes.
 * Corre a partir de `pnpm tables`. `pnpm --filter api generate` e que escreve SQL novo.
 */
async function main(): Promise<void> {
  await migrate(db, { migrationsFolder: './drizzle' });
  logger.info(logModulo('db', 'Migracoes aplicadas'));
  await fecharLigacao();
}

main().catch(async (erro: unknown) => {
  logger.error(logModulo('db', `Falha ao aplicar migracoes: ${(erro as Error).message}`));
  await fecharLigacao();
  process.exit(1);
});
