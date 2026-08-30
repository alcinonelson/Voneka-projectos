import { useNavigate } from 'react-router-dom';
import {
  COR,
  ESPACO,
  FONTE,
  MARCA,
  PESO,
  RAIO,
  cartao,
  chip,
  numerico,
  textoTruncado,
  tituloSeccao,
} from '../design/tokens';
import { corBarraAvanco, corSaude, dataCurta } from '@nexora/shared';
import { BarraAvanco, Carregando, CartaoNumero, PastilhaAlerta, Ponto, Semaforo, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { useDecidirProrrogacao, usePainel } from '../lib/queries';
import { useToast } from '../components/Toast';
import { ErroApi } from '../lib/api';
import { botaoSecundario } from '../design/tokens';

/**
 * Painel de acompanhamento.
 *
 * A hierarquia e deliberada e vem do design: primeiro a frase que nomeia o que esta a travar a
 * operacao, depois o que precisa de decisao, e so entao os quadros de leitura. Um painel que
 * comeca por metricas obriga quem le a procurar o problema; este apresenta-o.
 *
 * A cor acompanha o que os dados dizem, e nao o contrario. A faixa de foco muda de temperatura
 * conforme ha ou nao trabalho fora de prazo, e o quadro do atraso muda de tom com ele. O que nao
 * muda e a semantica ja fixada: um projecto no prazo continua a ter a barra em tinta e nao em
 * verde, porque o verde e do que ja esta cumprido.
 */
export function Painel() {
  const { data, isLoading, isError } = usePainel();
  const navegar = useNavigate();
  const decidirPrazo = useDecidirProrrogacao();
  const toast = useToast();

  async function decidirProrrogacao(id: string, aceitar: boolean) {
    try {
      await decidirPrazo.mutateAsync({ extensionId: id, aceitar });
      toast.mostrar(aceitar ? 'Prazo alargado' : 'Pedido de prorrogação recusado');
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : 'Não foi possível decidir o pedido.');
    }
  }

  return (
    <Pagina
      acento={MARCA.verde}
      titulo="Painel de acompanhamento"
      subtitulo={
        data
          ? `${data.avancos.length} projectos em destaque · ${data.resumo.foraDePrazo} tarefas fora de prazo`
          : 'A carregar a carteira'
      }
      accaoPrincipal={{ rotulo: 'Registar projecto', onClick: () => navegar('/projectos?novo=1') }}
    >
      {isError ? (
        <Vazio style={{ ...cartao, padding: 40 }}>Não foi possível carregar o painel. Tente de novo.</Vazio>
      ) : isLoading || !data ? (
        <Carregando />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACO.seccao }}>
          {/* Faixa de foco: serena quando nada esta atrasado, quente quando esta. */}
          <div
            style={{
              ...cartao,
              padding: '26px 28px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: 40,
              borderLeft: `3px solid ${
                data.resumo.foraDePrazo > 0 ? COR.vermelhoVivo : COR.turquesaVivo
              }`,
              background: `linear-gradient(to right, ${
                chip(data.resumo.foraDePrazo > 0 ? 'vermelho' : 'turquesa').bg
              } 0%, ${COR.branco} 42%)`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: FONTE.nota,
                  fontWeight: PESO.medio,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: COR.suave,
                }}
              >
                {data.hoje}
              </div>
              <div
                style={{
                  fontSize: FONTE.numero,
                  fontWeight: PESO.forte,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.32,
                  marginTop: 12,
                  maxWidth: '30ch',
                  textWrap: 'pretty',
                }}
              >
                {data.foco.titulo}
              </div>
              <div
                style={{
                  fontSize: FONTE.base,
                  color: COR.textoSuave,
                  marginTop: 10,
                  lineHeight: 1.6,
                  maxWidth: '62ch',
                  textWrap: 'pretty',
                }}
              >
                {data.foco.nota}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flex: '0 0 auto' }}>
              <CartaoNumero
                rotulo="Avanço médio"
                valor={`${data.resumo.avancoMedio}%`}
                tom="azul"
                nota={
                  data.resumo.previstoMedio === null
                    ? 'sem plano de referência'
                    : `o plano previa ${data.resumo.previstoMedio}%`
                }
                destaque={desvioDoPlano(data.resumo.avancoMedio, data.resumo.previstoMedio)}
              />
              <CartaoNumero
                rotulo="Fora de prazo"
                valor={String(data.resumo.foraDePrazo)}
                tom={data.resumo.foraDePrazo > 0 ? 'vermelho' : 'verde'}
                nota={
                  data.resumo.foraDePrazo === 0
                    ? 'nada em atraso hoje'
                    : data.resumo.projectosComAtraso === 1
                      ? 'em 1 projecto'
                      : `em ${data.resumo.projectosComAtraso} projectos`
                }
              />
              <CartaoNumero
                rotulo="À sua espera"
                valor={String(data.decisoes.length)}
                tom={data.decisoes.length > 0 ? 'ambar' : 'neutro'}
                nota={
                  data.decisoes.length === 0
                    ? 'nada por decidir'
                    : data.decisoes.length === 1
                      ? 'item por decidir'
                      : 'itens por decidir'
                }
              />
            </div>
          </div>

          {/* Precisa da sua decisão */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ ...tituloSeccao, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 3,
                    height: 13,
                    borderRadius: 2,
                    background: data.decisoes.length ? COR.ambarVivo : COR.bordaForte,
                  }}
                />
                Precisa da sua decisão
              </span>
              <span style={{ fontSize: FONTE.pequena, color: COR.suave }}>
                {data.decisoes.length === 0
                  ? 'nada em espera'
                  : `${data.decisoes.length} ${data.decisoes.length === 1 ? 'item trava' : 'itens travam'} a operação`}
              </span>
            </div>
            <div style={{ ...cartao, overflow: 'hidden' }}>
              {data.decisoes.length === 0 ? (
                <Vazio>Nenhuma tarefa passou do prazo e nenhum relatório ficou por responder.</Vazio>
              ) : (
                data.decisoes.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      padding: '18px 20px',
                      borderBottom: i === data.decisoes.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                    }}
                  >
                    <Semaforo cor={item.alerta.cor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: FONTE.media, fontWeight: PESO.medio, letterSpacing: '-0.005em' }}>
                        {item.titulo}
                      </div>
                      <div style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginTop: 5 }}>
                        {item.detalhe}
                      </div>
                    </div>
                    <PastilhaAlerta alerta={item.alerta} />
                    {item.origem === 'prorrogacao' ? (
                      <span style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          style={botaoSecundario}
                          disabled={decidirPrazo.isPending}
                          onClick={() => void decidirProrrogacao(item.id, false)}
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          style={{ ...botaoSecundario, borderColor: COR.bordaForte }}
                          disabled={decidirPrazo.isPending}
                          onClick={() => void decidirProrrogacao(item.id, true)}
                        >
                          Aceitar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        style={{ ...botaoSecundario, borderColor: COR.bordaForte }}
                        onClick={() => {
                          navegar(item.origem === 'relatorio' ? '/relatorios' : '/tarefas');
                        }}
                      >
                        {item.accao}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Avanço da carteira e Prazos a vencer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <span style={{ ...tituloSeccao, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 3, height: 13, borderRadius: 2, background: MARCA.verde }}
                  />
                  Avanço da carteira
                </span>
                <button
                  type="button"
                  onClick={() => navegar('/projectos')}
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
                  Abrir carteira
                </button>
              </div>
              <div style={{ ...cartao, overflow: 'hidden' }}>
                {data.avancos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navegar(`/projectos?id=${p.id}`)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: `${ESPACO.linha}px 20px`,
                      borderBottom: i === data.avancos.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: FONTE.linha, fontWeight: PESO.medio, ...textoTruncado }}>
                        {p.nome}
                      </span>
                      <span style={{ display: 'block', fontSize: FONTE.nota, color: COR.suave, marginTop: 4 }}>
                        {p.cliente} · {p.estagio.rotulo}
                      </span>
                    </span>
                    <BarraAvanco pct={p.avancoPct} cor={corBarraAvanco(p.saude)} />
                    <span
                      style={{
                        fontSize: FONTE.base,
                        fontWeight: PESO.forte,
                        width: 40,
                        textAlign: 'right',
                        ...numerico,
                      }}
                    >
                      {p.avancoPct}%
                    </span>
                    <Ponto cor={corSaude(p.saude)} />
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <span style={{ ...tituloSeccao, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 3, height: 13, borderRadius: 2, background: COR.violetaVivo }}
                  />
                  Prazos a vencer
                </span>
                <button
                  type="button"
                  onClick={() => navegar('/tarefas')}
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
                  Ver tarefas
                </button>
              </div>
              <div style={{ ...cartao, overflow: 'hidden' }}>
                {data.prazos.length === 0 ? (
                  <Vazio>Nenhuma tarefa aberta com prazo à vista.</Vazio>
                ) : (
                  data.prazos.map((t, i) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '14px 18px',
                        borderBottom: i === data.prazos.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: FONTE.corpo, fontWeight: PESO.medio, flex: 1, ...textoTruncado }}>
                          {t.titulo}
                        </span>
                        <PastilhaAlerta alerta={t.alerta} pequena />
                      </div>
                      <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6 }}>
                        {t.responsavel} · {dataCurta(t.deadline)}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => navegar('/relatorios')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: MARCA.turquesaTexto,
                  fontSize: FONTE.corpo,
                  fontWeight: PESO.medio,
                  cursor: 'pointer',
                  padding: '12px 2px',
                  borderRadius: RAIO.botao,
                }}
              >
                Ler os relatórios desta semana →
              </button>
            </section>
          </div>
        </div>
      )}
    </Pagina>
  );
}

/**
 * O desvio entre o avanco declarado e o que o calendario ja consumiu.
 *
 * E a leitura que a percentagem sozinha nao da: 62% pode ser bom ou mau consoante o plano previa
 * 55% ou 80%. Sem plano de referencia nao ha nada honesto a dizer, e entao nao se diz nada.
 */
function desvioDoPlano(
  declarado: number,
  previsto: number | null,
): { texto: string; cor: string } | undefined {
  if (previsto === null) return undefined;
  const delta = declarado - previsto;
  if (Math.abs(delta) <= 2) return { texto: 'a acompanhar o plano', cor: COR.verde };
  if (delta > 0) return { texto: `${delta} pontos à frente do plano`, cor: COR.verde };
  return { texto: `${Math.abs(delta)} pontos atrás do plano`, cor: COR.ambar };
}
