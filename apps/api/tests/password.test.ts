import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * Alteracao da palavra-passe.
 *
 * Constroi a sua propria empresa, para nao depender do seed nem deixar a conta de demonstracao
 * com uma palavra-passe diferente da que os outros testes esperam.
 *
 * O que aqui se prova nao e o caminho feliz - e o que impede a mudanca de ser uma porta: exigir a
 * actual mesmo com sessao aberta, e derrubar as sessoes antigas ao gravar.
 */

const app = criarApp();
const ORIGINAL = 'Original#Teste2026';
const NOVA = 'Nova#Palavra2026';

let token: string;
let refreshOriginal: string;
let email: string;

/** Extrai o cookie de refresh de uma resposta, tal como o navegador o guardaria. */
function cookieDe(resposta: request.Response): string {
  const bruto = resposta.headers['set-cookie'];
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  const nx = lista.find((c) => c.startsWith('nx_refresh='));
  return nx ? (nx.split(';')[0] as string) : '';
}

beforeAll(async () => {
  email = `password.${Date.now()}@exemplo.co.mz`;
  const registo = await request(app)
    .post('/api/auth/register-company')
    .send({
      empresa: { nome: 'Empresa da Palavra-passe', moeda: 'MZN' },
      administrador: { nome: 'Rita Sitoe', email, password: ORIGINAL, confirmacao: ORIGINAL },
    });

  expect(registo.status, JSON.stringify(registo.body)).toBe(201);
  token = registo.body.data.accessToken;
  refreshOriginal = cookieDe(registo);
  expect(refreshOriginal).not.toBe('');
}, 30_000);

afterAll(async () => {
  await fecharLigacao();
});

describe('alterar a palavra-passe', () => {
  it('recusa sem sessao', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .send({ actual: ORIGINAL, nova: NOVA, confirmacao: NOVA });

    expect(resposta.status).toBe(401);
  });

  it('recusa quando a actual esta errada, mesmo com sessao valida', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ actual: 'nao-e-esta-de-certeza', nova: NOVA, confirmacao: NOVA });

    // Um terminal deixado aberto nao pode chegar para tomar a conta de alguem.
    expect(resposta.status).toBe(422);
    expect(resposta.body.error.fields?.actual).toBeTruthy();
  });

  it('recusa quando a nova nao coincide com a confirmacao', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ actual: ORIGINAL, nova: NOVA, confirmacao: 'outra-coisa-qualquer' });

    expect(resposta.status).toBe(422);
  });

  it('recusa uma nova palavra-passe curta demais', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ actual: ORIGINAL, nova: 'curta', confirmacao: 'curta' });

    expect(resposta.status).toBe(422);
  });

  it('recusa repetir a palavra-passe actual', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ actual: ORIGINAL, nova: ORIGINAL, confirmacao: ORIGINAL });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.fields?.nova).toBeTruthy();
  });

  it('altera, devolve sessao nova e derruba a antiga', async () => {
    const resposta = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ actual: ORIGINAL, nova: NOVA, confirmacao: NOVA });

    expect(resposta.status, JSON.stringify(resposta.body)).toBe(200);
    expect(resposta.body.data.accessToken).toBeTruthy();

    const refreshNovo = cookieDe(resposta);
    expect(refreshNovo).not.toBe('');
    expect(refreshNovo).not.toBe(refreshOriginal);

    // O refresh de antes da mudanca tem de deixar de servir: se continuasse a servir, quem
    // tivesse uma copia continuava dentro e a mudanca nao teria valido de nada.
    const comAntigo = await request(app).post('/api/auth/refresh').set('Cookie', refreshOriginal);
    expect(comAntigo.status).toBe(401);

    // O novo serve.
    const comNovo = await request(app).post('/api/auth/refresh').set('Cookie', refreshNovo);
    expect(comNovo.status).toBe(200);
  });

  it('a partir daqui entra-se com a nova e nao com a antiga', async () => {
    const antiga = await request(app)
      .post('/api/auth/login')
      .send({ email, password: ORIGINAL });
    expect(antiga.status).toBe(401);

    const nova = await request(app).post('/api/auth/login').send({ email, password: NOVA });
    expect(nova.status).toBe(200);
    expect(nova.body.data.utilizador.email).toBe(email);
  });
});

describe('recuperar a palavra-passe', () => {
  const REPOSTA = 'Reposta#Teste2026';

  it('aceita um email inexistente sem o denunciar', async () => {
    const resposta = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `nao.existe.${Date.now()}@exemplo.co.mz` });

    expect(resposta.status).toBe(200);
    expect(resposta.body.message).toContain('Se existir uma conta');
  });

  it('recusa uma ligacao invalida', async () => {
    const resposta = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'nao-e-um-token', password: REPOSTA, confirmacao: REPOSTA });

    expect(resposta.status).toBe(400);
  });

  it('redefine a palavra-passe a partir da ligacao e derruba a sessao antiga', async () => {
    const { db } = await import('../src/db/db');
    const { users } = await import('../src/db/schema/users.schema');
    const { hashOpaco } = await import('../src/utils/tokens');
    const { eq } = await import('drizzle-orm');

    const pedido = await request(app).post('/api/auth/forgot-password').send({ email });
    expect(pedido.status).toBe(200);

    const tokenClaro = `teste-recuperacao-${Date.now()}`;
    await db
      .update(users)
      .set({
        recuperacaoTokenHash: hashOpaco(tokenClaro),
        recuperacaoExpiraEm: new Date(Date.now() + 60 * 60 * 1000),
      })
      .where(eq(users.email, email));

    const resposta = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: tokenClaro, password: REPOSTA, confirmacao: REPOSTA });

    expect(resposta.status, JSON.stringify(resposta.body)).toBe(200);
    expect(resposta.body.data.accessToken).toBeTruthy();

    const antiga = await request(app).post('/api/auth/login').send({ email, password: NOVA });
    expect(antiga.status).toBe(401);

    const nova = await request(app).post('/api/auth/login').send({ email, password: REPOSTA });
    expect(nova.status).toBe(200);
  });
});
