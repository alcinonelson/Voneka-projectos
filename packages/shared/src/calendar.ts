/**
 * Calendario do dominio, em portugues de Mocambique.
 *
 * Todo o calculo de datas corre em UTC a meia-noite. As deadlines e as fases sao dias, nao
 * instantes: guardar hora local abriria a porta a um projecto mudar de dia conforme o fuso de
 * quem consulta, e a um alerta de prazo saltar um escalao por causa da hora de verao.
 *
 * A ancora `BASE_ROTEIRO` e o offset inteiro vem do design, onde as datas eram deslocamentos em
 * dias a partir de 1 de Julho de 2026. Aqui servem apenas para semear e para posicionar barras
 * no roteiro; a base de dados guarda datas reais.
 */

export const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const DIAS_LONGOS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
] as const;

const MS_POR_DIA = 86_400_000;

/** Inicio do roteiro do design: 1 de Julho de 2026. Offset 0. */
export const BASE_ROTEIRO = Date.UTC(2026, 6, 1);

/** Duracao da janela do roteiro, em dias: Julho a Dezembro de 2026. */
export const DIAS_ROTEIRO = 184;

/** Converte um offset em dias desde `BASE_ROTEIRO` numa data UTC. */
export function dataDeOffset(offset: number): Date {
  return new Date(BASE_ROTEIRO + offset * MS_POR_DIA);
}

/** Converte uma data no seu offset em dias desde `BASE_ROTEIRO`. */
export function offsetDeData(data: Date): number {
  return Math.round((inicioDoDia(data).getTime() - BASE_ROTEIRO) / MS_POR_DIA);
}

/** Normaliza uma data para a meia-noite UTC do seu dia. */
export function inicioDoDia(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
}

/** Hoje, a meia-noite UTC. */
export function hoje(): Date {
  return inicioDoDia(new Date());
}

/** Dias inteiros de `de` ate `ate`. Positivo quando `ate` esta no futuro. */
export function diferencaEmDias(de: Date, ate: Date): number {
  return Math.round((inicioDoDia(ate).getTime() - inicioDoDia(de).getTime()) / MS_POR_DIA);
}

/** Soma dias a uma data, devolvendo uma nova data. */
export function somarDias(data: Date, dias: number): Date {
  return new Date(inicioDoDia(data).getTime() + dias * MS_POR_DIA);
}

/** Verdadeiro para sabado e domingo. O roteiro sombreia estes dias na vista diaria. */
export function ehFimDeSemana(data: Date): boolean {
  const dia = data.getUTCDay();
  return dia === 0 || dia === 6;
}

/** Formato curto: `29 Ago`. */
export function dataCurta(data: Date): string {
  return `${data.getUTCDate()} ${MESES[data.getUTCMonth()]}`;
}

/** Formato longo: `Sáb, 29 Agosto`. */
export function dataLonga(data: Date): string {
  return `${DIAS[data.getUTCDay()]}, ${data.getUTCDate()} ${MESES_LONGOS[data.getUTCMonth()]}`;
}

/** Formato extenso, para a faixa de foco do painel: `Sábado, 29 de Agosto de 2026`. */
export function dataExtensa(data: Date): string {
  const diaSemana = DIAS_LONGOS[data.getUTCDay()];
  const mes = MESES_LONGOS[data.getUTCMonth()];
  return `${diaSemana}, ${data.getUTCDate()} de ${mes} de ${data.getUTCFullYear()}`;
}

/** Formato de campo de formulario: `dd/mm/aaaa`. */
export function formatarData(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getUTCFullYear()}`;
}

/** Formato ISO de dia, para colunas `date` do Postgres: `2026-08-29`. */
export function paraIso(data: Date): string {
  return inicioDoDia(data).toISOString().slice(0, 10);
}

/** Le uma data ISO de dia vinda da base de dados. */
export function deIso(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1));
}

const PADRAO_DATA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/**
 * Le uma data escrita como `dd/mm/aaaa`. Devolve `null` se o formato nao bater ou se a data nao
 * existir no calendario. Portado de `dataOk` e `dataParaOff` do design, com a verificacao
 * adicional de que 31/02/2026 e recusado em vez de escorregar para Marco.
 */
export function lerData(texto: string): Date | null {
  const m = PADRAO_DATA.exec((texto ?? '').trim());
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return data;
}

const PADRAO_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Portado de `emailOk` do design. O email e a credencial de acesso. */
export function emailValido(texto: string): boolean {
  return PADRAO_EMAIL.test((texto ?? '').trim());
}

/** Iniciais de um nome, no maximo duas. Portado de `ini` do design. */
export function iniciais(nome: string): string {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .map((palavra) => palavra[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
