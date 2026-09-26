import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MIN_CARACTERES_RELATORIO, formatarData, hoje, somarDias } from '@nexora/shared';
import { criarApp } from '../src/app';
import { fecharLigacao } from '../src/db/db';

/**
 * Testes de integracao contra uma base de dados semeada.
 *
 * Correm contra dados reais e nao contra duplos: as regras que interessam - a transaccao do mini
 * relatorio, o ambito por nivel de acesso - so se provam com o Postgres no meio. Antes de correr:
 * `pnpm db:up`, `pnpm tables`, `pnpm seed`.
 */

const app = criarApp();
const PASSWORD = process.env.SEED_PASSWORD ?? 'Voneka#2026!';

/** Extrai o dia de uma data ISO, para comparar dias e nao instantes. */
function dia(iso: string): string {
  return iso.slice(0, 10);
}

interface Sessao {
  token: string;
  id: string;
}

async function entrar(email: string): Promise<Sessao> {
  const resposta = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(resposta.status, `login de ${email}: ${JSON.stringify(resposta.body)}`).toBe(200);
  return { token: resposta.body.data.accessToken, id: resposta.body.data.utilizador.id };
}

let direccao: Sessao;
let colaboradora: Sessao;
let semeada = false;

beforeAll(async () => {
  const tentativa = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alcino.maido@nexora.co.mz', password: PASSWORD });
  if (tentativa.status !== 200) {
    // Sem `pnpm seed` esta suite nao tem o que provar. Os testes de isolamento e palavra-passe
    // constroem as suas empresas e correm na mesma.
    semeada = false;
    return;
  }
  semeada = true;
  direccao = {
    token: tentativa.body.data.accessToken,
    id: tentativa.body.data.utilizador.id,
  };
  colaboradora = await entrar('claudia.bila@nexora.co.mz');
});

afterAll(async () => {
  await fecharLigacao();
});

beforeEach((ctx) => {
  if (!semeada) ctx.skip();
});

