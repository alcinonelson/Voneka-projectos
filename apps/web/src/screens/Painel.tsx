import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { corBarraAvanco, corSaude, dataCurta, hoje, paraIso } from '@nexora/shared';
import {
  COR,
  ESPACO,
  FONTE,
  MARCA,
  PESO,
  RAIO,
  botaoSecundario,
  campo,
  cartao,
  chip,
  numerico,
  textoTruncado,
  tituloSeccao,
} from '../design/tokens';
import { BarraAvanco, Carregando, CartaoNumero, FalhaCarregar, PastilhaAlerta, Ponto, Semaforo, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { useToast } from '../components/Toast';
import { ErroApi } from '../lib/api';
import { pt } from '../i18n/pt';
import {
  useActualizarTarefa,
  useDecidirProrrogacao,
  usePainel,
  useValidarRelatorio,
} from '../lib/queries';
import type { ItemDecisao } from '../lib/tipos';

const VISIVEIS_INICIAIS = 3;

/**
 * Painel de acompanhamento.
 *
 * A hierarquia e deliberada e vem do design: primeiro a frase que nomeia o que esta a travar a
 * operacao, depois o que precisa de decisao, e so entao os quadros de leitura. Um painel que
 * comeca por metricas obriga quem le a procurar o problema; este apresenta-o.
 *
 * Validar, escalar e alargar prazo acontecem no cartao. Ir a uma lista para decidir o que o
 * proprio cartao ja nomeou e perder o eixo do produto.
 */
export function Painel() {
  const { data, isLoading, isError } = usePainel();
  const navegar = useNavigate();
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const fila = data?.decisoes ?? [];
  const total = data?.decisoesTotal ?? fila.length;
  const visiveis = mostrarTodas ? fila : fila.slice(0, VISIVEIS_INICIAIS);
  const restantes = Math.max(0, total - VISIVEIS_INICIAIS);

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
        <FalhaCarregar de="o painel" />
      ) : isLoading || !data ? (
        <Carregando />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: ESPACO.seccao }}>
          <div
            className="vn-foco vn-faixa-foco"
            style={{
              ...cartao,
              borderLeft: `3px solid ${
                data.resumo.foraDePrazo > 0 ? COR.vermelhoVivo : COR.turquesaVivo
              }`,
              background: `linear-gradient(to right, ${
                chip(data.resumo.foraDePrazo > 0 ? 'vermelho' : 'turquesa').bg
              } 0%, ${COR.branco} 42%)`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch' }}>
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
                className="vn-foco-titulo"
                style={{
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
            <div className="vn-kpis">
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
                valor={String(total)}
                tom={total > 0 ? 'ambar' : 'neutro'}
                nota={total === 0 ? 'nada por decidir' : total === 1 ? 'item por decidir' : 'itens por decidir'}
              />
            </div>
          </div>

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <span style={{ ...tituloSeccao, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 3,
                    height: 13,
                    borderRadius: 2,
                    background: total ? COR.ambarVivo : COR.bordaForte,
                  }}
                />
                Precisa da sua decisão
              </span>
              <span style={{ fontSize: FONTE.pequena, color: COR.suave }}>
                {total === 0
                  ? 'nada em espera'
                  : `${total} ${total === 1 ? 'item trava' : 'itens travam'} a operação`}
              </span>
            </div>
            <div style={{ ...cartao, overflow: 'hidden' }}>
              {fila.length === 0 ? (
                <Vazio>Nenhuma tarefa passou do prazo e nenhum relatório ficou por responder.</Vazio>
              ) : (
                visiveis.map((item, i) => (
                  <CartaoDecisao key={item.id} item={item} ultimo={i === visiveis.length - 1} />
                ))
              )}
            </div>
            {restantes > 0 ? (
              <button
                type="button"
                onClick={() => setMostrarTodas((v) => !v)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: MARCA.turquesaTexto,
                  fontSize: FONTE.corpo,
                  fontWeight: PESO.medio,
                  cursor: 'pointer',
                  padding: '12px 2px',
                }}
              >
                {mostrarTodas ? pt.painel.verMenos : pt.painel.faltam(restantes)}
              </button>
            ) : null}
          </section>

          <div className="vn-grelha-duas">
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
                    className="vn-avanco-linha"
                    onClick={() => navegar(`/projectos?id=${p.id}`)}
                    style={{
                      width: '100%',
                      padding: `${ESPACO.linha}px 20px`,
                      borderBottom: i === data.avancos.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <span className="vn-avanco-nome">
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

function CartaoDecisao({ item, ultimo }: { item: ItemDecisao; ultimo: boolean }) {
  const toast = useToast();
  const decidirPrazo = useDecidirProrrogacao();
  const validar = useValidarRelatorio();
  const actualizarTarefa = useActualizarTarefa();
  const [nota, setNota] = useState('');
  const [novaDeadline, setNovaDeadline] = useState('');
  const aDecidir = decidirPrazo.isPending || validar.isPending || actualizarTarefa.isPending;

  async function decidirProrrogacao(aceitar: boolean) {
    try {
      await decidirPrazo.mutateAsync({ extensionId: item.id, aceitar });
      toast.mostrar(aceitar ? pt.painel.prazoAlargado : 'Pedido de prorrogação recusado');
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : pt.painel.falhouDecisao);
    }
  }

  async function decidirRelatorio(decisao: 'validar' | 'escalar') {
    const observacao = nota.trim();
    if (decisao === 'escalar' && !observacao) {
      toast.mostrar(pt.painel.notaEscalar);
      return;
    }
    try {
      await validar.mutateAsync({ id: item.id, dados: { decisao, observacao } });
      toast.mostrar(decisao === 'validar' ? pt.painel.validado : pt.painel.escalado);
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : pt.painel.falhouDecisao);
    }
  }

  async function alargarPrazo() {
    if (!novaDeadline) {
      toast.mostrar(pt.painel.dataObrigatoria);
      return;
    }
    try {
      await actualizarTarefa.mutateAsync({ id: item.id, dados: { deadline: novaDeadline } });
      toast.mostrar(pt.painel.prazoAlargado);
      setNovaDeadline('');
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : pt.painel.falhouDecisao);
    }
  }

  return (
    <div
      className="vn-linha-item vn-linha-decisao"
      style={{
        padding: '18px 20px',
        borderBottom: ultimo ? 'none' : `1px solid ${COR.linha}`,
      }}
    >
      <Semaforo cor={item.alerta.cor} />
      <div className="vn-linha-corpo">
        <div style={{ fontSize: FONTE.media, fontWeight: PESO.medio, letterSpacing: '-0.005em' }}>
          {item.titulo}
        </div>
        <div style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginTop: 5 }}>
          {item.detalhe} · {item.idadeDias <= 0 ? pt.painel.hojeNaFila : pt.painel.idade(item.idadeDias)}
        </div>
        {item.texto ? (
          <p
            style={{
              fontSize: FONTE.corpo,
              lineHeight: 1.6,
              color: COR.tinta,
              margin: '8px 0 0',
              maxWidth: '68ch',
              textWrap: 'pretty',
            }}
          >
            {item.texto}
          </p>
        ) : null}
        {item.origem === 'relatorio' ? (
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={pt.painel.notaEscalar}
            rows={2}
            style={{ ...campo, width: '100%', maxWidth: 320, minHeight: 52, height: 'auto', resize: 'vertical', marginTop: 10 }}
          />
        ) : null}
        {item.origem === 'tarefa' ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <label style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {pt.painel.novaDeadline}
            </label>
            <input
              type="date"
              value={novaDeadline}
              min={paraIso(hoje())}
              onChange={(e) => setNovaDeadline(e.target.value)}
              style={{ ...campo, width: 148, height: 32 }}
            />
          </div>
        ) : null}
      </div>
      <div className="vn-linha-fim">
        <PastilhaAlerta alerta={item.alerta} />
        {item.origem === 'prorrogacao' ? (
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={botaoSecundario} disabled={aDecidir} onClick={() => void decidirProrrogacao(false)}>
              Recusar
            </button>
            <button
              type="button"
              style={{ ...botaoSecundario, borderColor: COR.bordaForte }}
              disabled={aDecidir}
              onClick={() => void decidirProrrogacao(true)}
            >
              Aceitar
            </button>
          </span>
        ) : null}
        {item.origem === 'relatorio' ? (
          <span style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={botaoSecundario} disabled={aDecidir} onClick={() => void decidirRelatorio('escalar')}>
              {pt.painel.escalar}
            </button>
            <button
              type="button"
              style={{ ...botaoSecundario, borderColor: COR.bordaForte }}
              disabled={aDecidir}
              onClick={() => void decidirRelatorio('validar')}
            >
              {pt.painel.validar}
            </button>
          </span>
        ) : null}
        {item.origem === 'tarefa' ? (
          <button
            type="button"
            style={{ ...botaoSecundario, borderColor: COR.bordaForte }}
            disabled={aDecidir}
            onClick={() => void alargarPrazo()}
          >
            {pt.painel.alargar}
          </button>
        ) : null}
      </div>
    </div>
  );
}

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
