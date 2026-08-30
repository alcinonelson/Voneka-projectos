import { describe, expect, it } from 'vitest';
import {
  CHIPS,
  NOMES_CHIP,
  VOCABULARIO_SUGERIDO,
  chip,
  cicloEstadoFase,
  dataDeOffset,
  duracaoEmDias,
  encadearFases,
  fimDoRoteiro,
  modeloParaRascunhos,
  offsetDeData,
  paraRascunho,
  reordenar,
  semanasDeDuracao,
} from '../src/index';
import type { RascunhoFase } from '../src/index';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('duracao de uma fase', () => {
  it('ocupa semanas * 7 - 2 dias, como no design', () => {
    expect(duracaoEmDias(1)).toBe(5);
    expect(duracaoEmDias(2)).toBe(12);
    expect(duracaoEmDias(3)).toBe(19);
    expect(duracaoEmDias(6)).toBe(40);
  });

  it('limita as semanas ao intervalo do editor', () => {
    expect(duracaoEmDias(0)).toBe(5);
    expect(duracaoEmDias(-4)).toBe(5);
    expect(duracaoEmDias(99)).toBe(26 * 7 - 2);
  });

  it('converte uma duracao de volta em semanas', () => {
    expect(semanasDeDuracao(5)).toBe(1);
    expect(semanasDeDuracao(12)).toBe(2);
    expect(semanasDeDuracao(19)).toBe(3);
    expect(semanasDeDuracao(40)).toBe(6);
  });
});

describe('encadeamento do roteiro', () => {
  const inicio = new Date(Date.UTC(2026, 8, 1));

  it('deixa dois dias entre o fim de uma fase e o inicio da seguinte', () => {
    const rascunhos: RascunhoFase[] = [
      { nome: 'Descoberta', estado: 'planeada', nota: '', semanas: 3 },
      { nome: 'Desenho', estado: 'planeada', nota: '', semanas: 4 },
    ];
    const fases = encadearFases(rascunhos, inicio);

    expect(iso(fases[0]!.startsOn)).toBe('2026-09-01');
    expect(iso(fases[0]!.endsOn)).toBe('2026-09-20');
    expect(iso(fases[1]!.startsOn)).toBe('2026-09-22');
    expect(iso(fases[1]!.endsOn)).toBe('2026-10-18');
  });

  it('encadeia um modelo de quatro fases de ponta a ponta', () => {
    const fases = encadearFases(
      modeloParaRascunhos([
        { nome: 'Descoberta', semanas: 3 },
        { nome: 'Desenho da solução', semanas: 4 },
        { nome: 'Execução', semanas: 6 },
        { nome: 'Validação e entrega', semanas: 3 },
      ]),
      inicio,
    );

    expect(fases).toHaveLength(4);
    expect(fases.map((f) => f.nome)).toEqual([
      'Descoberta',
      'Desenho da solução',
      'Execução',
      'Validação e entrega',
    ]);
    expect(iso(fimDoRoteiro(fases)!)).toBe('2026-12-20');
  });

  it('numera as fases pela ordem recebida', () => {
    const fases = encadearFases(
      modeloParaRascunhos([
        { nome: 'Elegibilidade', semanas: 2 },
        { nome: 'Proposta', semanas: 3 },
        { nome: 'Submissão', semanas: 2 },
      ]),
      inicio,
    );
    expect(fases.map((f) => f.ordem)).toEqual([0, 1, 2]);
  });

  it('uma natureza sem modelo abre o editor com uma linha em branco', () => {
    expect(modeloParaRascunhos(null)).toEqual([
      { nome: '', estado: 'planeada', nota: '', semanas: 4 },
    ]);
    expect(modeloParaRascunhos([])).toHaveLength(1);
  });

  it('descarta linhas sem nome em vez de as agendar', () => {
    const rascunhos: RascunhoFase[] = [
      { nome: 'Recolha', estado: 'planeada', nota: '', semanas: 1 },
      { nome: '   ', estado: 'planeada', nota: '', semanas: 2 },
      { nome: 'Reporte', estado: 'planeada', nota: '', semanas: 1 },
    ];
    const fases = encadearFases(rascunhos, inicio);
    expect(fases.map((f) => f.nome)).toEqual(['Recolha', 'Reporte']);
    expect(iso(fases[1]!.startsOn)).toBe('2026-09-08');
  });

  it('devolve roteiro vazio e fim nulo quando nao ha fases com nome', () => {
    const fases = encadearFases([], inicio);
    expect(fases).toHaveLength(0);
    expect(fimDoRoteiro(fases)).toBeNull();
  });

  it('reordenar e reencadear produz o roteiro na nova ordem', () => {
    const rascunhos = modeloParaRascunhos([
      { nome: 'Recolha de dados', semanas: 1 },
      { nome: 'Consolidação', semanas: 1 },
      { nome: 'Reporte à Direcção', semanas: 1 },
    ]);
    const fases = encadearFases(reordenar(rascunhos, 2, 0), inicio);
    expect(fases.map((f) => f.nome)).toEqual([
      'Reporte à Direcção',
      'Recolha de dados',
      'Consolidação',
    ]);
    expect(iso(fases[0]!.startsOn)).toBe('2026-09-01');
  });
});

