import { useState } from 'react';
import { ESTADO_TAREFA, alertaPrazo, corEstado, dataLonga, lerData, paraIso, somarDias } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, botaoSecundario, campo, cartao, numerico, rotuloCampo } from '../design/tokens';
import { Carregando, Etiqueta, PastilhaAlerta, Semaforo, Vazio } from '../components/base';
import { CampoData } from '../components/CampoData';
import { Pagina } from '../components/Layout';
import { Modal } from '../components/Modal';
import { ModalRelatorio } from '../components/ModalRelatorio';
import { useToast } from '../components/Toast';
import { useSessao } from '../lib/auth';
import { usePedirProrrogacao, useTarefas } from '../lib/queries';
import type { Tarefa } from '../lib/tipos';

/**
 * As tarefas de quem esta a ver, em cartoes.
 *
 * O colaborador nao precisa de uma tabela com dez colunas: precisa de saber o que tem de entregar,
 * ate quando, quem lhe pediu, e de ter a mao as duas accoes que lhe pertencem - cumprir ou pedir
 * mais prazo.
 */
export function MinhasTarefas() {
  const { utilizador } = useSessao();
  const { data: tarefas, isLoading } = useTarefas('todas', true);
  const [aConcluir, setAConcluir] = useState<Tarefa | null>(null);
  const [aProrrogar, setAProrrogar] = useState<Tarefa | null>(null);

  const abertas = (tarefas ?? []).filter((t) => t.estado !== 'concluida');
  const atrasadas = abertas.filter((t) => t.estado === 'atrasada');
  const concluidas = (tarefas ?? []).filter((t) => t.estado === 'concluida');

  const foco = atrasadas.length
    ? `Tem ${abertas.length} ${abertas.length === 1 ? 'tarefa sua' : 'tarefas suas'} e ${atrasadas.length} já ${atrasadas.length === 1 ? 'passou' : 'passaram'} do prazo.`
    : `Tem ${abertas.length} ${abertas.length === 1 ? 'tarefa sua' : 'tarefas suas'}, nenhuma fora de prazo.`;

  return (
    <Pagina
      titulo="As minhas tarefas"
      subtitulo="Funções que lhe foram atribuídas, por urgência"
      accaoPrincipal={
        abertas.length ? { rotulo: 'Reportar avanço', onClick: () => setAConcluir(abertas[0]!) } : undefined
      }
    >
      <div className="vn-cartao-foco" style={{ ...cartao, marginBottom: 20 }}>
        <div className="vn-foco-titulo" style={{ fontWeight: PESO.forte, letterSpacing: '-0.015em', lineHeight: 1.4 }}>
          {foco}
        </div>
        <div style={{ fontSize: FONTE.base, color: COR.textoSuave, marginTop: 8, lineHeight: 1.6, maxWidth: '68ch' }}>
          Ao assinalar uma tarefa como cumprida é obrigatório escrever o mini relatório da situação — é isso
          que a gestão lê. {utilizador ? `Sessão de ${utilizador.nome}.` : ''}
        </div>
      </div>

      {isLoading ? (
        <Carregando />
      ) : !abertas.length && !concluidas.length ? (
        <Vazio style={{ ...cartao, padding: 40 }}>Não tem tarefas atribuídas neste momento.</Vazio>
      ) : (
        <div className="vn-grelha-cartoes">
          {[...abertas, ...concluidas].map((t) => {
            const concluida = t.estado === 'concluida';
            const alerta = alertaPrazo(t.deadline, concluida);
            const estado = corEstado(t.estado);

            return (
              <article key={t.id} style={{ ...cartao, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Semaforo cor={alerta.cor} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: FONTE.media,
                        fontWeight: PESO.medio,
                        lineHeight: 1.4,
                        color: concluida ? COR.textoSuave : COR.tinta,
                      }}
                    >
                      {t.titulo}
                    </div>
                    <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 5 }}>
                      {t.projecto.nome}
                      {t.fase ? ` · ${t.fase.nome}` : ''}
                    </div>
                  </div>
                  <PastilhaAlerta alerta={alerta} pequena />
                </div>

                {t.descricao ? (
                  <div style={{ fontSize: FONTE.corpo, color: COR.texto, lineHeight: 1.6 }}>{t.descricao}</div>
                ) : null}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    columnGap: 14,
                    rowGap: 6,
                    fontSize: FONTE.nota,
                    color: COR.suave,
                  }}
                >
                  <Etiqueta fg={estado.fg} bg={estado.bg}>
                    {ESTADO_TAREFA[t.estado]}
                  </Etiqueta>
                  <span style={numerico}>vence {dataLonga(t.deadline)}</span>
                  <span style={numerico}>{t.esforcoEstimadoHoras}h estimadas</span>
                  <span>atribuída por {t.atribuidoPor.nome}</span>
                </div>

                {!concluida ? (
                  <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${COR.linha}`, paddingTop: 12, marginTop: 'auto' }}>
                    <button
                      type="button"
                      style={{ ...botaoSecundario, flex: 1, justifyContent: 'center' }}
                      onClick={() => setAProrrogar(t)}
                    >
                      Pedir prorrogação
                    </button>
                    <button
                      type="button"
                      style={{ ...botaoPrincipal, flex: 1, justifyContent: 'center' }}
                      onClick={() => setAConcluir(t)}
                    >
                      Assinalar cumprida
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      borderTop: `1px solid ${COR.linha}`,
                      paddingTop: 12,
                      fontSize: FONTE.nota,
                      color: COR.suave,
                    }}
                  >
                    Cumprida com {t.esforcoRealHoras}h · relatório enviado à gestão
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ModalRelatorio tarefa={aConcluir} onFechar={() => setAConcluir(null)} />
      <ModalProrrogacao tarefa={aProrrogar} onFechar={() => setAProrrogar(null)} />
    </Pagina>
  );
}

/** Pedido de mais prazo, com a razao por escrito. */
function ModalProrrogacao({ tarefa, onFechar }: { tarefa: Tarefa | null; onFechar: () => void }) {
  const [dataTexto, setDataTexto] = useState('');
  const [motivo, setMotivo] = useState('');
  const pedir = usePedirProrrogacao();
  const toast = useToast();

  if (!tarefa) return null;

  const data = lerData(dataTexto);
  const posterior = data !== null && data.getTime() > tarefa.deadline.getTime();
  const valido = posterior && motivo.trim().length >= 10;

  async function submeter() {
    if (!valido || !data) return;
    await pedir.mutateAsync({ id: tarefa!.id, novaDeadline: paraIso(data), motivo: motivo.trim() });
    toast.mostrar('Pedido de prorrogação enviado à gestão');
    onFechar();
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Pedir prorrogação"
      subtitulo={`${tarefa.titulo} · vence ${dataLonga(tarefa.deadline)}`}
      largura={520}
      rodapeNota={
        valido ? 'Quem atribuiu a tarefa decide o pedido.' : 'Indique a nova data e explique porquê.'
      }
      rodapeErro={!valido && (dataTexto.length > 0 || motivo.length > 0)}
      accao={{
        rotulo: 'Enviar pedido',
        onClick: () => void submeter(),
        desactivada: !valido,
        aCarregar: pedir.isPending,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <CampoData
          id="nova-data"
          rotulo="Nova deadline"
          valor={dataTexto}
          onChange={setDataTexto}
          minimo={paraIso(somarDias(tarefa.deadline, 1))}
          ajuda={
            data === null
              ? 'Use o formato dd/mm/aaaa.'
              : posterior
                ? `Passa a vencer ${dataLonga(data)}`
                : 'A nova data tem de ser posterior à actual.'
          }
          erro={dataTexto.length > 0 && data !== null && !posterior ? 'A nova data tem de ser posterior à actual.' : undefined}
        />
      </div>

      <div>
        <label style={rotuloCampo} htmlFor="motivo">
          Porquê
        </label>
        <textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="O que mudou desde que a tarefa foi atribuída."
          style={{
            ...campo,
            height: 88,
            padding: '10px 11px',
            lineHeight: 1.6,
            resize: 'vertical',
            borderRadius: RAIO.campo,
          }}
        />
      </div>
    </Modal>
  );
}
