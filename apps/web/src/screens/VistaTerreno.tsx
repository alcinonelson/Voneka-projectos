import { useEffect, useState } from 'react';
import { ESTADO_TAREFA, alertaPrazo, corEstado, dataLonga } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, cartao, numerico } from '../design/tokens';
import { Carregando, Etiqueta, Marca, PastilhaAlerta, Semaforo, Vazio } from '../components/base';
import { ModalRelatorio } from '../components/ModalRelatorio';
import { useSessao } from '../lib/auth';
import { useTarefas } from '../lib/queries';
import type { Tarefa } from '../lib/tipos';

/** Abaixo desta largura a aplicacao passa para a vista de terreno. */
export const LARGURA_TERRENO = 900;

/** Verdadeiro quando o ecra e estreito. Acompanha a rotacao do aparelho. */
export function useEcraEstreito(): boolean {
  const [estreito, setEstreito] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < LARGURA_TERRENO,
  );

  useEffect(() => {
    const consulta = window.matchMedia(`(max-width: ${LARGURA_TERRENO - 1}px)`);
    const aoMudar = (e: MediaQueryListEvent) => setEstreito(e.matches);
    setEstreito(consulta.matches);
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return estreito;
}

/**
 * Vista de terreno.
 *
 * Pensada para reportar a partir do local de trabalho, no telemovel. Nao e a aplicacao encolhida:
 * e a parte dela que faz sentido de pe, com uma mao - ver o que tenho, abrir a tarefa, escrever o
 * relatorio. A carteira, o roteiro e a tabela de acessos ficam de fora de proposito; sao trabalho
 * de secretaria e nao cabem honestamente num ecra de cinco polegadas.
 */
export function VistaTerreno() {
  const { utilizador, sair } = useSessao();
  const { data: tarefas, isLoading } = useTarefas('todas', true);
  const [aConcluir, setAConcluir] = useState<Tarefa | null>(null);

  const abertas = (tarefas ?? []).filter((t) => t.estado !== 'concluida');
  const atrasadas = abertas.filter((t) => t.estado === 'atrasada');

  return (
    <div style={{ minHeight: '100vh', background: COR.fundo, paddingBottom: 32 }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: COR.branco,
          borderBottom: `1px solid ${COR.borda}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Marca tamanho={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: FONTE.corpo, fontWeight: PESO.forte }}>Terreno</div>
          <div style={{ fontSize: FONTE.minima, color: COR.suave }}>{utilizador?.nome}</div>
        </div>
        <button
          type="button"
          onClick={() => void sair()}
          style={{
            border: `1px solid ${COR.borda}`,
            background: COR.branco,
            borderRadius: RAIO.botao,
            padding: '6px 10px',
            fontSize: FONTE.minima,
            color: COR.texto,
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </header>

      <div style={{ padding: 16 }}>
        <div style={{ ...cartao, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: PESO.forte, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
            {atrasadas.length
              ? `${abertas.length} ${abertas.length === 1 ? 'tarefa sua' : 'tarefas suas'}, ${atrasadas.length} fora de prazo.`
              : `${abertas.length} ${abertas.length === 1 ? 'tarefa sua' : 'tarefas suas'}, nenhuma fora de prazo.`}
          </div>
          <div style={{ fontSize: FONTE.corpo, color: COR.textoSuave, marginTop: 8, lineHeight: 1.6 }}>
            Ao assinalar cumprida escreve o relatório da situação. É o que a Direcção lê.
          </div>
        </div>

        {isLoading ? (
          <Carregando />
        ) : !abertas.length ? (
          <Vazio style={{ ...cartao, padding: 32 }}>Não tem tarefas em aberto.</Vazio>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {abertas.map((t) => {
              const alerta = alertaPrazo(t.deadline, false);
              const estado = corEstado(t.estado);

              return (
                <article key={t.id} style={{ ...cartao, padding: 16 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                    <Semaforo cor={alerta.cor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FONTE.media, fontWeight: PESO.medio, lineHeight: 1.4 }}>
                        {t.titulo}
                      </div>
                      <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 5 }}>
                        {t.projecto.nome}
                      </div>
                    </div>
                  </div>

                  {t.descricao ? (
                    <p style={{ fontSize: FONTE.corpo, color: COR.texto, lineHeight: 1.6, margin: '0 0 12px' }}>
                      {t.descricao}
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <Etiqueta fg={estado.fg} bg={estado.bg}>
                      {ESTADO_TAREFA[t.estado]}
                    </Etiqueta>
                    <PastilhaAlerta alerta={alerta} pequena />
                    <span style={{ fontSize: FONTE.minima, color: COR.suave, ...numerico }}>
                      vence {dataLonga(t.deadline)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAConcluir(t)}
                    style={{
                      ...botaoPrincipal,
                      width: '100%',
                      // Alvo de toque confortavel: 44px e o minimo para o polegar.
                      height: 44,
                      justifyContent: 'center',
                      fontSize: FONTE.base,
                    }}
                  >
                    Assinalar cumprida
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ModalRelatorio tarefa={aConcluir} onFechar={() => setAConcluir(null)} />
    </div>
  );
}
