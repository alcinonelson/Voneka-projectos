import { z } from 'zod';
import { zEmail, zPassword } from './common.schema';

export const loginSchema = z.object({
  email: zEmail,
  password: z.string().min(1, { message: 'Indique a palavra-passe.' }),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Sessão inválida.' }),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * Aceitacao de convite: o membro chega com o token do email e define a sua palavra-passe.
 * A confirmacao e comparada aqui e nao no formulario para que o servidor tambem a exija.
 */
export const aceitarConviteSchema = z
  .object({
    token: z.string().min(1, { message: 'Convite inválido.' }),
    password: zPassword,
    confirmacao: z.string(),
  })
  .refine((v) => v.password === v.confirmacao, {
    path: ['confirmacao'],
    message: 'As palavras-passe não coincidem.',
  });
export type AceitarConviteInput = z.infer<typeof aceitarConviteSchema>;

export const alterarPasswordSchema = z
  .object({
    actual: z.string().min(1, { message: 'Indique a palavra-passe actual.' }),
    nova: zPassword,
    confirmacao: z.string(),
  })
  .refine((v) => v.nova === v.confirmacao, {
    path: ['confirmacao'],
    message: 'As palavras-passe não coincidem.',
  });
export type AlterarPasswordInput = z.infer<typeof alterarPasswordSchema>;

export const pedirRecuperacaoSchema = z.object({
  email: zEmail,
});
export type PedirRecuperacaoInput = z.infer<typeof pedirRecuperacaoSchema>;

export const reporPasswordSchema = z
  .object({
    token: z.string().min(1, { message: 'Ligação inválida.' }),
    password: zPassword,
    confirmacao: z.string(),
  })
  .refine((v) => v.password === v.confirmacao, {
    path: ['confirmacao'],
    message: 'As palavras-passe não coincidem.',
  });
export type ReporPasswordInput = z.infer<typeof reporPasswordSchema>;