describe('autenticacao', () => {
  it('recusa credenciais erradas com a mesma mensagem de email inexistente', async () => {
    const errada = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alcino.maido@nexora.co.mz', password: 'errada-mas-longa' });
    const inexistente = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@nexora.co.mz', password: 'errada-mas-longa' });

    expect(errada.status).toBe(401);
    expect(inexistente.status).toBe(401);
    // A mensagem tem de ser identica: distingui-las revelaria que emails estao registados.
    expect(errada.body.error.message).toBe(inexistente.body.error.message);
  });

  it('recusa entrada a uma conta com convite pendente', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jorge.alfane@nexora.co.mz', password: PASSWORD });

    // 401 e nao 403: a conta com convite pendente nao tem palavra-passe definida, por isso a
    // tentativa cai no mesmo erro generico de qualquer credencial errada. E o comportamento
    // desejado - responder "esta conta existe mas ainda nao foi activada" diria a quem
    // experimentasse emails quais deles estao registados.
    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('nega acesso sem token', async () => {
    const resposta = await request(app).get('/api/projects');
    expect(resposta.status).toBe(401);
    expect(resposta.body.error.code).toBe('NAO_AUTENTICADO');
  });
});

describe('ambito por nivel de acesso', () => {
  it('a Direccao ve toda a carteira', async () => {
    const resposta = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    expect(resposta.status).toBe(200);
    expect(resposta.body.data.projectos.length).toBe(11);
  });

  it('a Colaboradora ve menos projectos do que a Direccao', async () => {
    const resposta = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    expect(resposta.status).toBe(200);
    expect(resposta.body.data.projectos.length).toBeGreaterThan(0);
    expect(resposta.body.data.projectos.length).toBeLessThan(11);
  });

  it('a Colaboradora recebe 404 num projecto que nao e seu', async () => {
    const todos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const seus = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${colaboradora.token}`);

    const idsSeus = new Set(seus.body.data.projectos.map((p: { id: string }) => p.id));
    const alheio = todos.body.data.projectos.find((p: { id: string }) => !idsSeus.has(p.id));
    expect(alheio, 'devia existir um projecto alheio').toBeTruthy();

    const resposta = await request(app)
      .get(`/api/projects/${alheio.id}`)
      .set('Authorization', `Bearer ${colaboradora.token}`);

    // 404 e nao 403: confirmar a existencia diria a quem tentasse que o projecto existe.
    expect(resposta.status).toBe(404);
  });

  it('a Colaboradora nao chega a tabela de Equipa e acessos', async () => {
    const resposta = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    expect(resposta.status).toBe(403);
    expect(resposta.body.error.code).toBe('SEM_PERMISSAO');
  });

  it('a Colaboradora nao pode atribuir tarefas', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    const projecto = projectos.body.data.projectos[0];

    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({
        titulo: 'Tarefa que nao devia passar',
        projectoId: projecto.id,
        responsavelId: colaboradora.id,
        deadline: new Date().toISOString().slice(0, 10),
      });

    expect(resposta.status).toBe(403);
  });

  it('a Colaboradora so ve as suas tarefas', async () => {
    const resposta = await request(app)
      .get('/api/tasks?filtro=todas')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    expect(resposta.status).toBe(200);
    for (const tarefa of resposta.body.data) {
      expect(tarefa.responsavel.id).toBe(colaboradora.id);
    }
  });
});

describe('o mini relatorio e obrigatorio', () => {
  async function tarefaAbertaDa(sessao: Sessao) {
    const resposta = await request(app)
      .get('/api/tasks?filtro=abertas&minhas=true')
      .set('Authorization', `Bearer ${sessao.token}`);
    return resposta.body.data[0];
  }

  it('recusa um relatorio com menos caracteres do que o minimo', async () => {
    const tarefa = await tarefaAbertaDa(colaboradora);
    expect(tarefa, 'a Colaboradora devia ter tarefas abertas').toBeTruthy();

    const resposta = await request(app)
      .post(`/api/tasks/${tarefa.id}/complete`)
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({ situacao: 'sem_obstaculos', texto: 'Feito.', esforcoRealHoras: 3 });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('VALIDACAO');
  });

  it('nao deixa fechar uma tarefa por mudanca de estado', async () => {
    const tarefa = await tarefaAbertaDa(colaboradora);

    const resposta = await request(app)
      .patch(`/api/tasks/${tarefa.id}`)
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({ estado: 'concluida' });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.code).toBe('RELATORIO_OBRIGATORIO');
  });

  it('so o responsavel pode dar a tarefa por cumprida', async () => {
    const tarefa = await tarefaAbertaDa(colaboradora);

    const resposta = await request(app)
      .post(`/api/tasks/${tarefa.id}/complete`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        situacao: 'sem_obstaculos',
        texto: 'A Direcção a fechar uma tarefa que não é sua, o que não deve passar.',
        esforcoRealHoras: 2,
      });

    expect(resposta.status).toBe(403);
  });

  it('fecha a tarefa e cria o relatorio na mesma operacao', async () => {
    const tarefa = await tarefaAbertaDa(colaboradora);
    const texto =
      'Levantamento fechado nas quatro unidades. Falta apenas a confirmação do fluxo de compras da Matola, que proponho normalizar já na fase de desenho.';
    expect(texto.length).toBeGreaterThanOrEqual(MIN_CARACTERES_RELATORIO);

    const resposta = await request(app)
      .post(`/api/tasks/${tarefa.id}/complete`)
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({ situacao: 'com_obstaculo', texto, esforcoRealHoras: 9 });

    expect(resposta.status).toBe(200);
    expect(resposta.body.data.tarefa.estado).toBe('concluida');
    expect(resposta.body.data.relatorio.validacao).toBe('a_espera');

    // O relatorio tem de aparecer no feed da Direccao.
    const feed = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${direccao.token}`);
    const encontrado = feed.body.data.relatorios.find(
      (r: { tarefa: { id: string } }) => r.tarefa.id === tarefa.id,
    );
    expect(encontrado).toBeTruthy();
    expect(encontrado.texto).toBe(texto);
  });

  it('recusa fechar duas vezes a mesma tarefa', async () => {
    const concluidas = await request(app)
      .get('/api/tasks?filtro=concluidas&minhas=true')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    const tarefa = concluidas.body.data[0];

    const resposta = await request(app)
      .post(`/api/tasks/${tarefa.id}/complete`)
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({
        situacao: 'sem_obstaculos',
        texto: 'Uma segunda tentativa de fechar a mesma tarefa, que deve ser recusada.',
        esforcoRealHoras: 1,
      });

    expect(resposta.status).toBe(409);
  });
});

