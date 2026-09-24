import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hoje, paraIso, somarDias } from '@nexora/shared';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * Isolamento entre empresas.
 *
 * Este e o teste guardiao do modelo multi-empresa. Cria duas empresas do zero pela porta publica,
 * enche ambas com dados espelhados, e verifica que o Administrador de uma nao consegue chegar a
 * nada da outra - nem por listagem, nem por identificador directo, nem escrevendo.
 *
 * O caso perigoso e precisamente o Administrador: e o nivel que dentro da sua casa nao tem
 * restricao nenhuma, pelo que qualquer consulta a que falte a condicao de empresa aparece aqui e
 * so aqui.
 */

const app = criarApp();
const PASSWORD = 'Empresa#Teste2026';

interface Empresa {
  token: string;
  adminId: string;
  empresaId: string;
  naturezaId: string;
  estagioId: string;
  projectoId: string;
  tarefaId: string;
}

/** Cria uma empresa completa: conta de administrador, vocabulario, projecto e tarefa. */
async function criarEmpresa(sufixo: string): Promise<Empresa> {
  const registo = await request(app)
    .post('/api/auth/register-company')
    .send({
      empresa: { nome: `Empresa ${sufixo}`, moeda: 'MZN' },
      administrador: {
        nome: `Admin ${sufixo}`,
        email: `admin.${sufixo}.${Date.now()}@exemplo.co.mz`,
        password: PASSWORD,
        confirmacao: PASSWORD,
      },
    });

  expect(registo.status, JSON.stringify(registo.body)).toBe(201);
  const token = registo.body.data.accessToken as string;
  const auth = { Authorization: `Bearer ${token}` };

  const natureza = await request(app)
    .post('/api/organizations/me/taxonomies')
    .set(auth)
    .send({
      tipo: 'natureza',
      rotulo: `Consultoria ${sufixo}`,
      cor: 'azul',
      prefixo: 'CST',
      fasesModelo: [{ nome: 'Arranque', semanas: 2 }],
    });
  expect(natureza.status, JSON.stringify(natureza.body)).toBe(201);

  const estagio = await request(app)
    .post('/api/organizations/me/taxonomies')
    .set(auth)
    .send({ tipo: 'estagio', rotulo: `Em curso ${sufixo}`, cor: 'verde' });
  expect(estagio.status, JSON.stringify(estagio.body)).toBe(201);

  const projecto = await request(app)
    .post('/api/projects')
    .set(auth)
    .send({
      nome: `Projecto de ${sufixo}`,
      cliente: `Cliente de ${sufixo}`,
      naturezaId: natureza.body.data.id,
      estagioId: estagio.body.data.id,
      responsavelId: registo.body.data.utilizador.id,
      inicio: paraIso(hoje()),
      deadline: paraIso(somarDias(hoje(), 90)),
      orcamentoCentavos: null,
      pessoas: [],
      antecedenciaAlerta: 3,
      fases: [{ nome: 'Arranque', estado: 'planeada', nota: '', semanas: 2 }],
    });
  expect(projecto.status, JSON.stringify(projecto.body)).toBe(201);

  const tarefa = await request(app)
    .post('/api/tasks')
    .set(auth)
    .send({
      titulo: `Tarefa reservada a ${sufixo}`,
      descricao: 'Entrega interna',
      projectoId: projecto.body.data.id,
      faseId: null,
      responsavelId: registo.body.data.utilizador.id,
      deadline: paraIso(somarDias(hoje(), 10)),
      esforcoEstimadoHoras: 8,
      prioridade: 'normal',
      antecedenciaAlerta: 3,
      exigeRelatorio: true,
    });
  expect(tarefa.status, JSON.stringify(tarefa.body)).toBe(201);

  return {
    token,
    adminId: registo.body.data.utilizador.id,
    empresaId: registo.body.data.empresa.id,
    naturezaId: natureza.body.data.id,
    estagioId: estagio.body.data.id,
    projectoId: projecto.body.data.id,
    tarefaId: tarefa.body.data.id,
  };
}

let a: Empresa;
let b: Empresa;

beforeAll(async () => {
  a = await criarEmpresa('alfa');
  b = await criarEmpresa('beta');
}, 60_000);

afterAll(async () => {
  await fecharLigacao();
});

