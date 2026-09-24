import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * O tempo de resposta do login nao pode dizer quais os emails registados.
 *
 * O hash usado para contas inexistentes era um sal de zeros escrito a mao, que o bcrypt recusava
 * em 0ms contra ~400ms de uma conta real. Mede-se aqui a diferenca: um email que nao existe tem
 * de custar da mesma ordem de grandeza que uma palavra-passe errada numa conta real.
 */

const app = criarApp();
const PASSWORD = 'Tempo#Teste2026';
let email: string;

async function medir(corpo: object): Promise<number> {
  const inicio = performance.now();
  const resposta = await request(app).post('/api/auth/login').send(corpo);
  expect(resposta.status).toBe(401);
  return performance.now() - inicio;
}

beforeAll(async () => {
  email = `tempo.${Date.now()}@exemplo.co.mz`;
  const registo = await request(app)
    .post('/api/auth/register-company')
    .send({
      empresa: { nome: 'Empresa do Tempo', moeda: 'MZN' },
      administrador: { nome: 'Tomas Langa', email, password: PASSWORD, confirmacao: PASSWORD },
    });
  expect(registo.status, JSON.stringify(registo.body)).toBe(201);

  // Aquece: o hash das contas inexistentes e gerado no primeiro uso.
  await medir({ email: 'aquecer@exemplo.co.mz', password: 'errada-123456' });
}, 30_000);

afterAll(async () => {
  await fecharLigacao();
});

describe('tempo do login', () => {
  it('email inexistente custa o mesmo que palavra-passe errada', async () => {
    const real = await medir({ email, password: 'errada-123456' });
    const inexistente = await medir({ email: 'ninguem.aqui@exemplo.co.mz', password: 'errada-123456' });

    expect(real).toBeGreaterThan(50);
    expect(inexistente, `real ${real.toFixed(0)}ms, inexistente ${inexistente.toFixed(0)}ms`).toBeGreaterThan(
      real * 0.5,
    );
  }, 30_000);
});
