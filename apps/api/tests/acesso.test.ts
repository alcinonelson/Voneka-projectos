import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hoje, paraIso } from '@nexora/shared';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * Dar acesso a um membro sem email.
 *
 * Enquanto o SMTP nao esta configurado, o Administrador recebe a ligacao de convite ou uma
 * palavra-passe temporaria e entrega-a ele. O que se prova aqui e o que torna isso seguro: a
 * temporaria so serve para escolher outra - o servidor recusa tudo o resto, e nao apenas o ecra -,
 * e nenhuma resposta leva os hashes da conta.
 */

const app = criarApp();
const PASSWORD = 'Acesso#Teste2026';
const NOVA = 'Minha#Propria2026';

let tokenAdmin: string;
let adminId: string;

function membro(sufixo: string, acesso: 'ligacao' | 'password' | 'nenhum') {
  return {
    nome: `Membro ${sufixo}`,
    email: `membro.${sufixo}.${Date.now()}@exemplo.co.mz`,
    telefone: '',
    funcao: 'Analista',
    departamentoId: null,
    dataEntrada: paraIso(hoje()),
    alocacao: 100,
    nivelAcesso: 'colaborador',
    projectos: [],
    acesso,
  };
}

beforeAll(async () => {
  const registo = await request(app)
    .post('/api/auth/register-company')
    .send({
      empresa: { nome: 'Empresa do Acesso', moeda: 'MZN' },
      administrador: {
        nome: 'Lina Cossa',
        email: `acesso.${Date.now()}@exemplo.co.mz`,
        password: PASSWORD,
        confirmacao: PASSWORD,
      },
    });

  expect(registo.status, JSON.stringify(registo.body)).toBe(201);
  tokenAdmin = registo.body.data.accessToken;
  adminId = registo.body.data.utilizador.id;
}, 30_000);

afterAll(async () => {
  await fecharLigacao();
});

describe('dar acesso a um membro', () => {
  it('a resposta de criar nunca leva os hashes da conta', async () => {
    const resposta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(membro('hashes', 'password'));

    expect(resposta.status, JSON.stringify(resposta.body)).toBe(201);
    const texto = JSON.stringify(resposta.body);
    expect(texto).not.toContain('passwordHash');
    expect(texto).not.toContain('conviteTokenHash');
    expect(texto).not.toMatch(/\$2[aby]\$/);
  });

  it('com ligacao devolve o convite, e o convite activa a conta', async () => {
    const criado = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(membro('ligacao', 'ligacao'));

    expect(criado.status, JSON.stringify(criado.body)).toBe(201);
    const { acesso } = criado.body.data;
    expect(acesso.ligacao).toMatch(/\/convite\?token=/);
    expect(acesso.password).toBeUndefined();

    const token = new URL(acesso.ligacao).searchParams.get('token');
    const aceite = await request(app)
      .post('/api/auth/accept-invite')
      .send({ token, password: NOVA, confirmacao: NOVA });

    expect(aceite.status, JSON.stringify(aceite.body)).toBe(200);
    expect(aceite.body.data.utilizador.deveMudarPassword).toBe(false);
  });

  it('sem acesso, a conta existe mas ninguem entra', async () => {
    const dados = membro('nenhum', 'nenhum');
    const criado = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(dados);

    expect(criado.status).toBe(201);
    expect(criado.body.data.acesso).toBeNull();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: PASSWORD });
    expect(login.status).toBe(401);
  });
});

describe('palavra-passe temporaria', () => {
  const dados = membro('temporaria', 'password');
  let temporaria: string;
  let membroId: string;
  let tokenTemporario: string;

  it('e devolvida uma unica vez, ao criar', async () => {
    const criado = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(dados);

    expect(criado.status, JSON.stringify(criado.body)).toBe(201);
    temporaria = criado.body.data.acesso.password;
    membroId = criado.body.data.membro.id;
    expect(temporaria).toHaveLength(16);
    expect(temporaria).not.toMatch(/[0O1lI]/);
  });

  it('entra, mas a sessao vem marcada para trocar', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: temporaria });

    expect(login.status, JSON.stringify(login.body)).toBe(200);
    expect(login.body.data.utilizador.deveMudarPassword).toBe(true);
    tokenTemporario = login.body.data.accessToken;
  });

  it('o servidor recusa tudo o resto enquanto nao trocar', async () => {
    for (const caminho of ['/api/tasks?filtro=abertas&minhas=true', '/api/projects', '/api/notifications']) {
      const resposta = await request(app)
        .get(caminho)
        .set('Authorization', `Bearer ${tokenTemporario}`);

      expect(resposta.status, caminho).toBe(403);
      expect(resposta.body.error.code).toBe('PASSWORD_TEMPORARIA');
    }
  });

  it('o perfil continua acessivel, para o interface saber o que mostrar', async () => {
    const resposta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenTemporario}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.deveMudarPassword).toBe(true);
  });

  it('depois de trocar, a sessao nova abre o portal', async () => {
    const troca = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${tokenTemporario}`)
      .send({ actual: temporaria, nova: NOVA, confirmacao: NOVA });

    expect(troca.status, JSON.stringify(troca.body)).toBe(200);
    expect(troca.body.data.utilizador.deveMudarPassword).toBe(false);

    const tarefas = await request(app)
      .get('/api/tasks?filtro=abertas&minhas=true')
      .set('Authorization', `Bearer ${troca.body.data.accessToken}`);
    expect(tarefas.status).toBe(200);

    const antiga = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: temporaria });
    expect(antiga.status).toBe(401);
  });

  it('o Administrador pode repor uma temporaria, e a anterior deixa de servir', async () => {
    const reposta = await request(app)
      .post(`/api/users/${membroId}/temporary-password`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(reposta.status, JSON.stringify(reposta.body)).toBe(200);
    const nova = reposta.body.data.password as string;
    expect(nova).toHaveLength(16);

    const comPropria = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: NOVA });
    expect(comPropria.status).toBe(401);

    const comNova = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: nova });
    expect(comNova.status).toBe(200);
    expect(comNova.body.data.utilizador.deveMudarPassword).toBe(true);
  });

  it('o Administrador nao a usa na propria conta', async () => {
    const resposta = await request(app)
      .post(`/api/users/${adminId}/temporary-password`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(resposta.status).toBe(403);
  });

  it('um colaborador nao gera temporarias', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: temporaria });
    // A temporaria original ja nao serve; entra-se com a reposta para testar o nivel.
    expect(login.status).toBe(401);

    const reposta = await request(app)
      .post(`/api/users/${membroId}/temporary-password`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const entrada = await request(app)
      .post('/api/auth/login')
      .send({ email: dados.email, password: reposta.body.data.password });
    const troca = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${entrada.body.data.accessToken}`)
      .send({ actual: reposta.body.data.password, nova: NOVA, confirmacao: NOVA });

    const resposta = await request(app)
      .post(`/api/users/${adminId}/temporary-password`)
      .set('Authorization', `Bearer ${troca.body.data.accessToken}`);
    expect(resposta.status).toBe(403);
  });
});
