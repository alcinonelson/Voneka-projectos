import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { COR, FONTE, PESO, RAIO, SOMBRA } from '../design/tokens';

/**
 * Confirmacao breve de uma accao.
 *
 * A mensagem diz o que ficou feito, com o dado concreto - "Tarefa atribuída a Cláudia Bila ·
 * deadline 2 Set" - e nao um "Guardado com sucesso". Quem acabou de gravar quer confirmar que
 * gravou o que queria, nao que o sistema funcionou.
 */

interface Toast {
  mostrar: (mensagem: string) => void;
}

const Contexto = createContext<Toast | null>(null);

const DURACAO_MS = 2600;

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState('');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setMensagem(texto);
    temporizador.current = setTimeout(() => setMensagem(''), DURACAO_MS);
  }, []);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  return (
    <Contexto.Provider value={{ mostrar }}>
      {children}
      {mensagem ? (
        <div
          // `polite` e nao `assertive`: e uma confirmacao, nao um alarme, e nao deve interromper
          // quem estiver a usar um leitor de ecra a meio de outra coisa.
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            maxWidth: 560,
            padding: '11px 18px',
            background: COR.tinta,
            color: COR.branco,
            borderRadius: RAIO.medio,
            fontSize: FONTE.corpo,
            fontWeight: PESO.medio,
            boxShadow: SOMBRA.modal,
            animation: 'nx-toast .2s ease',
          }}
        >
          {mensagem}
        </div>
      ) : null}
    </Contexto.Provider>
  );
}

export function useToast(): Toast {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useToast tem de ser usado dentro de ProvedorToast.');
  return contexto;
}