describe('registo de empresa', () => {
  it('cria empresa e administrador e devolve sessao imediata', async () => {
    const resposta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.nivelAcesso).toBe('administrador');
    expect(resposta.body.data.empresa.id).toBe(a.empresaId);
  });

  it('recusa um email ja registado noutra empresa', async () => {
    const primeiro = `repetido.${Date.now()}@exemplo.co.mz`;
    const corpo = (email: string) => ({
      empresa: { nome: 'Empresa repetida', moeda: 'MZN' },
      administrador: { nome: 'Alguém', email, password: PASSWORD, confirmacao: PASSWORD },
    });

    const um = await request(app).post('/api/auth/register-company').send(corpo(primeiro));
    expect(um.status).toBe(201);

    const dois = await request(app).post('/api/auth/register-company').send(corpo(primeiro));
    expect(dois.status).toBe(409);
    expect(dois.body.error.code).toBe('EMAIL_EM_USO');
  });

  it('recusa palavras-passe que nao coincidem', async () => {
    const resposta = await request(app)
      .post('/api/auth/register-company')
      .send({
        empresa: { nome: 'Empresa sem par', moeda: 'MZN' },
        administrador: {
          nome: 'Alguém',
          email: `sempar.${Date.now()}@exemplo.co.mz`,
          password: PASSWORD,
          confirmacao: 'outra-coisa-qualquer',
        },
      });

    expect(resposta.status).toBe(422);
  });
});

