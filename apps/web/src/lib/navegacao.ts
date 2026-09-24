import { COR, MARCA } from '../design/tokens';
import type { NomeIcone } from '../components/icones';
import { useSessao } from './auth';
import { useNotificacoes, useTarefas } from './queries';

/**
 * Os destinos de navegacao de cada nivel de acesso.
 *
 * Vivem aqui, e nao dentro do menu lateral, porque ha dois menus - a barra lateral e a barra
 * inferior do telemovel - e dois menus escritos em dois sitios divergem na primeira alteracao.
 *
 * Cada nivel tem a sua navegacao, e nao a mesma com itens escondidos: o colaborador nao tem uma
 * versao reduzida da carteira, tem outro trabalho.
 */

export interface Destino {
  para: string;
  rotulo: string;
  /** Rotulo curto para a barra inferior, onde cabem 10 a 12 caracteres. */
  curto?: string;
  icone: NomeIcone;
  distintivo?: number;
  /** O distintivo e um alarme (vermelho) e nao uma contagem neutra. */
  alarme?: boolean;
}

export interface GrupoDestinos {
  titulo: string;
  acento: string;
  destinos: Destino[];
}

/** Acentos por grupo, escolhidos pelo contraste sobre o fundo escuro do menu. */
export const ACENTO = {
  carteira: MARCA.verde,
  execucao: COR.ambarVivo,
  /** O violeta normal daria 3.24:1 sobre o fundo escuro; esta variante clara chega a 6.2:1. */
  empresa: '#C3B5FD',
  trabalho: MARCA.verde,
} as const;

export function useDestinos(): { grupos: GrupoDestinos[]; barra: Destino[] } {
  const { ehDireccao, ehAdministrador } = useSessao();

  const { data: atrasadas } = useTarefas('atrasadas', !ehDireccao);
  const { data: minhas } = useTarefas('abertas', true);
  const { data: avisos } = useNotificacoes();

  const painel: Destino = { para: '/painel', rotulo: 'Painel', icone: 'painel' };
  const projectos: Destino = { para: '/projectos', rotulo: 'Projectos', icone: 'projectos' };
  const roteiro: Destino = { para: '/roteiro', rotulo: 'Roteiro', icone: 'roteiro' };
  const tarefas: Destino = {
    para: '/tarefas',
    rotulo: 'Tarefas',
    icone: 'tarefas',
    distintivo: atrasadas?.length,
    alarme: true,
  };
  const relatorios: Destino = { para: '/relatorios', rotulo: 'Relatórios', icone: 'relatorios' };
  const aviso: Destino = { para: '/avisos', rotulo: 'Avisos', icone: 'avisos', distintivo: avisos?.porLer };

  const minhasTarefas: Destino = {
    para: '/minhas-tarefas',
    rotulo: 'As minhas tarefas',
    curto: 'Tarefas',
    icone: 'tarefas',
    distintivo: minhas?.length,
  };
  const meusProjectos: Destino = {
    para: '/meus-projectos',
    rotulo: 'Os meus projectos',
    curto: 'Projectos',
    icone: 'projectos',
  };
  const meusRelatorios: Destino = {
    para: '/meus-relatorios',
    rotulo: 'Os meus relatórios',
    curto: 'Relatórios',
    icone: 'relatorios',
  };

  if (ehDireccao) {
    const grupos: GrupoDestinos[] = [
      { titulo: 'Carteira', acento: ACENTO.carteira, destinos: [painel, projectos, roteiro] },
      { titulo: 'Execução', acento: ACENTO.execucao, destinos: [tarefas, relatorios, aviso] },
    ];
    if (ehAdministrador) {
      grupos.push({
        titulo: 'Empresa',
        acento: ACENTO.empresa,
        destinos: [
          { para: '/equipa', rotulo: 'Equipa e acessos', icone: 'equipa' },
          { para: '/vocabulario', rotulo: 'Vocabulário', icone: 'vocabulario' },
          { para: '/empresa', rotulo: 'Dados da empresa', icone: 'empresa' },
        ],
      });
    }
    // A barra inferior leva o que se abre todos os dias; o resto esta a um toque, em "Mais".
    return { grupos, barra: [painel, projectos, tarefas, aviso] };
  }

  return {
    grupos: [
      {
        titulo: 'O meu trabalho',
        acento: ACENTO.trabalho,
        destinos: [minhasTarefas, meusProjectos, meusRelatorios, aviso],
      },
      { titulo: 'Equipa', acento: ACENTO.carteira, destinos: [roteiro] },
    ],
    barra: [minhasTarefas, meusProjectos, meusRelatorios, aviso],
  };
}
