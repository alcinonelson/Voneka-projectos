import { useState } from 'react';
import { ESTADO_CONTA, NIVEL_ACESSO, corAcesso, corCumprimento, leituraCarga } from '@nexora/shared';
import { COR, ESPACO, FONTE, PESO, botaoSecundario, cartao, etiquetaMaiuscula, numerico, textoTruncado } from '../design/tokens';
import { Avatar, Carregando, Etiqueta, EtiquetaVocabulario, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { ModalMembro } from '../components/ModalMembro';
import { useToast } from '../components/Toast';
import { useEquipa, useReenviarConvite } from '../lib/queries';

/**
 * Equipa e acessos.
 *
 * A carga e o cumprimento sao calculados a partir das tarefas, nao escritos a mao: a carga compara
 * as horas estimadas em aberto com a alocacao declarada da pessoa, e o cumprimento conta as
 * tarefas fechadas dentro do prazo. Numeros que envelhecem sozinhos valem mais do que numeros
 * bonitos.
 */
export function Equipa() {
  const { data: equipa, isLoading } = useEquipa();
  const [modalAberto, setModalAberto] = useState(false);
  const reenviar = useReenviarConvite();
  const toast = useToast();

  const pendentes = (equipa ?? []).filter((p) => p.estado === 'convite_pendente').length;

  const colunas = [
    { rotulo: 'Pessoa', largura: '1fr' },
    { rotulo: 'Departamento', largura: '128px' },
    { rotulo: 'Acesso', largura: '150px' },
    { rotulo: 'Abertas', largura: '68px' },
    { rotulo: 'Carga', largura: '176px' },
    { rotulo: 'Prazos', largura: '84px' },
    { rotulo: 'Conta', largura: '132px' },
    { rotulo: '', largura: '92px' },
  ];
  const grelha = colunas.map((c) => c.largura).join(' ');

  return (
    <Pagina
      acento={'#C3B5FD'}
      titulo="Equipa e acessos"
      subtitulo="Registo de pessoas, contas de utilizador e níveis de acesso"
      accaoPrincipal={{ rotulo: 'Registar membro', onClick: () => setModalAberto(true) }}
    >
      <div style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginBottom: 14 }}>
        {equipa?.length ?? 0} pessoas
        {pendentes ? ` · ${pendentes} ${pendentes === 1 ? 'convite pendente' : 'convites pendentes'}` : ''} ·
        os níveis de acesso definem o que cada conta vê
      </div>

      <div style={{ ...cartao, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: grelha,
            gap: 14,
            padding: `11px ${ESPACO.celula}px`,
            borderBottom: `1px solid ${COR.borda}`,
            background: COR.fundoHover,
          }}
        >
          {colunas.map((c, i) => (
            <span key={i} style={etiquetaMaiuscula}>
              {c.rotulo}
            </span>
          ))}
        </div>

        {isLoading ? (
          <Carregando />
        ) : !equipa?.length ? (
          <Vazio>Ainda não há pessoas registadas.</Vazio>
        ) : (
          equipa.map((p, i) => {
            const acesso = corAcesso(p.nivelAcesso);
            const carga = leituraCarga(p.carga);
            const pendente = p.estado === 'convite_pendente';

            return (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: grelha,
                  gap: 14,
                  alignItems: 'center',
                  padding: `${ESPACO.linha}px ${ESPACO.celula}px`,
                  borderBottom: i === equipa.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar nome={p.nome} esbatido={pendente} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: FONTE.linha, fontWeight: PESO.medio, ...textoTruncado }}>
                      {p.nome}
                    </span>
                    <span style={{ display: 'block', fontSize: FONTE.nota, color: COR.suave, ...textoTruncado }}>
                      {p.funcao} · {p.email}
                    </span>
                  </span>
                </div>

                <span style={{ fontSize: FONTE.corpo, ...textoTruncado }}>
                  <EtiquetaVocabulario valor={p.departamento} comPonto />
                </span>

                <span>
                  <Etiqueta fg={acesso.fg} bg={acesso.bg}>
                    {NIVEL_ACESSO[p.nivelAcesso]}
                  </Etiqueta>
                </span>

                <span style={{ fontSize: FONTE.base, fontWeight: PESO.forte, ...numerico }}>
                  {p.tarefasAbertas}
                </span>

                <span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: FONTE.nota, color: carga.fg, fontWeight: PESO.medio }}>
                      {carga.label}
                    </span>
                    <span style={{ fontSize: FONTE.minima, color: COR.suave, ...numerico }}>
                      {p.carga}% de {p.alocacao}%
                    </span>
                  </span>
                  <span style={{ display: 'block', height: 5, borderRadius: 3, background: COR.linha, overflow: 'hidden' }}>
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${Math.min(100, p.carga)}%`,
                        background: carga.barra,
                        borderRadius: 3,
                      }}
                    />
                  </span>
                </span>

                <span
                  style={{
                    fontSize: FONTE.base,
                    fontWeight: PESO.forte,
                    color: p.cumprimento === null ? COR.suave : corCumprimento(p.cumprimento),
                    ...numerico,
                  }}
                >
                  {p.cumprimento === null ? '—' : `${p.cumprimento}%`}
                </span>

                <span style={{ fontSize: FONTE.corpo, color: pendente ? COR.ambar : COR.suave }}>
                  {ESTADO_CONTA[p.estado]}
                </span>

                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    style={botaoSecundario}
                    disabled={reenviar.isPending}
                    onClick={async () => {
                      if (pendente) {
                        const r = await reenviar.mutateAsync(p.id);
                        toast.mostrar(`Convite reenviado a ${r.email}`);
                      } else {
                        toast.mostrar(`Ficha de ${p.nome}`);
                      }
                    }}
                  >
                    {pendente ? 'Reenviar' : 'Editar'}
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      <ModalMembro aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </Pagina>
  );
}