describe('leitura entre empresas', () => {
  it('a carteira de cada empresa tem apenas o seu projecto', async () => {
    for (const empresa of [a, b]) {
      const resposta = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${empresa.token}`);

      expect(resposta.status).toBe(200);
      const ids = resposta.body.data.projectos.map((p: { id: string }) => p.id);
      expect(ids).toEqual([empresa.projectoId]);
    }
  });

  it('o projecto da outra empresa responde 404, mesmo ao Administrador', async () => {
    const resposta = await request(app)
      .get(`/api/projects/${b.projectoId}`)
      .set('Authorization', `Bearer ${a.token}`);

    // 404 e nao 403: um 403 confirmaria que aquele identificador existe algures.
    expect(resposta.status).toBe(404);
  });

  it('as tarefas nao atravessam a fronteira', async () => {
    const resposta = await request(app)
      .get('/api/tasks?filtro=todas')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    const ids = resposta.body.data.map((t: { id: string }) => t.id);
    expect(ids).toContain(a.tarefaId);
    expect(ids).not.toContain(b.tarefaId);
  });

  it('a tabela de Equipa mostra apenas as contas da propria empresa', async () => {
    const resposta = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    const ids = resposta.body.data.map((u: { id: string }) => u.id);
    expect(ids).toEqual([a.adminId]);
  });

  it('o selector de pessoas nao oferece gente de outra empresa', async () => {
    const resposta = await request(app)
      .get('/api/users/selector')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    const ids = resposta.body.data.map((u: { id: string }) => u.id);
    expect(ids).not.toContain(b.adminId);
  });

  it('o vocabulario de uma empresa nao aparece na outra', async () => {
    const resposta = await request(app)
      .get('/api/organizations/me/taxonomies')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    const ids = resposta.body.data.map((t: { id: string }) => t.id);
    expect(ids).toContain(a.naturezaId);
    expect(ids).not.toContain(b.naturezaId);
  });

  it('o painel de uma empresa nao conta os projectos da outra', async () => {
    const resposta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.avancos.length).toBe(1);
  });
});

describe('escrita entre empresas', () => {
  it('nao se atribui uma tarefa num projecto de outra empresa', async () => {
    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        titulo: 'Tarefa que não devia nascer',
        descricao: '',
        projectoId: b.projectoId,
        faseId: null,
        responsavelId: a.adminId,
        deadline: paraIso(somarDias(hoje(), 5)),
        esforcoEstimadoHoras: 8,
        prioridade: 'normal',
        antecedenciaAlerta: 3,
        exigeRelatorio: true,
      });

    expect([403, 404]).toContain(resposta.status);
  });

  it('nao se atribui trabalho a uma pessoa de outra empresa', async () => {
    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        titulo: 'Tarefa para alguém de fora',
        descricao: '',
        projectoId: a.projectoId,
        faseId: null,
        responsavelId: b.adminId,
        deadline: paraIso(somarDias(hoje(), 5)),
        esforcoEstimadoHoras: 8,
        prioridade: 'normal',
        antecedenciaAlerta: 3,
        exigeRelatorio: true,
      });

    expect(resposta.status).toBe(422);
  });

  it('nao se classifica um projecto com o vocabulario de outra empresa', async () => {
    const resposta = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        nome: 'Projecto com vocabulário emprestado',
        cliente: 'Cliente qualquer',
        naturezaId: b.naturezaId,
        estagioId: a.estagioId,
        responsavelId: a.adminId,
        inicio: paraIso(hoje()),
        deadline: paraIso(somarDias(hoje(), 30)),
        orcamentoCentavos: null,
        pessoas: [],
        antecedenciaAlerta: 3,
        fases: [{ nome: 'Arranque', estado: 'planeada', nota: '', semanas: 2 }],
      });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.message).toContain('vocabulário da sua empresa');
  });

  it('nao se edita o projecto de outra empresa', async () => {
    const resposta = await request(app)
      .patch(`/api/projects/${b.projectoId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ nome: 'Renomeado por quem não devia' });

    expect([403, 404]).toContain(resposta.status);
  });

  it('nao se altera o membro de outra empresa', async () => {
    const resposta = await request(app)
      .patch(`/api/users/${b.adminId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ funcao: 'Intruso' });

    expect(resposta.status).toBe(404);
  });

  it('nao se reenvia o convite de uma conta de outra empresa', async () => {
    const resposta = await request(app)
      .post(`/api/users/${b.adminId}/resend-invite`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(404);
  });

  it('nao se gera palavra-passe temporaria para uma conta de outra empresa', async () => {
    const resposta = await request(app)
      .post(`/api/users/${b.adminId}/temporary-password`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.data).toBeUndefined();
  });

  it('nao se aloca um membro a um projecto de outra empresa', async () => {
    const resposta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${a.token}`)
      .send({
        nome: 'Pessoa com projecto alheio',
        email: `alheio.${Date.now()}@exemplo.co.mz`,
        telefone: '',
        funcao: 'Analista',
        departamentoId: null,
        dataEntrada: paraIso(hoje()),
        alocacao: 100,
        nivelAcesso: 'colaborador',
        projectos: [b.projectoId],
        acesso: 'nenhum',
      });

    expect(resposta.status).toBe(422);
  });

  it('nao se atribui um responsavel de outra empresa ao actualizar a tarefa', async () => {
    const resposta = await request(app)
      .patch(`/api/tasks/${a.tarefaId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ responsavelId: b.adminId });

    expect(resposta.status).toBe(422);
  });

  it('nao se valida o relatorio de outra empresa', async () => {
    const fechada = await request(app)
      .post(`/api/tasks/${b.tarefaId}/complete`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({
        situacao: 'com_obstaculo',
        texto: 'Texto com substancia suficiente para fechar a tarefa da empresa vizinha.',
        esforcoRealHoras: 4,
        provaExecucao: '',
      });
    expect(fechada.status, JSON.stringify(fechada.body)).toBe(200);
    const relatorioId = fechada.body.data.relatorio.id as string;

    const resposta = await request(app)
      .post(`/api/reports/${relatorioId}/validate`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ decisao: 'validar', observacao: '' });

    expect(resposta.status).toBe(404);
  });

  it('nao se arquiva uma entrada do vocabulario de outra empresa', async () => {
    const resposta = await request(app)
      .patch(`/api/organizations/me/taxonomies/${b.naturezaId}`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ rotulo: 'Renomeado de fora' });

    expect(resposta.status).toBe(404);
  });
});

describe('vocabulario da empresa', () => {
  it('arquiva em vez de apagar o que ja classifica trabalho', async () => {
    const resposta = await request(app)
      .delete(`/api/organizations/me/taxonomies/${a.naturezaId}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.apagada).toBe(false);
    expect(resposta.body.data.emUso).toBeGreaterThan(0);
    // A mensagem tem de dizer porque e que o produto recusou, e nao so que recusou.
    expect(resposta.body.message).toContain('arquivada');
  });

  it('apaga a serio uma entrada que nunca foi usada', async () => {
    const criada = await request(app)
      .post('/api/organizations/me/taxonomies')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ tipo: 'departamento', rotulo: 'Departamento efémero', cor: 'rosa' });
    expect(criada.status).toBe(201);

    const removida = await request(app)
      .delete(`/api/organizations/me/taxonomies/${criada.body.data.id}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(removida.status).toBe(200);
    expect(removida.body.data.apagada).toBe(true);
  });

  it('deriva o codigo do rotulo, sem acentos nem espacos', async () => {
    const criada = await request(app)
      .post('/api/organizations/me/taxonomies')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ tipo: 'departamento', rotulo: 'Gestão da Mudança', cor: 'violeta' });

    expect(criada.status).toBe(201);
    expect(criada.body.data.codigo).toBe('gestao_da_mudanca');
  });
});