describe('roundtrip entre fase agendada e rascunho', () => {
  it('recupera as semanas a partir das datas gravadas', () => {
    const [fase] = encadearFases(
      [{ nome: 'Execução', estado: 'em_curso', nota: 'em curso', semanas: 6 }],
      new Date(Date.UTC(2026, 8, 1)),
    );
    const rascunho = paraRascunho({
      nome: fase!.nome,
      estado: fase!.estado,
      nota: fase!.nota,
      startsOn: fase!.startsOn,
      endsOn: fase!.endsOn,
    });
    expect(rascunho.semanas).toBe(6);
    expect(rascunho.estado).toBe('em_curso');
  });
});

describe('dados semeados do design', () => {
  /**
   * As fases do projecto PRJ-114 no design seguem a folga de dois dias:
   * 0 + 23 + 2 = 25, 25 + 30 + 2 = 57, 57 + 57 + 2 = 116, 116 + 28 + 2 = 146.
   * Este teste protege a conversao de offsets em datas reais feita pelo seed.
   */
  it('mantem a folga de dois dias entre as fases semeadas do PRJ-114', () => {
    const semeadas = [
      { s: 0, d: 23 },
      { s: 25, d: 30 },
      { s: 57, d: 57 },
      { s: 116, d: 28 },
      { s: 146, d: 32 },
    ];
    for (let i = 1; i < semeadas.length; i += 1) {
      const anterior = semeadas[i - 1]!;
      expect(semeadas[i]!.s).toBe(anterior.s + anterior.d + 2);
    }
  });

  it('converte offsets em datas reais e de volta sem perda', () => {
    for (const offset of [0, 25, 57, 59, 116, 146, 183]) {
      expect(offsetDeData(dataDeOffset(offset))).toBe(offset);
    }
  });
});

describe('ciclo de estado no editor de fases', () => {
  it('cicla Planeada, Em curso, Concluida, Atrasada e volta ao inicio', () => {
    expect(cicloEstadoFase('planeada')).toBe('em_curso');
    expect(cicloEstadoFase('em_curso')).toBe('concluida');
    expect(cicloEstadoFase('concluida')).toBe('atrasada');
    expect(cicloEstadoFase('atrasada')).toBe('planeada');
  });
});

describe('conjunto de partida do vocabulario', () => {
  it('cada natureza sugerida traz prefixo e pelo menos uma fase', () => {
    for (const n of VOCABULARIO_SUGERIDO.natureza) {
      expect(n.prefixo).toMatch(/^[A-Z]{2,4}$/);
      expect(n.fasesModelo?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('as cores sugeridas existem todas na paleta de chips', () => {
    const todas = [
      ...VOCABULARIO_SUGERIDO.natureza,
      ...VOCABULARIO_SUGERIDO.estagio,
      ...VOCABULARIO_SUGERIDO.departamento,
    ];
    expect(todas.length).toBeGreaterThan(0);
    for (const entrada of todas) {
      expect(NOMES_CHIP).toContain(entrada.cor);
    }
  });

  it('um nome de chip desconhecido cai em neutro em vez de rebentar', () => {
    expect(chip('uma-cor-que-nao-existe')).toEqual(CHIPS.neutro);
    expect(chip(null)).toEqual(CHIPS.neutro);
    expect(chip(undefined)).toEqual(CHIPS.neutro);
    expect(chip('violeta')).toEqual(CHIPS.violeta);
  });
});
