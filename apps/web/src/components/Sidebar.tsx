import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NavLink, useLocation } from 'react-router-dom';
import { NIVEL_ACESSO } from '@nexora/shared';
import { useSessao } from '../lib/auth';
import { useDestinos } from '../lib/navegacao';
import { COR, FONTE, LARGURA, MARCA, PESO, RAIO, SOMBRA, numerico, textoTruncado } from '../design/tokens';
import { Avatar, Marca, MarcaCompleta } from './base';
import { Icone } from './icones';
import { useNavegacao } from './Layout';
import { CAMADA_DIALOGO } from './Modal';
import { ModalPassword } from './ModalPassword';

/**
 * Navegacao lateral.
 *
 * Os destinos vem de `lib/navegacao.ts`, partilhados com a barra inferior do telemovel.
 *
 * Nao ha "Ver como". Um Administrador via no seu proprio menu a vertente de Colaborador, que nao
 * e dele: ou se responde por carteira, ou se executa.
 *
 * **Fundo escuro, na cor da casa.** Veste a identidade Voneka e resolve o motivo por que os
 * icones nao se viam recolhidos - um traco branco sobre `#0E2E23` da 14.65:1.
 *
 * **Por faixa de ecra:**
 * - amplo: coluna fixa, recolhivel pelo botao na fronteira; a preferencia fica guardada.
 * - tablet: sempre em icones, para o conteudo ter a largura toda. Expandir abre o menu por cima
 *   do conteudo, com um veu que o fecha; escolher um destino fecha-o tambem.
 * - movel: gaveta completa, aberta pelo "Mais" da barra inferior.
 */

const CHAVE_RECOLHIDO = 'voneka.sidebar.recolhido';