describe('atribuicao de tarefas', () => {
  it('recusa uma deadline anterior a hoje', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = projectos.body.data.projectos[0];
    const ontem = somarDias(hoje(), -1).toISOString().slice(0, 10);

    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        titulo: 'Tarefa com prazo no passado',
        projectoId: projecto.id,
        responsavelId: colaboradora.id,
        deadline: ontem,
      });

    expect(resposta.status).toBe(422);
    expect(resposta.body.error.fields?.deadline).toContain('anterior a hoje');
  });

  it('recusa um titulo demasiado curto para ser verificavel', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = projectos.body.data.projectos[0];

    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        titulo: 'ok',
        projectoId: projecto.id,
        responsavelId: colaboradora.id,
        deadline: somarDias(hoje(), 5).toISOString().slice(0, 10),
      });

    expect(resposta.status).toBe(422);
  });

  it('atribui e devolve a tarefa nova', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = projectos.body.data.projectos[0];
    const prazo = somarDias(hoje(), 10);

    const resposta = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        titulo: `Conferir apólices em atraso ${formatarData(prazo)}`,
        descricao: 'Lista assinada pelo responsável de área',
        projectoId: projecto.id,
        responsavelId: colaboradora.id,
        deadline: prazo.toISOString().slice(0, 10),
        esforcoEstimadoHoras: 16,
        prioridade: 'critica',
        antecedenciaAlerta: 3,
        exigeRelatorio: true,
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.data.estado).toBe('pendente');
    expect(resposta.body.data.exigeRelatorio).toBe(true);
  });
});

