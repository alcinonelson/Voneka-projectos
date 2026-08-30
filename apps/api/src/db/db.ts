import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env, ehProducao } from '../config/env';
import * as schema from './schema';

/**
 * Ligacao a base de dados.
 *
 * O Postgres devolve `date` como string por omissao e `bigint` como string tambem; os dois
 * parsers abaixo alinham isso com o que o dominio espera - datas UTC a meia-noite e numeros.
 * Sem eles, uma deadline lida da base de dados chegaria como texto e os calculos de prazo
 * falhariam em silencio.
 */
pg.types.setTypeParser(pg.types.builtins.DATE, (valor: string) => {
  const [ano, mes, dia] = valor.split('-').map(Number);
  return new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1));
});
pg.types.setTypeParser(pg.types.builtins.INT8, (valor: string) => Number(valor));

/**
 * O Postgres alojado - Supabase incluido - exige TLS; o Postgres local nao o tem sequer
 * configurado. Decidir pelo anfitriao em vez de por `NODE_ENV` evita ter de lembrar de mudar uma
 * variavel ao apontar para a nuvem em desenvolvimento.
 */
function precisaDeTls(url: string): boolean {
  try {
    const anfitriao = new URL(url).hostname;
    return anfitriao !== 'localhost' && anfitriao !== '127.0.0.1';
  } catch {
    return ehProducao;
  }
}

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  /**
   * Dez ligacoes chegam para esta carteira e ficam bem dentro do limite do plano gratuito do
   * Supabase, que corta ligacoes em excesso em vez de as pôr em fila.
   */
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: precisaDeTls(env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export type Db = typeof db;

/** Fecha o pool. Usado no encerramento gracioso e no fim dos testes. */
export async function fecharLigacao(): Promise<void> {
  await pool.end();
}
