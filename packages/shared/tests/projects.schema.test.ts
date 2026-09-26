import { describe, expect, it } from 'vitest';
import { actualizarProjectoSchema } from '../src/schemas/projects.schema';

describe('actualizarProjectoSchema', () => {
  it('aceita o juizo de avanco entre 0 e 100 e recusa o resto', () => {
    expect(actualizarProjectoSchema.parse({ avancoPct: 0 }).avancoPct).toBe(0);
    expect(actualizarProjectoSchema.parse({ avancoPct: 100 }).avancoPct).toBe(100);
    expect(() => actualizarProjectoSchema.parse({ avancoPct: 101 })).toThrow();
    expect(() => actualizarProjectoSchema.parse({ avancoPct: -1 })).toThrow();
    expect(() => actualizarProjectoSchema.parse({ avancoPct: 12.5 })).toThrow();
  });
});
