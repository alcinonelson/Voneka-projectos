import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuracao do processo, validada ao arranque.
 *
 * Falhar aqui, em voz alta e antes de o servidor aceitar o primeiro pedido, e preferivel a
 * descobrir a meio de um login que o segredo do JWT estava vazio. Os segredos exigem 32
 * caracteres porque um segredo curto torna a assinatura do token adivinhavel.
 */
const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL em falta.'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa de pelo menos 32 caracteres.'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET precisa de pelo menos 32 caracteres.'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DIAS: z.coerce.number().int().positive().default(30),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Voneka Projectos <nao-responder@voneka.co.mz>'),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  const problemas = resultado.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Configuracao invalida:\n${problemas}`);
}

export const env = resultado.data;

export const ehProducao = env.NODE_ENV === 'production';
export const ehTeste = env.NODE_ENV === 'test';

/** Verdadeiro quando ha SMTP configurado. Sem ele os convites sao registados no log. */
export const temEmail = Boolean(env.SMTP_HOST && env.SMTP_PORT);

/** Doze rondas de bcrypt, como manda o CLAUDE.md. */
export const BCRYPT_ROUNDS = 12;

/** Validade do convite de um novo membro. */
export const DIAS_VALIDADE_CONVITE = 7;
