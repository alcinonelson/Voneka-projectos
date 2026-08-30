import { useEffect, useRef, useState } from 'react';

/**
 * Revela um elemento quando ele entra no ecra.
 *
 * Usa `IntersectionObserver`, que o navegador ja traz - uma biblioteca de animacao para isto seria
 * carregar cem kilobytes para fazer uma classe mudar.
 *
 * Revela **uma vez** e desliga-se. Um elemento que desaparece ao sair do ecra e volta a entrar
 * transforma a leitura num pisca-pisca, e quem esta a reler um paragrafo nao quer que ele fuja.
 *
 * Quem pediu menos movimento comeca ja revelado: o conteudo aparece de imediato, sem transicao.
 * A alternativa - nao revelar - deixaria metade da pagina invisivel, que e pior do que a animacao
 * que se quis evitar.
 */
export function useRevelar<T extends HTMLElement = HTMLDivElement>(margem = '0px 0px -12% 0px') {
  const referencia = useRef<T | null>(null);
  const [visivel, setVisivel] = useState(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (visivel) return;
    const no = referencia.current;
    if (!no) return;

    // Sem suporte a IntersectionObserver, mostra-se tudo em vez de esconder tudo.
    if (typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            setVisivel(true);
            observador.disconnect();
          }
        }
      },
      { rootMargin: margem, threshold: 0.08 },
    );

    observador.observe(no);
    return () => observador.disconnect();
  }, [visivel, margem]);

  return { referencia, visivel };
}

/** Verdadeiro quando o sistema pede menos movimento. Lido uma vez, no arranque. */
export function menosMovimento(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
