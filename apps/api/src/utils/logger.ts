import pino from 'pino';
import { ehProducao, ehTeste, env } from '../config/env';

/**
 * Logger da aplicacao.
 *
 * Em producao so saem `error` e `warn`, como manda o CLAUDE.md. O `redact` e a rede de seguranca
 * para o caso de um objecto com credenciais chegar aqui por descuido: e melhor que a palavra-passe
 * seja apagada pelo logger do que confiar em que ninguem a passe alguma vez.
 */
export const logger = pino({
  level: ehTeste ? 'silent' : ehProducao ? 'warn' : 'debug',
  redact: {
    paths: [
      'password',
      'passwordHash',
      'password_hash',
      'token',
      'refreshToken',
      'accessToken',
      'tokenHash',
      '*.password',
      '*.passwordHash',
      '*.token',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[removido]',
  },
  transport: ehProducao
    ? undefined
    : { target: 'pino/file', options: { destination: 1 } },
  base: { env: env.NODE_ENV },
});

/** Log com o formato `[MODULO] Descricao: detalhe`. */
export function logModulo(modulo: string, mensagem: string): string {
  return `[${modulo.toUpperCase()}] ${mensagem}`;
}
