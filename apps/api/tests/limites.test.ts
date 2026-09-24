import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * Limites de pedidos nas rotas de sessao.
 *
 * Ficheiro proprio porque os limites vivem em memoria no modulo das rotas: noutro ficheiro, as
 * tentativas daqui gastariam o limite dos testes de la.
 *
 * O que se prova: abrir a aplicacao muitas vezes seguidas - cada abertura renova a sessao - nao
 * bloqueia ninguem, e o login continua a travar quem tenta adivinhar palavras-passe.
 */

const app = criarApp();

afterAll(async () => {
  await fecharLigacao();
});

describe('limites de pedidos', () => {
  it('trinta renovacoes seguidas nao sao bloqueadas', async () => {
    for (let i = 0; i < 30; i += 1) {
      const resposta = await request(app).post('/api/auth/refresh');
      // Sem cookie a renovacao falha como sessao expirada - mas nunca por limite.
      expect(resposta.status, `pedido ${i + 1}`).toBe(401);
    }
  });

  it('o login continua limitado a vinte tentativas', async () => {
    const estados: number[] = [];
    for (let i = 0; i < 21; i += 1) {
      const resposta = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ninguem@exemplo.co.mz', password: 'errada-123456' });
      estados.push(resposta.status);
    }
    expect(estados.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(estados[20]).toBe(429);
  }, 60_000);
});
