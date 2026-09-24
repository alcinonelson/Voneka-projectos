import { useState } from 'react';
import type { AcessoEmitido } from '@nexora/shared';
import { ESTADO_CONTA, NIVEL_ACESSO, corAcesso, corCumprimento, leituraCarga } from '@nexora/shared';
import { COR, ESPACO, FONTE, PESO, botaoSecundario, cartao, etiquetaMaiuscula, numerico, textoTruncado } from '../design/tokens';
import { Avatar, Carregando, Etiqueta, EtiquetaVocabulario, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { ModalAcessoCriado } from '../components/ModalAcessoCriado';
import { ModalMembro } from '../components/ModalMembro';
import { useFaixaEcra } from '../lib/ecra';
import { useEquipa } from '../lib/queries';
import type { MembroEquipa } from '../lib/tipos';

/**
 * Equipa e acessos.
 *
 * A carga e o cumprimento sao derivados das tarefas, nao escritos a mao: atribuir mais uma coisa
 * a alguem ve-se imediatamente na sua linha.
 *
 * **Tres disposicoes, e nao uma tabela encolhida.** A versao anterior declarava 968px de colunas
 * rigidas dentro dos 888px que a pagina tinha, com `overflow: hidden` a cortar as ultimas em
 * silencio - nem cabiam, nem havia como as alcancar. Agora:
 *
 * - amplo: todas as colunas;
 * - tablet: as secundarias descem para uma segunda linha dentro da celula da pessoa;
 * - telemovel: cada pessoa e um cartao.
 *
 * O que fica visivel em cada faixa e uma decisao, nao um encolhimento automatico: numa lista de
 * equipa o que decide e quem e, que acesso tem e quanta carga leva.
 */
export function Equipa() {
  const { data: equipa, isLoading } = useEquipa();
  const [modalAberto, setModalAberto] = useState(false);
  const [aEditar, setAEditar] = useState<MembroEquipa | null>(null);
  const [emitido, setEmitido] = useState<{ acesso: AcessoEmitido; nome: string } | null>(null);
  const faixa = useFaixaEcra();

  const pendentes = (equipa ?? []).filter((p) => p.estado === 'convite_pendente').length;

  /** As colunas de cada faixa. `minmax(0, …)` para o conteudo longo nao alargar a grelha. */
  const colunas =
    faixa === 'amplo'
      ? [
          { rotulo: 'Pessoa', largura: 'minmax(0, 1fr)' },
          { rotulo: 'Departamento', largura: 'minmax(0, 130px)' },
          { rotulo: 'Acesso', largura: 'minmax(0, 148px)' },
          { rotulo: 'Abertas', largura: 'minmax(0, 68px)' },
          { rotulo: 'Carga', largura: 'minmax(0, 168px)' },
          { rotulo: 'Prazos', largura: 'minmax(0, 80px)' },
          { rotulo: 'Conta', largura: 'minmax(0, 124px)' },
          { rotulo: '', largura: 'minmax(0, 96px)' },
        ]
      : [
          { rotulo: 'Pessoa', largura: 'minmax(0, 1fr)' },
          { rotulo: 'Acesso', largura: 'minmax(0, 140px)' },
          { rotulo: 'Carga', largura: 'minmax(0, 150px)' },
          { rotulo: '', largura: 'minmax(0, 96px)' },
        ];

  const grelha = colunas.map((c) => c.largura).join(' ');
  const emCartoes = faixa === 'movel';

  /** Pendente ou nao, a accao abre a ficha: e la que se gera a ligacao ou a palavra-passe. */
  function abrirFicha(p: MembroEquipa) {
    setAEditar(p);
    setModalAberto(true);
  }

  /** Barra de carga, partilhada pela tabela e pelos cartoes. */
  function Carga({ p }: { p: MembroEquipa }) {
    const carga = leituraCarga(p.carga);
    return (
      <span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: FONTE.nota, color: carga.fg, fontWeight: PESO.medio }}>{carga.label}</span>
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
    );
  }

  /** Identificacao da pessoa. Em tablet leva por baixo o que saiu das colunas. */
  function Pessoa({ p, comExtras }: { p: MembroEquipa; comExtras: boolean }) {
    const pendente = p.estado === 'convite_pendente';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Avatar nome={p.nome} esbatido={pendente} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: FONTE.linha, fontWeight: PESO.medio, ...textoTruncado }}>
            {p.nome}
          </span>
          <span style={{ display: 'block', fontSize: FONTE.nota, color: COR.suave, ...textoTruncado }}>
            {p.funcao} · {p.email}
          </span>
          {comExtras ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 5,
                flexWrap: 'wrap',
                fontSize: FONTE.nota,
                color: COR.textoSuave,
              }}
            >
              <EtiquetaVocabulario valor={p.departamento} comPonto />
              <span style={{ color: COR.suave }}>·</span>
              <span style={numerico}>{p.tarefasAbertas} abertas</span>
              <span style={{ color: COR.suave }}>·</span>
              <span style={{ color: p.cumprimento === null ? COR.suave : corCumprimento(p.cumprimento), ...numerico }}>
                {p.cumprimento === null ? 'sem histórico' : `${p.cumprimento}% no prazo`}
              </span>
              {pendente ? (
                <>
                  <span style={{ color: COR.suave }}>·</span>
                  <span style={{ color: COR.ambar }}>{ESTADO_CONTA[p.estado]}</span>
                </>
              ) : null}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  function BotaoAccao({ p, largura }: { p: MembroEquipa; largura?: string }) {
    const pendente = p.estado === 'convite_pendente';
    return (
      <button
        type="button"
        style={{ ...botaoSecundario, width: largura, justifyContent: 'center' }}
        onClick={() => abrirFicha(p)}
      >
        {pendente ? 'Dar acesso' : 'Editar'}
      </button>
    );
  }

  return (
    <Pagina
      acento={'#C3B5FD'}
      titulo="Equipa e acessos"
      subtitulo="Registo de pessoas, contas de utilizador e níveis de acesso"
      accaoPrincipal={{
        rotulo: 'Registar membro',
        onClick: () => {
          setAEditar(null);
          setModalAberto(true);
        },
      }}
    >
      <div style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginBottom: 14 }}>
        {equipa?.length ?? 0} pessoas
        {pendentes ? ` · ${pendentes} ${pendentes === 1 ? 'convite pendente' : 'convites pendentes'}` : ''} ·
        os níveis de acesso definem o que cada conta vê
      </div>

      {isLoading ? (
        <div style={cartao}>
          <Carregando />
        </div>
      ) : !equipa?.length ? (
        <div style={cartao}>
          <Vazio>Ainda não há pessoas registadas.</Vazio>
        </div>
      ) : emCartoes ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {equipa.map((p) => {
            const acesso = corAcesso(p.nivelAcesso);
            return (
              <article key={p.id} style={{ ...cartao, padding: '16px 16px 18px' }}>
                <Pessoa p={p} comExtras={false} />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    margin: '14px 0 12px',
                    fontSize: FONTE.nota,
                    color: COR.textoSuave,
                  }}
                >
                  <Etiqueta fg={acesso.fg} bg={acesso.bg}>
                    {NIVEL_ACESSO[p.nivelAcesso]}
                  </Etiqueta>
                  <EtiquetaVocabulario valor={p.departamento} comPonto />
                  <span style={numerico}>{p.tarefasAbertas} abertas</span>
                  {p.estado === 'convite_pendente' ? (
                    <span style={{ color: COR.ambar }}>{ESTADO_CONTA[p.estado]}</span>
                  ) : null}
                </div>

                <Carga p={p} />

                <div style={{ marginTop: 14 }}>
                  <BotaoAccao p={p} largura="100%" />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
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

          {equipa.map((p, i) => {
            const acesso = corAcesso(p.nivelAcesso);
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
                <Pessoa p={p} comExtras={faixa === 'tablet'} />

                {faixa === 'amplo' ? (
                  <span style={{ fontSize: FONTE.corpo, ...textoTruncado }}>
                    <EtiquetaVocabulario valor={p.departamento} comPonto />
                  </span>
                ) : null}

                <span>
                  <Etiqueta fg={acesso.fg} bg={acesso.bg}>
                    {NIVEL_ACESSO[p.nivelAcesso]}
                  </Etiqueta>
                </span>

                {faixa === 'amplo' ? (
                  <span style={{ fontSize: FONTE.base, fontWeight: PESO.forte, ...numerico }}>
                    {p.tarefasAbertas}
                  </span>
                ) : null}

                <Carga p={p} />

                {faixa === 'amplo' ? (
                  <>
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
                  </>
                ) : null}

                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <BotaoAccao p={p} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <ModalMembro
        aberto={modalAberto}
        membro={aEditar}
        onFechar={() => {
          setModalAberto(false);
          setAEditar(null);
        }}
        onAcesso={(acesso, nome) => setEmitido({ acesso, nome })}
      />

      <ModalAcessoCriado
        acesso={emitido?.acesso ?? null}
        nome={emitido?.nome ?? ''}
        onFechar={() => setEmitido(null)}
      />
    </Pagina>
  );
}
