import { describe, expect, it } from 'vitest';
import { listarRelatoriosSchema, listarTarefasSchema, zBooleanoQuery } from '../src';

/**
 * `z.coerce.boolean()` lia `?minhas=false` como verdadeiro, e a Direccao via "Tarefas" e
 * "Relatorios" vazios. Fixa-se aqui a leitura certa de uma query string.
 */
describe('booleano de query string', () => {
  it('so true e 1 sao verdade', () => {
    expect(zBooleanoQuery.parse('true')).toBe(true);
    expect(zBooleanoQuery.parse('1')).toBe(true);
    expect(zBooleanoQuery.parse(true)).toBe(true);
    expect(zBooleanoQuery.parse('false')).toBe(false);
    expect(zBooleanoQuery.parse('0')).toBe(false);
    expect(zBooleanoQuery.parse('')).toBe(false);
    expect(zBooleanoQuery.parse(false)).toBe(false);
  });

  it('recusa o que nao e booleano, em vez de o ler como verdade', () => {
    expect(zBooleanoQuery.safeParse('sim').success).toBe(false);
  });

  it('as listagens leem minhas=false e meus=false como falso', () => {
    expect(listarTarefasSchema.parse({ minhas: 'false' }).minhas).toBe(false);
    expect(listarTarefasSchema.parse({}).minhas).toBe(false);
    expect(listarRelatoriosSchema.parse({ meus: 'false' }).meus).toBe(false);
    expect(listarRelatoriosSchema.parse({ meus: 'true' }).meus).toBe(true);
  });
});
