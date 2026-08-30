import { describe, expect, it } from 'vitest';
import { alertaPrazo, dataDeOffset, deveNotificar, estaAtrasada } from '../src/index';

/**
 * O dia de referencia do design: `BASE = 1 Jul 2026` mais `HOJE = 59` da 29 de Agosto de 2026.
 * Todos os offsets abaixo sao valores reais das tarefas semeadas em `NEXORA Projectos.dc.html`.
 */
const HOJE = dataDeOffset(59);

describe('ancora temporal do design', () => {
  it('o offset 59 e 29 de Agosto de 2026', () => {
    expect(HOJE.toISOString().slice(0, 10)).toBe('2026-08-29');
  });
});

describe('alertaPrazo - os cinco escaloes', () => {
  it('marca uma tarefa concluida como cumprida, independentemente do prazo', () => {
    const a = alertaPrazo(dataDeOffset(23), true, HOJE);
    expect(a.texto).toBe('Cumprida');
    expect(a.nivel).toBe('cumprida');
  });

  it('conta os dias de atraso - parecer fiscal do Grupo Madal, offset 48', () => {
    const a = alertaPrazo(dataDeOffset(48), false, HOJE);
    expect(a.texto).toBe('11 dias em atraso');
    expect(a.nivel).toBe('atraso');
    expect(a.fg).toBe('#FFFFFF');
    expect(a.bg).toBe('#D92D20');
  });

  it('conta os dias de atraso - digitalizacao da Costa Sul, offset 57', () => {
    expect(alertaPrazo(dataDeOffset(57), false, HOJE).texto).toBe('2 dias em atraso');
  });

  it('usa o singular a um dia de atraso, corrigindo o design', () => {
    expect(alertaPrazo(dataDeOffset(58), false, HOJE).texto).toBe('1 dia em atraso');
  });

  it('diz que vence hoje quando a deadline e o proprio dia', () => {
    const a = alertaPrazo(dataDeOffset(59), false, HOJE);
    expect(a.texto).toBe('Vence hoje');
    expect(a.nivel).toBe('hoje');
  });

  it('diz que vence amanha a um dia de distancia', () => {
    expect(alertaPrazo(dataDeOffset(60), false, HOJE).texto).toBe('Vence amanhã');
  });

  it('diz faltam 2 dias a dois dias de distancia', () => {
    const a = alertaPrazo(dataDeOffset(61), false, HOJE);
    expect(a.texto).toBe('Faltam 2 dias');
    expect(a.nivel).toBe('iminente');
  });

  it('conta os dias que faltam ate uma semana - decisao contabilistica, offset 63', () => {
    const a = alertaPrazo(dataDeOffset(63), false, HOJE);
    expect(a.texto).toBe('Faltam 4 dias');
    expect(a.nivel).toBe('proximo');
  });

  it('mantem faltam N dias no limite dos sete dias', () => {
    expect(alertaPrazo(dataDeOffset(66), false, HOJE).texto).toBe('Faltam 7 dias');
  });

  it('passa ao escalao distante a partir do oitavo dia', () => {
    const a = alertaPrazo(dataDeOffset(67), false, HOJE);
    expect(a.texto).toBe('em 8 dias');
    expect(a.nivel).toBe('distante');
    expect(a.bg).toBe('transparent');
  });
});

describe('estaAtrasada', () => {
  it('nao considera atrasada uma tarefa ja concluida', () => {
    expect(estaAtrasada(dataDeOffset(48), true, HOJE)).toBe(false);
  });

  it('considera atrasada uma tarefa aberta cuja deadline passou', () => {
    expect(estaAtrasada(dataDeOffset(48), false, HOJE)).toBe(true);
  });

  it('nao considera atrasada uma tarefa que vence hoje', () => {
    expect(estaAtrasada(dataDeOffset(59), false, HOJE)).toBe(false);
  });
});

describe('deveNotificar', () => {
  it('notifica no dia exacto da antecedencia escolhida', () => {
    expect(deveNotificar(dataDeOffset(62), 3, false, HOJE)).toBe(true);
  });

  it('nao notifica fora do dia da antecedencia', () => {
    expect(deveNotificar(dataDeOffset(63), 3, false, HOJE)).toBe(false);
  });

  it('notifica sempre no proprio dia do vencimento', () => {
    expect(deveNotificar(dataDeOffset(59), 7, false, HOJE)).toBe(true);
  });

  it('insiste todos os dias enquanto a tarefa estiver em atraso', () => {
    expect(deveNotificar(dataDeOffset(48), 3, false, HOJE)).toBe(true);
    expect(deveNotificar(dataDeOffset(58), 1, false, HOJE)).toBe(true);
  });

  it('cala-se quando a tarefa esta concluida ou o alerta esta desligado', () => {
    expect(deveNotificar(dataDeOffset(48), 3, true, HOJE)).toBe(false);
    expect(deveNotificar(dataDeOffset(48), 0, false, HOJE)).toBe(false);
  });
});
