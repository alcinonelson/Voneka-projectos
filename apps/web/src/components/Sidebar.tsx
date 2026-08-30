import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NIVEL_ACESSO } from '@nexora/shared';
import { useSessao } from '../lib/auth';
import { useNotificacoes, useTarefas } from '../lib/queries';
import { COR, FONTE, LARGURA, MARCA, PESO, RAIO, numerico, textoTruncado } from '../design/tokens';
import { Avatar, Marca, MarcaCompleta } from './base';
import { Icone, type NomeIcone } from './icones';
import { InboxAvisos } from './InboxAvisos';
import { ModalPassword } from './ModalPassword';

/**
 * Navegacao lateral.
 *
 * Cada nivel de acesso tem a sua navegacao, e nao a mesma navegacao com itens escondidos. A
 * diferenca nao e cosmetica: o colaborador nao tem uma versao reduzida da carteira, tem outro
 * trabalho - as suas tarefas, os seus projectos, os seus relatorios.
 *
 * Nao ha "Ver como". Um Administrador via no seu proprio menu a vertente de Colaborador, que nao
 * e dele: ou se responde por carteira, ou se executa.
 *
 * **Fundo escuro, na cor da casa.** Faz tres coisas de uma vez: veste a identidade Voneka, da ao
 * portal a cor que lhe faltava, e resolve o motivo por que os icones nao se viam recolhidos - um
 * traco branco sobre `#0E2E23` da 14.65:1, contra os 2.1:1 do cinzento claro sobre branco que
 * aqui estava.
 *
 * Cada grupo tem o seu acento, o mesmo que o Painel usa nos titulos de seccao, para o menu e o
 * conteudo falarem a mesma lingua.
 */

const CHAVE_RECOLHIDO = 'voneka.sidebar.recolhido';

/** Acentos por grupo, escolhidos pelo contraste sobre o fundo escuro. */
const ACENTO = {
  carteira: MARCA.verde,
  execucao: COR.ambarVivo,
  /** O violeta normal daria 3.24:1 sobre o fundo escuro; esta variante clara chega a 6.2:1. */
  empresa: '#C3B5FD',
  trabalho: MARCA.verde,
} as const;

interface Item {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  distintivo?: number;
  alarme?: boolean;
}

interface Grupo {
  titulo: string;
  acento: string;
  itens: Item[];
}

/** Le a preferencia sem rebentar quando o armazenamento esta fechado (janela privada, politica). */
function lerRecolhido(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_RECOLHIDO) === '1';
  } catch {
    return false;
  }
}

