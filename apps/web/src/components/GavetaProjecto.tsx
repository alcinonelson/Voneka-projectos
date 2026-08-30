import {
  ESTADO_FASE,
  alertaPrazo,
  corBarraAvanco,
  corEstado,
  dataCurta,
  formatarMetical,
} from '@nexora/shared';
import { COR, ESPACO, FONTE,
  MARCA, PESO, RAIO, botaoPrincipal, botaoSecundario, cartao, etiquetaMaiuscula, numerico, textoTruncado } from '../design/tokens';
import { useProjecto } from '../lib/queries';
import { Avatar, BarraAvanco, Carregando, Etiqueta, EtiquetaVocabulario, PastilhaAlerta, Ponto, Vazio } from './base';
import { Gaveta, TituloGaveta } from './Modal';
import { useToast } from './Toast';

/**
 * Gaveta do projecto.
 *
 * Mostra os factos, o roteiro por fases e as tarefas reais - nao um resumo delas. Quem abre a
 * gaveta a meio de uma reuniao precisa de responder a "em que pe esta isto" sem ter de sair para
 * outro ecra.
 */
export function GavetaProjecto({
  projectoId,
  onFechar,
  onAtribuirTarefa,
  onEditarFases,
}: {
  projectoId: string | null;
  onFechar: () => void;
  onAtribuirTarefa: (projectoId: string) => void;
  onEditarFases: (projectoId: string) => void;
}) {
  const { data: projecto, isLoading } = useProjecto(projectoId);
  const toast = useToast();

  if (!projectoId) return null;

  return (
    <Gaveta aberta onFechar={onFechar}>
      {isLoading || !projecto ? (
        <Carregando />
      ) : (
        <>
          <header
            style={{
              background: COR.branco,
              borderBottom: `1px solid ${COR.borda}`,
              padding: `20px ${ESPACO.pagina}px 18px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: FONTE.nota, color: COR.suave, ...numerico }}>{projecto.codigo}</span>
              <EtiquetaVocabulario valor={projecto.natureza} comPonto />
              <button
                type="button"
                onClick={onFechar}
                aria-label="Fechar"
                style={{
                  marginLeft: 'auto',
                  width: 28,
                  height: 28,
                  border: `1px solid ${COR.borda}`,
                  background: COR.branco,
                  borderRadius: RAIO.botao,
                  cursor: 'pointer',
                  color: COR.texto,
                  fontSize: 14,
                }}
              >
                ×
              </button>
            </div>

            <TituloGaveta
              style={{ fontSize: 19, fontWeight: PESO.forte, letterSpacing: '-0.015em', margin: 0, lineHeight: 1.35 }}
            >
              {projecto.nome}
            </TituloGaveta>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <span style={{ fontSize: FONTE.corpo, color: COR.textoSuave }}>{projecto.cliente}</span>
              <EtiquetaVocabulario valor={projecto.estagio} />
              <PastilhaAlerta alerta={alertaPrazo(projecto.deadline)} />
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarraAvanco pct={projecto.avancoPct} cor={corBarraAvanco(projecto.saude)} largura={120} />
                <span style={{ fontSize: FONTE.media, fontWeight: PESO.forte, ...numerico }}>
                  {projecto.avancoPct}%
                </span>
              </span>
            </div>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: `20px ${ESPACO.pagina}px 32px` }}>
            {/* Factos */}
            <div style={{ ...cartao, display: 'flex', padding: '16px 20px', marginBottom: 20 }}>
              {[
                { k: 'Deadline de entrega', v: dataCurta(projecto.deadline) },
                {
                  k: 'Orçamento consumido',
                  v:
                    projecto.consumidoPct === null
                      ? '—'
                      : `${projecto.consumidoPct}% de ${formatarMetical(projecto.orcamentoCentavos)}`,
                },
                { k: 'Pessoas alocadas', v: String(projecto.equipa.length) },
                { k: 'Responsável', v: projecto.responsavel.nome },
              ].map((facto) => (
                <div key={facto.k} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: FONTE.nota, color: COR.suave }}>{facto.k}</div>
                  <div
                    style={{
                      fontSize: FONTE.linha,
                      fontWeight: PESO.medio,
                      marginTop: 6,
                      ...numerico,
                      ...textoTruncado,
                    }}
                  >
                    {facto.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Roteiro */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: FONTE.seccao, fontWeight: PESO.forte }}>Roteiro</span>
              <button
                type="button"
                onClick={() => onEditarFases(projecto.id)}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  background: 'transparent',
                  color: MARCA.turquesaTexto,
                  fontSize: FONTE.corpo,
                  fontWeight: PESO.medio,
                  cursor: 'pointer',
                }}
              >
                Editar fases
              </button>
            </div>

            <div style={{ ...cartao, overflow: 'hidden', marginBottom: 22 }}>
              {projecto.fases.map((f, i) => {
                const estado = corEstado(f.estado);
                const concluida = f.estado === 'concluida';
                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      gap: 14,
                      padding: '14px 20px',
                      borderBottom: i === projecto.fases.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        flex: '0 0 18px',
                        marginTop: 2,
                        borderRadius: '50%',
                        border: `1.5px solid ${
                          f.estado === 'atrasada'
                            ? COR.vermelhoVivo
                            : concluida
                              ? COR.tinta
                              : f.estado === 'em_curso'
                                ? MARCA.turquesa
                                : COR.bordaForte
                        }`,
                        background: concluida ? COR.tinta : f.estado === 'em_curso' ? MARCA.turquesa : COR.branco,
                        color: COR.branco,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                      }}
                    >
                      {concluida ? '✓' : ''}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: FONTE.linha, fontWeight: PESO.medio }}>{f.nome}</span>
                        <Etiqueta fg={estado.fg} bg={estado.bg}>
                          {ESTADO_FASE[f.estado]}
                        </Etiqueta>
                        <span style={{ marginLeft: 'auto', fontSize: FONTE.nota, color: COR.suave, ...numerico }}>
                          {dataCurta(f.startsOn)} – {dataCurta(f.endsOn)}
                        </span>
                      </div>
                      {f.nota ? (
                        <div style={{ fontSize: FONTE.corpo, color: COR.textoSuave, marginTop: 6, lineHeight: 1.6 }}>
                          {f.nota}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tarefas do projecto */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: FONTE.seccao, fontWeight: PESO.forte }}>Tarefas</span>
              <span style={{ fontSize: FONTE.pequena, color: COR.suave }}>
                {projecto.tarefas.filter((t) => t.estado !== 'concluida').length} abertas de{' '}
                {projecto.tarefas.length}
              </span>
            </div>

            <div style={{ ...cartao, overflow: 'hidden', marginBottom: 22 }}>
              {projecto.tarefas.length === 0 ? (
                <Vazio>
                  Este projecto ainda não tem tarefas atribuídas. O roteiro define as fases; as tarefas é que
                  dizem quem faz o quê.
                </Vazio>
              ) : (
                projecto.tarefas.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 20px',
                      borderBottom: i === projecto.tarefas.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                    }}
                  >
                    <Avatar nome={t.responsavel.nome} tamanho={24} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: FONTE.corpo,
                          fontWeight: PESO.medio,
                          color: t.estado === 'concluida' ? COR.textoSuave : COR.tinta,
                          ...textoTruncado,
                        }}
                      >
                        {t.titulo}
                      </div>
                      <div style={{ fontSize: FONTE.minima, color: COR.suave, marginTop: 3 }}>
                        {t.responsavel.nome}
                        {t.fase ? ` · ${t.fase.nome}` : ''}
                      </div>
                    </div>
                    <PastilhaAlerta alerta={alertaPrazo(t.deadline, t.estado === 'concluida')} pequena />
                  </div>
                ))
              )}
            </div>

            {/* Histórico */}
            {projecto.historico.length ? (
              <>
                <div style={{ ...etiquetaMaiuscula, marginBottom: 10 }}>Histórico do projecto</div>
                <div style={{ ...cartao, padding: '12px 20px', marginBottom: 22 }}>
                  {projecto.historico.slice(0, 6).map((h) => (
                    <div
                      key={h.id}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '7px 0',
                        fontSize: FONTE.nota,
                        color: COR.textoSuave,
                      }}
                    >
                      <span style={{ color: COR.suave, ...numerico }}>{dataCurta(h.createdAt)}</span>
                      <span style={{ flex: 1 }}>
                        {descreverAccao(h.accao)}
                        {h.autorNome ? ` · ${h.autorNome}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {/* Acções */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={botaoPrincipal} onClick={() => onAtribuirTarefa(projecto.id)}>
                <span>+</span>Atribuir tarefa
              </button>
              <button type="button" style={botaoSecundario} onClick={() => onEditarFases(projecto.id)}>
                Editar fases
              </button>
              <button
                type="button"
                style={botaoSecundario}
                onClick={() =>
                  toast.mostrar(`Ponto de situação pedido a ${projecto.responsavel.nome}`)
                }
              >
                Pedir ponto de situação
              </button>
            </div>
          </div>
        </>
      )}
    </Gaveta>
  );
}

/** Traduz o codigo de auditoria para uma frase legivel. */
function descreverAccao(accao: string): string {
  const mapa: Record<string, string> = {
    'projecto.criado': 'Projecto registado',
    'projecto.actualizado': 'Factos do projecto actualizados',
    'roteiro.gravado': 'Roteiro de fases gravado',
    'roteiro.reposto': 'Roteiro reposto no plano original',
    'fase.reagendada': 'Fase movida no roteiro',
    'tarefa.atribuida': 'Tarefa atribuída',
    'tarefa.cumprida': 'Tarefa cumprida com relatório',
    'tarefa.prorrogacao_pedida': 'Prorrogação pedida',
    'tarefa.prorrogacao_aceite': 'Prorrogação aceite',
    'tarefa.prorrogacao_recusada': 'Prorrogação recusada',
    'relatorio.validado': 'Relatório validado',
    'relatorio.escalado': 'Relatório escalado à Direcção',
  };
  return mapa[accao] ?? accao;
}
