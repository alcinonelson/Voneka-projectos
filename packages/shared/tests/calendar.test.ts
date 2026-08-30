import { describe, expect, it } from 'vitest';
import {
  dataCurta,
  dataDeOffset,
  dataExtensa,
  dataLonga,
  ehFimDeSemana,
  emailValido,
  formatarData,
  formatarMetical,
  iniciais,
  lerData,
  lerMetical,
  percentagemConsumida,
} from '../src/index';

const HOJE = dataDeOffset(59);

describe('formatos de data', () => {
  it('escreve a data curta como no design', () => {
    expect(dataCurta(HOJE)).toBe('29 Ago');
    expect(dataCurta(dataDeOffset(0))).toBe('1 Jul');
  });

  it('escreve a data longa com o dia da semana abreviado', () => {
    expect(dataLonga(HOJE)).toBe('Sáb, 29 Agosto');
  });

  it('escreve a data extensa da faixa de foco do painel', () => {
    expect(dataExtensa(HOJE)).toBe('Sábado, 29 de Agosto de 2026');
  });

  it('escreve a data de formulario com zeros a esquerda', () => {
    expect(formatarData(dataDeOffset(0))).toBe('01/07/2026');
    expect(formatarData(HOJE)).toBe('29/08/2026');
  });

  it('reconhece o fim de semana, que o roteiro sombreia na vista diaria', () => {
    expect(ehFimDeSemana(HOJE)).toBe(true);
    expect(ehFimDeSemana(dataDeOffset(60))).toBe(true);
    expect(ehFimDeSemana(dataDeOffset(61))).toBe(false);
  });
});

describe('leitura de datas escritas por pessoas', () => {
  it('aceita o formato dd/mm/aaaa', () => {
    expect(formatarData(lerData('29/08/2026')!)).toBe('29/08/2026');
    expect(formatarData(lerData('1/9/2026')!)).toBe('01/09/2026');
  });

  it('recusa formatos que nao sao data', () => {
    expect(lerData('')).toBeNull();
    expect(lerData('amanhã')).toBeNull();
    expect(lerData('2026-08-29')).toBeNull();
  });

  it('recusa datas que nao existem em vez de as deixar escorregar', () => {
    expect(lerData('31/02/2026')).toBeNull();
    expect(lerData('32/01/2026')).toBeNull();
    expect(lerData('29/13/2026')).toBeNull();
  });

  it('aceita o 29 de Fevereiro apenas em ano bissexto', () => {
    expect(lerData('29/02/2024')).not.toBeNull();
    expect(lerData('29/02/2026')).toBeNull();
  });
});

describe('email e iniciais', () => {
  it('valida o email que serve de credencial', () => {
    expect(emailValido('claudia.bila@nexora.co.mz')).toBe(true);
    expect(emailValido('claudia.bila@nexora')).toBe(false);
    expect(emailValido('sem arroba')).toBe(false);
    expect(emailValido('')).toBe(false);
  });

  it('reduz um nome a duas iniciais', () => {
    expect(iniciais('Cláudia Bila')).toBe('CB');
    expect(iniciais('Ivete Macuácua')).toBe('IM');
    expect(iniciais('Alcino Maido Nelson')).toBe('AM');
    expect(iniciais('Jorge')).toBe('J');
  });
});

describe('metical', () => {
  it('formata com o separador de milhares do design', () => {
    expect(formatarMetical(420_000_000)).toBe('4 200 000 MT');
    expect(formatarMetical(86_000_000)).toBe('860 000 MT');
    expect(formatarMetical(0)).toBe('0 MT');
  });

  it('mostra um travessao quando nao ha orcamento definido', () => {
    expect(formatarMetical(null)).toBe('—');
    expect(formatarMetical(undefined)).toBe('—');
  });

  it('le valores escritos de varias maneiras', () => {
    expect(lerMetical('4 200 000')).toBe(420_000_000);
    expect(lerMetical('4.200.000 MT')).toBe(420_000_000);
    expect(lerMetical('1900000')).toBe(190_000_000);
    expect(lerMetical('sem valor')).toBeNull();
  });

  it('calcula a percentagem consumida e protege-se do orcamento zero', () => {
    expect(percentagemConsumida(420_000_000, 256_200_000)).toBe(61);
    expect(percentagemConsumida(0, 100)).toBeNull();
    expect(percentagemConsumida(null, 100)).toBeNull();
  });
});
