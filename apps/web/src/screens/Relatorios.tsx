import { useState } from 'react';
import { SITUACAO, VALIDACAO, corSituacao } from '@nexora/shared';
import {
  COR,
  FONTE,
  PESO,
  RAIO,
  botaoSecundario,
  campo,
  cartao,
  numerico,
  tituloSeccao,
} from '../design/tokens';
import { Avatar, Carregando, Etiqueta, FalhaCarregar, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { useToast } from '../components/Toast';
import { ErroApi } from '../lib/api';
import { useRelatorios, useValidarRelatorio } from '../lib/queries';
import type { Relatorio } from '../lib/tipos';

/**
 * Feed dos mini relatorios.
 *
 * O texto integral aparece na lista, sem cortar nem esconder atras de um "ver mais". E o relato
 * que da o acompanhamento a Direccao; abrevia-lo para caber numa grelha seria trocar a substancia
 * pela arrumacao.
 */
export function Relatorios() {
  const { data, isLoading, isError } = useRelatorios();
  const validar = useValidarRelatorio();
  const toast = useToast();
  const [notas, setNotas] = useState<Record<string, string>>({});

  async function decidir(relatorio: Relatorio, decisao: 'validar' | 'escalar') {
    const observacao = (notas[relatorio.id] ?? '').trim();
    if (decisao === 'escalar' && !observacao) {
      toast.mostrar('Ao escalar, escreva o que precisa da Direcção.');
      return;
    }
    try {
      await validar.mutateAsync({ id: relatorio.id, dados: { decisao, observacao } });
      toast.mostrar(
        decisao === 'validar'
          ? `Entrega de ${relatorio.autor.nome} validada`
          : `Obstáculo de ${relatorio.autor.nome} escalado à Direcção`,
      );
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível decidir este relatório.');
    }
  }

  const tipologia = data?.tipologia;
  const leitura = (() => {
    if (!tipologia || tipologia.total === 0) return 'Nenhum relatório esta semana.';
    if (tipologia.comObstaculo === 0) {
      return `Os ${tipologia.total} relatórios desta semana foram entregues sem obstáculos. Nada depende de si.`;
    }
    return `${tipologia.comObstaculo} dos ${tipologia.total} relatórios desta semana trazem obstáculos. Vale a pena ler o texto de cada um antes da reunião de carteira.`;
  })();

  return (
    <Pagina
      acento={COR.ambarVivo}
      titulo="Relatórios de execução"
      subtitulo="O que a equipa reportou ao fechar cada tarefa"
      larguraMaxima={1320}
    >
      <div className="vn-relatorios" style={{ alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isError ? (
            <FalhaCarregar de="os relatórios" />
          ) : isLoading ? (
            <Carregando />
          ) : !data?.relatorios.length ? (
            <Vazio style={{ ...cartao, padding: 40 }}>
              Ainda não há relatórios. Aparecem aqui assim que alguém fechar uma tarefa.
            </Vazio>
          ) : (
            data.relatorios.map((r) => {
              const situacao = corSituacao(r.situacao);
              const porValidar = r.validacao === 'a_espera';

              return (
                <article key={r.id} className="vn-cartao-lista" style={cartao}>
                  <header style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                    <Avatar nome={r.autor.nome} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FONTE.linha, fontWeight: PESO.medio }}>{r.autor.nome}</div>
                      <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 3 }}>
                        {r.autor.funcao} · {formatarQuando(r.createdAt)}
                      </div>
                    </div>
                    <Etiqueta fg={situacao.fg} bg={situacao.bg}>
                      {SITUACAO[r.situacao]}
                    </Etiqueta>
                  </header>

                  <p
                    style={{
                      fontSize: FONTE.linha,
                      lineHeight: 1.68,
                      color: COR.tinta,
                      margin: '0 0 14px',
                      maxWidth: '78ch',
                      textWrap: 'pretty',
                    }}
                  >
                    {r.texto}
                  </p>

                  <footer
                    className="vn-rodape-relatorio"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${COR.linha}`,
                      fontSize: FONTE.nota,
                      color: COR.suave,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {r.tarefa.titulo} · {r.projecto.nome} · {r.esforcoRealHoras}h
                      {r.provaExecucao ? ` · ${r.provaExecucao}` : ''}
                    </span>

                    {porValidar ? (
                      <div className="vn-validar" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                        <textarea
                          value={notas[r.id] ?? ''}
                          onChange={(e) => setNotas((actual) => ({ ...actual, [r.id]: e.target.value }))}
                          placeholder="Nota à Direcção (obrigatória ao escalar)"
                          rows={2}
                          style={{
                            ...campo,
                            width: 'min(280px, 100%)',
                            minHeight: 56,
                            resize: 'vertical',
                            borderRadius: RAIO.campo,
                          }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={botaoSecundario}
                          onClick={() => void decidir(r, 'escalar')}
                          disabled={validar.isPending}
                        >
                          Escalar
                        </button>
                        <button
                          type="button"
                          style={botaoSecundario}
                          onClick={() => void decidir(r, 'validar')}
                          disabled={validar.isPending}
                        >
                          Validar entrega
                        </button>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: r.validacao === 'escalado' ? COR.ambar : COR.verde }}>
                        {VALIDACAO[r.validacao]}
                        {r.validadoPor ? ` por ${r.validadoPor}` : ''}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0 }}>
          <section>
            <div style={{ ...tituloSeccao, marginBottom: 12 }}>A leitura da semana</div>
            <div style={{ ...cartao, padding: 18 }}>
              <p style={{ fontSize: FONTE.corpo, lineHeight: 1.68, color: COR.texto, margin: 0 }}>{leitura}</p>
            </div>
          </section>

          <section>
            <div style={{ ...tituloSeccao, marginBottom: 12 }}>Tipologia de obstáculos</div>
            <div style={{ ...cartao, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tipologia && tipologia.total > 0 ? (
                (
                  [
                    ['bloqueado', COR.vermelhoVivo],
                    ['com_obstaculo', COR.ambarVivo],
                    ['sem_obstaculos', COR.bordaForte],
                  ] as const
                ).map(([chave, cor]) => {
                  const n = tipologia.porSituacao[chave];
                  const pct = tipologia.total ? Math.round((n / tipologia.total) * 100) : 0;
                  return (
                    <div key={chave}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 8,
                          fontSize: FONTE.corpo,
                          marginBottom: 7,
                        }}
                      >
                        <span style={{ flex: 1 }}>{SITUACAO[chave]}</span>
                        <span style={{ fontWeight: PESO.forte, ...numerico }}>{n}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: COR.linha, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <span style={{ fontSize: FONTE.corpo, color: COR.suave }}>Sem relatórios nos últimos sete dias.</span>
              )}
            </div>
          </section>
        </aside>
      </div>
    </Pagina>
  );
}

/** "Hoje, 09:14" para o que e recente; data curta para o resto. */
function formatarQuando(quando: Date): string {
  const agora = new Date();
  const hora = `${String(quando.getHours()).padStart(2, '0')}:${String(quando.getMinutes()).padStart(2, '0')}`;
  const dias = Math.floor((agora.getTime() - quando.getTime()) / 86_400_000);

  if (quando.toDateString() === agora.toDateString()) return `Hoje, ${hora}`;
  if (dias <= 1) return `Ontem, ${hora}`;

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${quando.getDate()} ${meses[quando.getMonth()]}, ${hora}`;
}