/** Le a preferencia sem rebentar quando o armazenamento esta fechado (janela privada, politica). */
function lerRecolhido(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_RECOLHIDO) === '1';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const { utilizador, empresa, sair } = useSessao();
  const { faixa, emGaveta, gavetaAberta, fecharGaveta } = useNavegacao();
  const { grupos } = useDestinos();
  const local = useLocation();

  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const [expandidoTablet, setExpandidoTablet] = useState(false);
  const [passwordAberto, setPasswordAberto] = useState(false);

  const emTablet = faixa === 'tablet';

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
    } catch {
      // Nao poder guardar a preferencia nao pode impedir de a usar nesta sessao.
    }
  }, [recolhido]);

  // No tablet o menu aberto esta por cima do conteudo: escolher um destino fecha-o.
  useEffect(() => {
    setExpandidoTablet(false);
  }, [local.pathname, faixa]);

  const alternar = useCallback(() => {
    if (emTablet) setExpandidoTablet((v) => !v);
    else setRecolhido((v) => !v);
  }, [emTablet]);

  // Na gaveta o menu abre sempre por extenso: quem a abriu quer ler os nomes.
  const compacto = emGaveta ? false : emTablet ? !expandidoTablet : recolhido;
  const largura = emGaveta ? 280 : compacto ? LARGURA.sidebarRecolhida : LARGURA.sidebar;
  const sobreposto = emTablet && expandidoTablet;

  const conteudo = (
    <aside
      style={{
        // Relativo e acima do conteudo: o botao de recolher assenta na fronteira e tem de ficar
        // por cima da metade que invade o cabecalho da pagina.
        position: sobreposto ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: sobreposto ? 40 : 2,
        width: largura,
        flex: `0 0 ${largura}px`,
        background: MARCA.verdeEscuro,
        color: COR.branco,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .16s ease',
        boxShadow: sobreposto ? '12px 0 32px rgba(14,46,35,.28)' : undefined,
      }}
    >
      {emGaveta ? null : (
        // Na fronteira entre o menu e a pagina, a altura do cabecalho: e a costura que o botao
        // move, e e onde se procura. A area de toque tem 44px; o circulo desenhado tem 26.
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!compacto}
          aria-label={compacto ? 'Mostrar o menu' : 'Recolher o menu'}
          title={compacto ? 'Mostrar o menu' : 'Recolher o menu'}
          style={{
            position: 'absolute',
            top: LARGURA.cabecalho / 2 - 22,
            right: -22,
            width: 44,
            height: 44,
            padding: 0,
            border: 'none',
            background: 'transparent',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 13,
              background: COR.branco,
              color: COR.tinta,
              border: `1px solid ${COR.borda}`,
              boxShadow: SOMBRA.pastilha,
            }}
          >
            <Icone nome={compacto ? 'expandir' : 'recolher'} tamanho={14} />
          </span>
        </button>
      )}

      <div style={{ padding: compacto ? '16px 8px 12px' : '16px 14px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: compacto ? 'center' : 'flex-start',
            padding: compacto ? '6px 0' : '8px 10px',
            border: `1px solid rgba(255,255,255,.10)`,
            borderRadius: RAIO.medio,
            background: 'rgba(255,255,255,.04)',
          }}
          title={compacto ? `Voneka Projectos · ${empresa?.nome ?? ''}` : undefined}
        >
          {compacto ? (
            <Marca tamanho={26} tom="claro" />
          ) : (
            <MarcaCompleta tamanho={28} tom="claro" empresa={empresa?.nome ?? null} />
          )}
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: compacto ? '0 8px 12px' : '0 10px 12px' }}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            {compacto ? (
              <div
                aria-hidden="true"
                style={{ height: 1, background: 'rgba(255,255,255,.10)', margin: '14px 6px 10px' }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '18px 8px 8px',
                  fontSize: FONTE.micro,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: PESO.medio,
                  color: 'rgba(255,255,255,.45)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 12, height: 2, borderRadius: 1, background: grupo.acento }}
                />
                {grupo.titulo}
              </div>
            )}

            {grupo.destinos.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                // Recolhido, o rotulo sai do ecra mas nao do acesso: fica no titulo, que o rato
                // mostra, e no nome acessivel, que o leitor de ecra anuncia.
                title={compacto ? item.rotulo : undefined}
                aria-label={compacto ? item.rotulo : undefined}
                style={({ isActive }) => ({
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  height: 38,
                  marginBottom: 2,
                  padding: compacto ? 0 : '0 10px',
                  justifyContent: compacto ? 'center' : 'flex-start',
                  borderRadius: RAIO.campo,
                  fontSize: FONTE.base,
                  textDecoration: 'none',
                  background: isActive ? 'rgba(255,255,255,.09)' : 'transparent',
                  color: isActive ? COR.branco : 'rgba(255,255,255,.72)',
                  fontWeight: isActive ? PESO.forte : PESO.normal,
                  transition: 'background .12s ease, color .12s ease',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          left: compacto ? 2 : 0,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 2,
                          background: grupo.acento,
                        }}
                      />
                    ) : null}

                    <span style={{ color: isActive ? grupo.acento : 'inherit', display: 'flex' }}>
                      <Icone nome={item.icone} tamanho={18} />
                    </span>

                    {compacto ? null : <span style={{ flex: 1 }}>{item.rotulo}</span>}

                    {item.distintivo ? (
                      compacto ? (
                        // Recolhido nao cabe o numero; fica um ponto, e o rotulo acessivel diz
                        // quantas sao - antes era um <span> vazio, que nao dizia nada a ninguem.
                        <span
                          role="status"
                          aria-label={`${item.distintivo} por tratar`}
                          style={{
                            position: 'absolute',
                            top: 7,
                            right: 9,
                            width: 7,
                            height: 7,
                            borderRadius: 4,
                            background: item.alarme ? COR.vermelhoVivo : MARCA.verde,
                            border: `1.5px solid ${MARCA.verdeEscuro}`,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            minWidth: 19,
                            height: 18,
                            padding: '0 6px',
                            borderRadius: RAIO.pequeno + 2,
                            background: item.alarme ? COR.vermelhoVivo : 'rgba(255,255,255,.14)',
                            color: COR.branco,
                            fontSize: FONTE.micro,
                            fontWeight: PESO.forte,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...numerico,
                          }}
                        >
                          {item.distintivo}
                        </span>
                      )
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div
        style={{
          borderTop: `1px solid rgba(255,255,255,.10)`,
          padding: compacto ? '12px 8px' : '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: compacto ? 'center' : 'flex-start',
          gap: 10,
        }}
      >
        <Avatar nome={utilizador?.nome ?? ''} />
        {compacto ? null : (
          <>
            <button
              type="button"
              onClick={() => setPasswordAberto(true)}
              title="Alterar a palavra-passe"
              style={{
                flex: 1,
                minWidth: 0,
                display: 'block',
                border: 'none',
                background: 'transparent',
                padding: 0,
                textAlign: 'left',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: FONTE.corpo,
                  fontWeight: PESO.medio,
                  color: COR.branco,
                  ...textoTruncado,
                }}
              >
                {utilizador?.nome}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: FONTE.minima,
                  color: 'rgba(255,255,255,.5)',
                  ...textoTruncado,
                }}
              >
                {utilizador ? NIVEL_ACESSO[utilizador.nivelAcesso] : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void sair()}
              title="Terminar sessão"
              aria-label="Terminar sessão"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,.5)',
                cursor: 'pointer',
                fontSize: FONTE.pequena,
                padding: 4,
              }}
            >
              ⏻
            </button>
          </>
        )}
      </div>

      <ModalPassword aberto={passwordAberto} onFechar={() => setPasswordAberto(false)} />
    </aside>
  );

  if (emTablet) {
    // O lugar da coluna em icones fica reservado; aberto, o menu passa por cima do conteudo.
    return (
      <div style={{ position: 'relative', flex: `0 0 ${LARGURA.sidebarRecolhida}px`, zIndex: 3 }}>
        {conteudo}
        {sobreposto ? (
          <div
            aria-hidden="true"
            onClick={() => setExpandidoTablet(false)}
            style={{
              position: 'fixed',
              inset: 0,
              left: LARGURA.sidebar,
              background: 'rgba(14,46,35,.28)',
              zIndex: 39,
              animation: 'nx-fade .16s ease',
            }}
          />
        ) : null}
      </div>
    );
  }

  if (!emGaveta) return conteudo;

  return (
    <Dialog.Root open={gavetaAberta} onOpenChange={(v) => !v && fecharGaveta()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: CAMADA_DIALOGO,
            background: 'rgba(14,46,35,.44)',
            animation: 'nx-fade .16s ease',
          }}
        />
        <Dialog.Content
          aria-label="Menu"
          style={{
            position: 'fixed',
            zIndex: CAMADA_DIALOGO + 1,
            top: 0,
            bottom: 0,
            left: 0,
            width: 280,
            maxWidth: '86vw',
            outline: 'none',
            animation: 'vn-gaveta .2s cubic-bezier(.22,.61,.36,1)',
            paddingLeft: 'env(safe-area-inset-left)',
          }}
        >
          <Dialog.Title style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Menu de navegação
          </Dialog.Title>
          {conteudo}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
