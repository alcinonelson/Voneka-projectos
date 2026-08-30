import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NivelAcesso } from '@nexora/shared';
import { env } from '../config/env';

/**
 * Conteudo do access token. Curto de proposito: o token viaja em cada pedido.
 *
 * `org` e a empresa a que a conta pertence e entra na clausula WHERE de todas as consultas. Vem
 * do token assinado e nunca do corpo do pedido: se viesse do cliente, trocar um identificador
 * daria acesso a carteira de outra empresa.
 */
export interface Sessao {
  sub: string;
  nivel: NivelAcesso;
  nome: string;
  org: string;
}

export function assinarAccessToken(sessao: Sessao): string {
  return jwt.sign(sessao, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: 'nexora-projectos',
  } as jwt.SignOptions);
}

/** Devolve a sessao, ou `null` se o token for invalido, adulterado ou expirado. */
export function lerAccessToken(token: string): Sessao | null {
  try {
    const conteudo = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'nexora-projectos' });
    if (typeof conteudo === 'string') return null;
    const { sub, nivel, nome, org } = conteudo as jwt.JwtPayload & Partial<Sessao>;
    // Sem empresa nao ha ambito possivel: um token antigo, sem `org`, e recusado em vez de
    // correr com ambito indefinido.
    if (!sub || !nivel || !nome || !org) return null;
    return { sub: String(sub), nivel, nome, org };
  } catch {
    return null;
  }
}

/**
 * Gera um refresh token opaco e o seu hash.
 *
 * O valor em claro so existe no cookie do utilizador; a base de dados guarda apenas o hash. Quem
 * consiga ler a tabela nao consegue, com isso, entrar na conta de ninguem.
 */
export function gerarRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, hash: hashOpaco(token) };
}

/**
 * SHA-256 para tokens opacos.
 *
 * Basta, e nao seria correcto usar bcrypt aqui: estes tokens tem 384 bits de entropia aleatoria,
 * logo nao ha ataque de dicionario a travar, e o custo do bcrypt em cada refresh seria desperdicio.
 */
export function hashOpaco(valor: string): string {
  return crypto.createHash('sha256').update(valor).digest('hex');
}

/** Token de convite enviado por email, com o mesmo tratamento. */
export function gerarTokenConvite(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: hashOpaco(token) };
}

/** Comparacao em tempo constante, para nao revelar o token por medicao de tempo. */
export function iguais(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
