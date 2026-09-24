import { useState } from 'react';
import {
  ESTADO_TAREFA,
  FILTROS_TAREFA,
  FILTRO_TAREFA_LABEL,
  type FiltroTarefa,
  alertaPrazo,
  corEstado,
  dataCurta,
} from '@nexora/shared';
import { COR, ESPACO, FONTE, PESO, cartao, numerico, pastilha, textoTruncado } from '../design/tokens';
import { Avatar, Carregando, Etiqueta, PastilhaAlerta, Semaforo, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { ModalRelatorio } from '../components/ModalRelatorio';
import { ModalTarefa } from '../components/ModalTarefa';
import { botaoSecundario } from '../design/tokens';
import { useLarguraDe } from '../lib/ecra';
import { useTarefas } from '../lib/queries';
import type { Tarefa } from '../lib/tipos';

/**
 * Tarefas atribuidas, ordenadas por deadline.
 *
 * A ordem nao e configuravel de proposito: o que vence primeiro aparece primeiro. Ordenar por
 * projecto ou por pessoa dava uma lista mais arrumada e menos util.
 */
export function Tarefas() {
  const [filtro, setFiltro] = useState<FiltroTarefa>('abertas');
  const [aConcluir, setAConcluir] = useState<Tarefa | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const { data: tarefas, isLoading } = useTarefas(filtro);
  // Sete colunas precisam de ~900px; abaixo disso cada tarefa passa a bloco. Decide o
  // contentor e nao a janela: ver `useLarguraDe`.
  const [contentor, largura] = useLarguraDe<HTMLDivElement>();
  const larga = largura >= 900;
  const { data: todas } = useTarefas('todas');

  const contar = (f: FiltroTarefa): number => {
    if (!todas) return 0;
    if (f === 'todas') return todas.length;
    if (f === 'concluidas') return todas.filter((t) => t.estado === 'concluida').length;
    if (f === 'atrasadas') return todas.filter((t) => t.estado === 'atrasada').length;
    return todas.filter((t) => t.estado !== 'concluida').length;
  };

  return (
    <Pagina
      acento={COR.ambarVivo}
      titulo="Tarefas atribuídas"
      subtitulo="Funções com deadline · conclusão sujeita a mini relatório"
      accaoPrincipal={{ rotulo: 'Atribuir tarefa', onClick: () => setModalAberto(true) }}
    >
      <div className="vn-filtros" style={{ marginBottom: 16 }}>
        {FILTROS_TAREFA.map((f) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} style={pastilha(filtro === f)}>
            {FILTRO_TAREFA_LABEL[f]}
            <span style={{ ...numerico, opacity: 0.7 }}>{contar(f)}</span>
          </button>
        ))}
      </div>

      <div ref={contentor} style={{ ...cartao, overflow: 'hidden' }}>
        {isLoading ? (
          <Carregando />
        ) : !tarefas?.length ? (
          <Vazio>
            {filtro === 'atrasadas'
              ? 'Nenhuma tarefa passou do prazo. A carteira está em dia.'
              : 'Nenhuma tarefa neste filtro.'}
          </Vazio>
        ) : (
          tarefas.map((t, i) => {
            const concluida = t.estado === 'concluida';
            const alerta = alertaPrazo(t.deadline, concluida);
            const estado = corEstado(t.estado);
            const separador = i === tarefas.length - 1 ? 'none' : `1px solid ${COR.linha}`;

            const titulo = (
              <div
                style={{
                  fontSize: FONTE.linha,
                  fontWeight: PESO.medio,
                  color: concluida ? COR.textoSuave : COR.tinta,
                  textDecoration: concluida ? 'line-through' : 'none',
                  ...(larga ? textoTruncado : { lineHeight: 1.4 }),
                }}
              >
                {t.titulo}
              </div>
            );
            const origem = (
              <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 4, ...textoTruncado }}>
                {t.projecto.nome}
                {t.fase ? ` · ${t.fase.nome}` : ''}
              </div>
            );
            const accao = concluida ? (
              <span style={{ fontSize: FONTE.nota, color: COR.suave }}>
                {t.exigeRelatorio ? 'relatório entregue' : 'sem relatório'}
              </span>
            ) : (
              <button type="button" style={botaoSecundario} onClick={() => setAConcluir(t)}>
                Assinalar cumprida
              </button>
            );

            if (!larga) {
              // Sem largura para colunas: o que decide (titulo e prazo) em cima, quem, estado e
              // esforco numa linha de meta, e a accao com a largura toda por baixo.
              return (
                <div key={t.id} style={{ padding: '14px 16px', borderBottom: separador }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Semaforo cor={alerta.cor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {titulo}
                      {origem}
                    </div>
                    <PastilhaAlerta alerta={alerta} pequena />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      columnGap: 12,
                      rowGap: 6,
                      marginTop: 10,
                      paddingLeft: 15,
                      fontSize: FONTE.nota,
                      color: COR.textoSuave,
                    }}
                  >
                    <Etiqueta fg={estado.fg} bg={estado.bg}>
                      {ESTADO_TAREFA[t.estado]}
                    </Etiqueta>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <Avatar nome={t.responsavel.nome} tamanho={20} />
                      <span style={textoTruncado}>{t.responsavel.nome}</span>
                    </span>
                    <span style={numerico}>vence {dataCurta(t.deadline)}</span>
                    <span style={numerico}>
                      {t.esforcoRealHoras}h de {t.esforcoEstimadoHoras}h
                    </span>
                  </div>
                  {concluida ? (
                    <div style={{ marginTop: 8, paddingLeft: 15 }}>{accao}</div>
                  ) : (
                    <div style={{ display: 'flex', marginTop: 12, paddingLeft: 15 }}>
                      <button
                        type="button"
                        style={{ ...botaoSecundario, flex: 1, justifyContent: 'center' }}
                        onClick={() => setAConcluir(t)}
                      >
                        Assinalar cumprida
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: `${ESPACO.linha}px ${ESPACO.celula}px`,
                  borderBottom: separador,
                }}
              >
                <Semaforo cor={alerta.cor} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {titulo}
                  {origem}
                </div>

                <Etiqueta fg={estado.fg} bg={estado.bg}>
                  {ESTADO_TAREFA[t.estado]}
                </Etiqueta>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 168 }}>
                  <Avatar nome={t.responsavel.nome} tamanho={24} />
                  <span style={{ fontSize: FONTE.corpo, ...textoTruncado }}>{t.responsavel.nome}</span>
                </div>

                <span style={{ fontSize: FONTE.nota, color: COR.suave, width: 92, ...numerico }}>
                  {t.esforcoRealHoras}h de {t.esforcoEstimadoHoras}h
                </span>

                <span style={{ fontSize: FONTE.corpo, width: 56, ...numerico }}>{dataCurta(t.deadline)}</span>

                <div style={{ width: 132, display: 'flex', justifyContent: 'flex-end' }}>
                  <PastilhaAlerta alerta={alerta} />
                </div>

                <div style={{ width: 150, display: 'flex', justifyContent: 'flex-end' }}>{accao}</div>
              </div>
            );
          })
        )}
      </div>

      <ModalTarefa aberto={modalAberto} onFechar={() => setModalAberto(false)} />
      <ModalRelatorio tarefa={aConcluir} onFechar={() => setAConcluir(null)} />
    </Pagina>
  );
}