describe('roteiro', () => {
  it('reencadeia as fases com dois dias entre elas ao gravar', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = projectos.body.data.projectos[0];

    const resposta = await request(app)
      .put(`/api/projects/${projecto.id}/phases`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        inicio: '2026-09-01',
        fases: [
          { nome: 'Arranque', estado: 'em_curso', nota: '', semanas: 2 },
          { nome: 'Execução', estado: 'planeada', nota: '', semanas: 3 },
        ],
      });

    expect(resposta.status).toBe(200);
    const [primeira, segunda] = resposta.body.data;

    // 2 semanas = 12 dias de duracao; a seguinte comeca dois dias depois do fim.
    // As colunas de dia viajam como ISO completo a meia-noite UTC; o que interessa e o dia.
    expect(dia(primeira.startsOn)).toBe('2026-09-01');
    expect(dia(primeira.endsOn)).toBe('2026-09-13');
    expect(dia(segunda.startsOn)).toBe('2026-09-15');
  });

  it('repoe o plano original depois de arrastar uma fase', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = projectos.body.data.projectos[1];

    const fases = await request(app)
      .get(`/api/projects/${projecto.id}/phases`)
      .set('Authorization', `Bearer ${direccao.token}`);
    const fase = fases.body.data[0];
    const originalInicio = fase.startsOn;

    const movida = await request(app)
      .patch(`/api/phases/${fase.id}/schedule`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({ startsOn: '2026-10-05', endsOn: '2026-10-20' });
    expect(movida.status).toBe(200);
    expect(dia(movida.body.data.startsOn)).toBe('2026-10-05');

    const reposto = await request(app)
      .post(`/api/projects/${projecto.id}/phases/reset`)
      .set('Authorization', `Bearer ${direccao.token}`);
    expect(reposto.status).toBe(200);
    expect(dia(reposto.body.data[0].startsOn)).toBe(dia(originalInicio));
  });

  it('a Colaboradora nao pode arrastar fases', async () => {
    const projectos = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${colaboradora.token}`);
    const projecto = projectos.body.data.projectos[0];
    const fases = await request(app)
      .get(`/api/projects/${projecto.id}/phases`)
      .set('Authorization', `Bearer ${colaboradora.token}`);

    const resposta = await request(app)
      .patch(`/api/phases/${fases.body.data[0].id}/schedule`)
      .set('Authorization', `Bearer ${colaboradora.token}`)
      .send({ startsOn: '2026-10-05', endsOn: '2026-10-20' });

    expect(resposta.status).toBe(403);
  });
});

describe('painel', () => {
  it('calcula a faixa de foco a partir dos dados', async () => {
    const resposta = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${direccao.token}`);

    expect(resposta.status).toBe(200);
    const dados = resposta.body.data;

    expect(dados.foco.titulo).toBeTruthy();
    expect(dados.foco.nota).toBeTruthy();
    expect(dados.decisoes.length).toBeLessThanOrEqual(20);
    expect(typeof dados.decisoesTotal).toBe('number');
    expect(dados.decisoesTotal).toBeGreaterThanOrEqual(dados.decisoes.length);
    expect(typeof dados.resumo.avancoMedio).toBe('number');

    // Cada decisao traz o seu alerta ja calculado, com texto, cores e idade na fila.
    for (const decisao of dados.decisoes) {
      expect(decisao.alerta.texto).toBeTruthy();
      expect(decisao.alerta.nivel).toBeTruthy();
      expect(typeof decisao.idadeDias).toBe('number');
      expect(decisao.idadeDias).toBeGreaterThanOrEqual(0);
    }
  });

  it('grava o juizo de avanco no PATCH do projecto', async () => {
    const lista = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${direccao.token}`);
    const projecto = lista.body.data.projectos[0] as { id: string; avancoPct: number };
    expect(projecto).toBeTruthy();

    const recusa = await request(app)
      .patch(`/api/projects/${projecto.id}`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({ avancoPct: 101 });
    expect(recusa.status).toBe(400);

    const novo = projecto.avancoPct === 62 ? 63 : 62;
    const resposta = await request(app)
      .patch(`/api/projects/${projecto.id}`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({ avancoPct: novo });
    expect(resposta.status).toBe(200);
    expect(resposta.body.data.avancoPct).toBe(novo);

    await request(app)
      .patch(`/api/projects/${projecto.id}`)
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({ avancoPct: projecto.avancoPct });
  });
});

describe('equipa', () => {
  it('deriva carga e cumprimento das tarefas', async () => {
    const resposta = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${direccao.token}`);

    expect(resposta.status).toBe(200);
    for (const pessoa of resposta.body.data) {
      expect(typeof pessoa.carga).toBe('number');
      expect(pessoa.cumprimento === null || typeof pessoa.cumprimento === 'number').toBe(true);
    }
  });

  it('recusa criar um membro com email ja registado', async () => {
    const resposta = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${direccao.token}`)
      .send({
        nome: 'Duplicada Silva',
        email: 'claudia.bila@nexora.co.mz',
        funcao: 'Analista',
        departamento: 'Consultoria',
        dataEntrada: '2026-09-01',
        alocacao: 100,
        nivelAcesso: 'colaborador',
      });

    expect(resposta.status).toBe(409);
    expect(resposta.body.error.code).toBe('EMAIL_EM_USO');
  });
});
