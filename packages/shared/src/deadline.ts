/**
 * Alertas de prazo.
 *
 * Portado de `alerta(dl, estado)` em `NEXORA Projectos.dc.html`. Esta funcao aparece em quatro
 * sitios do interface - tarefas, carteira, gaveta e painel - e alimenta tambem o job de
 * notificacoes. Existe uma so vez, aqui.
 *
 * Uma correccao face ao design: o escalao de atraso dizia sempre `N dias em atraso`, o que dava
 * `1 dias em atraso`. Aqui o singular esta correcto. Nenhum valor semeado cai neste caso, por
 * isso a comparacao lado a lado com o design mantem-se identica.
 */

import { COR } from './palette';
import { diferencaEmDias, hoje as hojeUtc } from './calendar';

/** Escalao do alerta, para uso programatico: ordenacao, notificacoes, agregados do painel. */
export type NivelAlerta = 'cumprida' | 'atraso' | 'hoje' | 'iminente' | 'proximo' | 'distante';

export interface Alerta {
  /** Texto mostrado na etiqueta. */
  texto: string;
  /** Cor do texto da etiqueta. */
  fg: string;
  /** Fundo da etiqueta. */
  bg: string;
  /** Cor do tracinho de semaforo que acompanha a linha. */
  cor: string;
  /** Dias ate a deadline. Negativo quando ja passou. */
  dias: number;
  nivel: NivelAlerta;
}

/**
 * Calcula o alerta de prazo de uma deadline.
 *
 * @param deadline data limite
 * @param concluida se a tarefa ou fase ja foi cumprida - nesse caso o prazo deixa de contar
 * @param referencia dia de referencia; por omissao, hoje. Injectavel para testes e para o job
 */
export function alertaPrazo(deadline: Date, concluida = false, referencia?: Date): Alerta {
  const base = referencia ?? hojeUtc();
  const dias = diferencaEmDias(base, deadline);

  if (concluida) {
    return {
      texto: 'Cumprida',
      fg: COR.verde,
      bg: COR.verdeFundo,
      cor: COR.verdeVivo,
      dias,
      nivel: 'cumprida',
    };
  }

  if (dias < 0) {
    const atraso = -dias;
    return {
      texto: atraso === 1 ? '1 dia em atraso' : `${atraso} dias em atraso`,
      fg: COR.branco,
      bg: COR.vermelhoCheio,
      cor: COR.vermelhoVivo,
      dias,
      nivel: 'atraso',
    };
  }

  if (dias === 0) {
    return {
      texto: 'Vence hoje',
      fg: COR.vermelho,
      bg: COR.vermelhoFundo,
      cor: COR.vermelhoVivo,
      dias,
      nivel: 'hoje',
    };
  }

  if (dias <= 2) {
    return {
      texto: dias === 1 ? 'Vence amanhã' : 'Faltam 2 dias',
      fg: COR.ambar,
      bg: COR.ambarFundo,
      cor: COR.ambarVivo,
      dias,
      nivel: 'iminente',
    };
  }

  if (dias <= 7) {
    return {
      texto: `Faltam ${dias} dias`,
      fg: COR.texto,
      bg: COR.linha,
      cor: COR.suave,
      dias,
      nivel: 'proximo',
    };
  }

  return {
    texto: `em ${dias} dias`,
    fg: COR.suave,
    bg: 'transparent',
    cor: COR.bordaForte,
    dias,
    nivel: 'distante',
  };
}

/**
 * Verdadeiro quando uma tarefa em aberto ja passou da deadline.
 * Usado para reclassificar tarefas como atrasadas sem depender de um campo escrito a mao.
 */
export function estaAtrasada(deadline: Date, concluida: boolean, referencia?: Date): boolean {
  if (concluida) return false;
  return diferencaEmDias(referencia ?? hojeUtc(), deadline) < 0;
}

/**
 * Verdadeiro quando uma tarefa deve gerar notificacao hoje, dada a antecedencia escolhida.
 *
 * Notifica no dia exacto em que faltam `antecedencia` dias, no proprio dia do vencimento, e em
 * cada dia de atraso enquanto a tarefa continuar aberta - o atraso e o unico caso em que insistir
 * se justifica, porque e o unico que piora sozinho.
 */
export function deveNotificar(
  deadline: Date,
  antecedencia: number,
  concluida: boolean,
  referencia?: Date,
): boolean {
  if (concluida || antecedencia <= 0) return false;
  const dias = diferencaEmDias(referencia ?? hojeUtc(), deadline);
  if (dias < 0) return true;
  return dias === 0 || dias === antecedencia;
}
