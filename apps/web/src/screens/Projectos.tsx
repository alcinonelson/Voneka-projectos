import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  alertaPrazo,
  corBarraAvanco,
  corSaude,
  dataCurta,
} from '@nexora/shared';
import { COR, ESPACO, FONTE, MARCA, PESO, cartao, etiquetaMaiuscula, numerico, pastilha, textoTruncado } from '../design/tokens';
import { Avatar, BarraAvanco, Carregando, EtiquetaVocabulario, PastilhaAlerta, Ponto, Vazio } from '../components/base';
import { GavetaProjecto } from '../components/GavetaProjecto';
import { Pagina } from '../components/Layout';
import { ModalProjecto } from '../components/ModalProjecto';
import { ModalRoteiro } from '../components/ModalRoteiro';
import { ModalTarefa } from '../components/ModalTarefa';
import { useToast } from '../components/Toast';
import { pt } from '../i18n/pt';
import { ErroApi, descarregar } from '../lib/api';
import { useLarguraDe } from '../lib/ecra';
import { useCarteira, useVocabulario, type FiltroCarteira } from '../lib/queries';

/**
 * Carteira de projectos.
 *
 * Os filtros sao as naturezas mais dois cortes transversais: todos e em risco. Clicar numa linha
 * abre a gaveta, que e onde o projecto se explica; a tabela responde a "o que existe e o que
 * aperta", a gaveta responde a "o que se passa aqui".
 */
