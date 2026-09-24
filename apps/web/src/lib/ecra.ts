import { useEffect, useState } from 'react';
import { ECRA, type FaixaEcra } from '../design/tokens';

/**
 * A faixa de ecra em que a aplicacao esta a correr.
 *
 * Usa `matchMedia` e nao um ouvinte de `resize`: o navegador so avisa quando a resposta muda de
 * facto, em vez de a cada pixel de arrasto, e acompanha a rotacao do dispositivo sem codigo extra.
 *
 * O valor inicial e calculado na primeira pintura, para nao haver um salto de layout entre o que
 * se renderiza e o que se mede.
 *
 * Nem tudo o que e responsivo precisa disto: onde uma media query em CSS chega, e o CSS que deve
 * decidir. Este hook existe para o que so o JavaScript pode fazer - trocar de componente, mudar
 * de estrutura de dados, ligar ou desligar um comportamento.
 */
export function useFaixaEcra(): FaixaEcra {
  const [faixa, setFaixa] = useState<FaixaEcra>(() => medir());

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const movel = window.matchMedia(`(max-width: ${ECRA.movel - 1}px)`);
    const tablet = window.matchMedia(`(max-width: ${ECRA.tablet - 1}px)`);
    const aoMudar = () => setFaixa(medir());

    movel.addEventListener('change', aoMudar);
    tablet.addEventListener('change', aoMudar);
    aoMudar();

    return () => {
      movel.removeEventListener('change', aoMudar);
      tablet.removeEventListener('change', aoMudar);
    };
  }, []);

  return faixa;
}

function medir(): FaixaEcra {
  if (typeof window === 'undefined') return 'amplo';
  const largura = window.innerWidth;
  if (largura < ECRA.movel) return 'movel';
  if (largura < ECRA.tablet) return 'tablet';
  return 'amplo';
}

/** Atalhos de leitura, para os ecras nao repetirem a comparacao. */
export function useEhMovel(): boolean {
  return useFaixaEcra() === 'movel';
}

/** Verdadeiro em telemovel e em tablet: onde a barra lateral e uma gaveta. */
export function useEhEstreito(): boolean {
  return useFaixaEcra() !== 'amplo';
}

/**
 * Verdadeiro quando o ponteiro principal e grosso - um dedo, e nao um rato.
 *
 * Serve para decidir comportamento, nao aparencia: o tamanho dos alvos resolve-se em CSS com
 * `@media (pointer: coarse)`, que nao obriga a re-renderizar nada.
 */
export function usePonteiroGrosso(): boolean {
  const [grosso, setGrosso] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(pointer: coarse)').matches),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const consulta = window.matchMedia('(pointer: coarse)');
    const aoMudar = (e: MediaQueryListEvent) => setGrosso(e.matches);
    setGrosso(consulta.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return grosso;
}