export function Sidebar() {
  const { utilizador, empresa, ehDireccao, ehAdministrador, sair } = useSessao();

  const { data: atrasadas } = useTarefas('atrasadas', !ehDireccao);
  const { data: minhas } = useTarefas('abertas', true);
  const { data: avisos } = useNotificacoes();

  const [recolhido, setRecolhido] = useState(lerRecolhido);
  const [passwordAberto, setPasswordAberto] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE_RECOLHIDO, recolhido ? '1' : '0');
    } catch {
      // Nao poder guardar a preferencia nao pode impedir de a usar nesta sessao.
    }
  }, [recolhido]);

  const alternar = useCallback(() => setRecolhido((v) => !v), []);

  const grupos: Grupo[] = ehDireccao
    ? [
        {
          titulo: 'Carteira',
          acento: ACENTO.carteira,
          itens: [
            { para: '/painel', rotulo: 'Painel', icone: 'painel' },
            { para: '/projectos', rotulo: 'Projectos', icone: 'projectos' },
            { para: '/roteiro', rotulo: 'Roteiro', icone: 'roteiro' },
          ],
        },
        {
          titulo: 'Execução',
          acento: ACENTO.execucao,
          itens: [
            {
              para: '/tarefas',
              rotulo: 'Tarefas',
              icone: 'tarefas',
              distintivo: atrasadas?.length,
              alarme: true,
            },
            { para: '/relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
          ],
        },
        ...(ehAdministrador
          ? [
              {
                titulo: 'Empresa',
                acento: ACENTO.empresa,
                itens: [
                  { para: '/equipa', rotulo: 'Equipa e acessos', icone: 'equipa' as NomeIcone },
                  { para: '/vocabulario', rotulo: 'Vocabulário', icone: 'vocabulario' as NomeIcone },
                  { para: '/empresa', rotulo: 'Dados da empresa', icone: 'empresa' as NomeIcone },
                ],
              },
            ]
          : []),
      ]
    : [
        {
          titulo: 'O meu trabalho',
          acento: ACENTO.trabalho,
          itens: [
            {
              para: '/minhas-tarefas',
              rotulo: 'As minhas tarefas',
              icone: 'tarefas',
              distintivo: minhas?.length,
            },
            { para: '/meus-projectos', rotulo: 'Os meus projectos', icone: 'projectos' },
            { para: '/meus-relatorios', rotulo: 'Os meus relatórios', icone: 'relatorios' },
          ],
        },
        {
          titulo: 'Equipa',
          acento: ACENTO.carteira,
          itens: [{ para: '/roteiro', rotulo: 'Roteiro', icone: 'roteiro' }],
        },
      ];

  const largura = recolhido ? LARGURA.sidebarRecolhida : LARGURA.sidebar;

  return (
    <aside
      style={{
        width: largura,
        flex: `0 0 ${largura}px`,
        background: MARCA.verdeEscuro,
        color: COR.branco,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .16s ease',
      }}
    >
      <div style={{ padding: recolhido ? '16px 8px 12px' : '16px 14px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: recolhido ? 'center' : 'flex-start',
            padding: recolhido ? '6px 0' : '8px 10px',
            border: `1px solid rgba(255,255,255,.10)`,
            borderRadius: RAIO.medio,
            background: 'rgba(255,255,255,.04)',
          }}
          title={recolhido ? `Voneka Projectos · ${empresa?.nome ?? ''}` : undefined}
        >
          {recolhido ? (
            <Marca tamanho={26} tom="claro" />
          ) : (
            <MarcaCompleta tamanho={28} tom="claro" empresa={empresa?.nome ?? null} />
          )}
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: recolhido ? '0 8px 12px' : '0 10px 12px' }}>
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            {recolhido ? (
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

            {grupo.itens.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                // Recolhido, o rotulo sai do ecra mas nao do acesso: fica no titulo, que o rato
                // mostra, e no nome acessivel, que o leitor de ecra anuncia.
                title={recolhido ? item.rotulo : undefined}
                aria-label={recolhido ? item.rotulo : undefined}
                style={({ isActive }) => ({
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  height: 38,
                  marginBottom: 2,
                  padding: recolhido ? 0 : '0 10px',
                  justifyContent: recolhido ? 'center' : 'flex-start',
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
                          left: recolhido ? 2 : 0,
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

                    {recolhido ? null : <span style={{ flex: 1 }}>{item.rotulo}</span>}

                    {item.distintivo ? (
                      recolhido ? (
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

      <div style={{ borderTop: `1px solid rgba(255,255,255,.10)`, padding: recolhido ? '8px' : '8px 12px' }}>
        <InboxAvisos recolhido={recolhido} />
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!recolhido}
          title={recolhido ? 'Mostrar o menu' : 'Recolher o menu'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: recolhido ? 'center' : 'flex-start',
            gap: 11,
            width: '100%',
            height: 32,
            padding: recolhido ? 0 : '0 10px',
            border: 'none',
            background: 'transparent',
            borderRadius: RAIO.campo,
            color: 'rgba(255,255,255,.55)',
            fontSize: FONTE.corpo,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <Icone nome={recolhido ? 'expandir' : 'recolher'} tamanho={18} />
          {recolhido ? null : <span>Recolher menu</span>}
        </button>
      </div>

      <div
        style={{
          borderTop: `1px solid rgba(255,255,255,.10)`,
          padding: recolhido ? '12px 8px' : '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: recolhido ? 'center' : 'flex-start',
          gap: 10,
        }}
      >
        <Avatar nome={utilizador?.nome ?? ''} />
        {recolhido ? null : (
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
                {avisos?.porLer ? ` · ${avisos.porLer} por ler` : ''}
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
}