export function Projectos() {
  const [parametros, setParametros] = useSearchParams();
  const [filtro, setFiltro] = useState<FiltroCarteira>('todos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [tarefaPara, setTarefaPara] = useState<string | null>(null);
  const [fasesPara, setFasesPara] = useState<string | null>(null);

  const { data, isLoading } = useCarteira(filtro);
  const { data: naturezas } = useVocabulario('natureza');
  const toast = useToast();
  const [aExportar, setAExportar] = useState(false);

  async function exportar() {
    setAExportar(true);
    try {
      await descarregar('/projects/export', 'carteira.csv');
      toast.mostrar(pt.carteira.exportada);
    } catch (e) {
      toast.mostrar(e instanceof ErroApi ? e.message : pt.carteira.falhouExportar);
    } finally {
      setAExportar(false);
    }
  }

  const seleccionado = parametros.get('id');

  useEffect(() => {
    if (parametros.get('novo') === '1') {
      setNovoAberto(true);
      const proximos = new URLSearchParams(parametros);
      proximos.delete('novo');
      setParametros(proximos, { replace: true });
    }
  }, [parametros, setParametros]);

  function abrir(id: string | null) {
    const proximos = new URLSearchParams(parametros);
    if (id) proximos.set('id', id);
    else proximos.delete('id');
    setParametros(proximos, { replace: true });
  }

  const filtros: { chave: FiltroCarteira; rotulo: string }[] = [
    { chave: 'todos', rotulo: 'Todos' },
    { chave: 'em_risco', rotulo: 'Em risco' },
    // As naturezas sao as da empresa, nao uma lista fixa: o filtro nasce do vocabulario.
    ...(naturezas ?? []).map((n) => ({ chave: n.id as FiltroCarteira, rotulo: n.rotulo })),
  ];

  // O formato decide-se pela largura que a lista tem, e nao pela janela: ver `useLarguraDe`.
  const [contentor, largura] = useLarguraDe<HTMLDivElement>();
  const formato: 'tabela' | 'compacta' | 'cartoes' =
    largura >= 940 ? 'tabela' : largura >= 560 ? 'compacta' : 'cartoes';

  // Na tabela compacta o estagio e as tarefas descem para dentro da celula do projecto, que e onde
  // ha largura; responsavel, avanco e entrega ficam em colunas porque sao o que se compara.
  const colunas =
    formato === 'tabela'
      ? [
          { rotulo: 'Projecto', largura: 'minmax(0, 1fr)' },
          { rotulo: 'Estágio', largura: '116px' },
          { rotulo: 'Responsável', largura: '162px' },
          { rotulo: 'Avanço', largura: '190px' },
          { rotulo: 'Entrega', largura: '150px' },
          { rotulo: 'Tarefas', largura: '78px' },
        ]
      : [
          { rotulo: 'Projecto', largura: 'minmax(0, 1fr)' },
          { rotulo: 'Responsável', largura: 'minmax(0, 140px)' },
          { rotulo: 'Avanço', largura: '150px' },
          { rotulo: 'Entrega', largura: '118px' },
        ];
  const grelha = colunas.map((c) => c.largura).join(' ');

  const vazio = (
    <Vazio>
      {filtro === 'em_risco'
        ? 'Nenhum projecto em risco. A carteira está no prazo.'
        : 'Nenhum projecto nesta natureza.'}
    </Vazio>
  );

  return (
    <Pagina
      acento={MARCA.verde}
      titulo="Carteira de projectos"
      subtitulo="Estágio, responsável, avanço e deadline de entrega"
      accaoPrincipal={{ rotulo: 'Registar projecto', onClick: () => setNovoAberto(true) }}
      accaoSecundaria={{
        rotulo: aExportar ? pt.carteira.aExportar : pt.carteira.exportar,
        onClick: () => void exportar(),
      }}
    >
      <div className="vn-filtros" style={{ marginBottom: 16 }}>
        {filtros.map((f) => (
          <button key={f.chave} type="button" onClick={() => setFiltro(f.chave)} style={pastilha(filtro === f.chave)}>
            {f.rotulo}
            <span style={{ ...numerico, opacity: 0.7 }}>{data?.contagens[f.chave] ?? 0}</span>
          </button>
        ))}
      </div>

      <div ref={contentor}>
        {formato === 'cartoes' ? (
          isLoading ? (
            <div style={cartao}>
              <Carregando />
            </div>
          ) : !data?.projectos.length ? (
            <div style={cartao}>{vazio}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.projectos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrir(p.id)}
                  style={{
                    ...cartao,
                    display: 'block',
                    width: '100%',
                    padding: '14px 16px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: FONTE.media, fontWeight: PESO.forte, lineHeight: 1.35 }}>
                        {p.nome}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 4,
                          fontSize: FONTE.nota,
                          color: COR.suave,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ ...numerico, whiteSpace: 'nowrap' }}>{p.codigo}</span>
                        <span aria-hidden="true">·</span>
                        <span style={textoTruncado}>{p.cliente}</span>
                      </span>
                    </span>
                    <EtiquetaVocabulario valor={p.estagio} />
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <span className="vn-barra-fluida">
                      <BarraAvanco pct={p.avancoPct} cor={corBarraAvanco(p.saude)} />
                    </span>
                    <span style={{ fontSize: FONTE.base, fontWeight: PESO.forte, ...numerico }}>{p.avancoPct}%</span>
                    <Ponto cor={corSaude(p.saude)} />
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${COR.linha}`,
                      fontSize: FONTE.corpo,
                    }}
                  >
                    <Avatar nome={p.responsavel.nome} tamanho={22} />
                    <span style={{ flex: 1, minWidth: 0, color: COR.textoSuave, ...textoTruncado }}>
                      {p.responsavel.nome}
                    </span>
                    <span style={{ ...numerico, color: COR.textoSuave }}>{dataCurta(p.deadline)}</span>
                    <PastilhaAlerta alerta={alertaPrazo(p.deadline)} pequena />
                  </span>
                </button>
              ))}
            </div>
          )
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
              {colunas.map((c) => (
                <span key={c.rotulo} style={etiquetaMaiuscula}>
                  {c.rotulo}
                </span>
              ))}
            </div>

            {isLoading ? (
              <Carregando />
            ) : !data?.projectos.length ? (
              vazio
            ) : (
              data.projectos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => abrir(p.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: grelha,
                    gap: 14,
                    alignItems: 'center',
                    width: '100%',
                    padding: `${ESPACO.linha}px ${ESPACO.celula}px`,
                    border: 'none',
                    borderBottom: i === data.projectos.length - 1 ? 'none' : `1px solid ${COR.linha}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: FONTE.linha, fontWeight: PESO.medio, ...textoTruncado }}>
                      {p.nome}
                    </span>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        rowGap: 4,
                        marginTop: 4,
                        fontSize: FONTE.nota,
                        color: COR.suave,
                        minWidth: 0,
                        flexWrap: formato === 'compacta' ? 'wrap' : 'nowrap',
                      }}
                    >
                      <span style={numerico}>{p.codigo}</span>
                      <EtiquetaVocabulario valor={p.natureza} comPonto />
                      {formato === 'compacta' ? (
                        <>
                          <EtiquetaVocabulario valor={p.estagio} />
                          <span style={numerico}>
                            {p.tarefasAbertas}/{p.tarefasTotal} tarefas
                          </span>
                        </>
                      ) : (
                        <span style={textoTruncado}>· {p.cliente}</span>
                      )}
                    </span>
                  </span>

                  {formato === 'tabela' ? (
                    <span>
                      <EtiquetaVocabulario valor={p.estagio} />
                    </span>
                  ) : null}

                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <Avatar nome={p.responsavel.nome} tamanho={24} />
                    <span style={{ fontSize: FONTE.corpo, ...textoTruncado }}>{p.responsavel.nome}</span>
                  </span>

                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarraAvanco
                      pct={p.avancoPct}
                      cor={corBarraAvanco(p.saude)}
                      largura={formato === 'tabela' ? 116 : 76}
                    />
                    <span style={{ fontSize: FONTE.base, fontWeight: PESO.forte, width: 38, ...numerico }}>
                      {p.avancoPct}%
                    </span>
                    <Ponto cor={corSaude(p.saude)} />
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: formato === 'tabela' ? 'center' : 'flex-start',
                      flexDirection: formato === 'tabela' ? 'row' : 'column',
                      gap: formato === 'tabela' ? 8 : 4,
                    }}
                  >
                    <span style={{ fontSize: FONTE.corpo, ...numerico }}>{dataCurta(p.deadline)}</span>
                    <PastilhaAlerta alerta={alertaPrazo(p.deadline)} pequena />
                  </span>

                  {formato === 'tabela' ? (
                    <span style={{ fontSize: FONTE.corpo, fontWeight: PESO.medio, ...numerico }}>
                      {p.tarefasAbertas}/{p.tarefasTotal}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <GavetaProjecto
        projectoId={seleccionado}
        onFechar={() => abrir(null)}
        onAtribuirTarefa={(id) => setTarefaPara(id)}
        onEditarFases={(id) => setFasesPara(id)}
      />

      <ModalProjecto aberto={novoAberto} onFechar={() => setNovoAberto(false)} />
      <ModalTarefa
        aberto={tarefaPara !== null}
        projectoInicial={tarefaPara ?? undefined}
        onFechar={() => setTarefaPara(null)}
      />
      <ModalRoteiro projectoId={fasesPara} onFechar={() => setFasesPara(null)} />
    </Pagina>
  );
}
