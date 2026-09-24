import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dataExtensa, hoje, paraIso } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, cartao, etiquetaMaiuscula, pastilha } from '../design/tokens';
import { Carregando, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { pt } from '../i18n/pt';
import { useSessao } from '../lib/auth';
import { useMarcarNotificacaoLida, useMarcarTodasNotificacoesLidas, useNotificacoes } from '../lib/queries';
import type { Notificacao } from '../lib/tipos';

type Filtro = 'por_ler' | 'todos';

/**
 * Avisos de prazo.
 *
 * Era um painel no rodape do menu, com 320px de largura e a altura que sobrava. Os avisos sao o
 * que a pessoa tem de tratar hoje, e merecem uma pagina: lidos com espaco, agrupados pelo dia a
 * que dizem respeito, e com o caminho para a tarefa ao lado de cada um.
 *
 * Abre em "Por ler" porque e a pergunta que se faz ao chegar; "Todos" fica para quem quer
 * reencontrar um aviso que ja leu.
 */
export function Avisos() {
  const { ehDireccao } = useSessao();
  const { data, isLoading } = useNotificacoes();
  const marcar = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasNotificacoesLidas();
  const [filtro, setFiltro] = useState<Filtro>('por_ler');

  const todos = data?.avisos ?? [];
  const porLer = data?.porLer ?? 0;
  const visiveis = filtro === 'por_ler' ? todos.filter((a) => !a.lida) : todos;
  const grupos = agruparPorDia(visiveis);
  const rotaTarefas = ehDireccao ? '/tarefas' : '/minhas-tarefas';

  return (
    <Pagina
      titulo={pt.avisos.titulo}
      subtitulo={pt.avisos.subtitulo}
      larguraMaxima={820}
      accaoSecundaria={
        porLer ? { rotulo: pt.avisos.marcarTodos, onClick: () => void marcarTodas.mutateAsync() } : undefined
      }
    >
      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(
          [
            ['por_ler', `${pt.avisos.filtroPorLer}${porLer ? ` · ${porLer}` : ''}`],
            ['todos', pt.avisos.filtroTodos],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={filtro === valor}
            onClick={() => setFiltro(valor)}
            style={pastilha(filtro === valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={cartao}>
          <Carregando />
        </div>
      ) : grupos.length === 0 ? (
        <div style={cartao}>
          <Vazio>{filtro === 'por_ler' && todos.length ? pt.avisos.vazioPorLer : pt.avisos.vazio}</Vazio>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grupos.map((grupo) => (
            <section key={grupo.chave}>
              <h2 style={{ ...etiquetaMaiuscula, margin: '0 0 8px' }}>{grupo.titulo}</h2>
              <ul style={{ ...cartao, listStyle: 'none', margin: 0, padding: 0, overflow: 'hidden' }}>
                {grupo.avisos.map((aviso, i) => (
                  <li
                    key={aviso.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px 16px',
                      borderTop: i === 0 ? 'none' : `1px solid ${COR.linha}`,
                      background: aviso.lida ? COR.branco : COR.fundoHover,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        flex: '0 0 8px',
                        marginTop: 6,
                        borderRadius: 4,
                        background: aviso.lida ? 'transparent' : COR.ambarVivo,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: FONTE.base,
                          fontWeight: aviso.lida ? PESO.normal : PESO.medio,
                          lineHeight: 1.45,
                        }}
                      >
                        {aviso.titulo}
                      </div>
                      {aviso.detalhe ? (
                        <div style={{ fontSize: FONTE.corpo, color: COR.textoSuave, marginTop: 3, lineHeight: 1.5 }}>
                          {aviso.detalhe}
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: FONTE.nota }}>
                        {aviso.taskId ? (
                          <Link
                            to={rotaTarefas}
                            onClick={() => {
                              if (!aviso.lida) void marcar.mutateAsync(aviso.id);
                            }}
                            style={{ color: COR.tinta, fontWeight: PESO.medio }}
                          >
                            {pt.avisos.verTarefas}
                          </Link>
                        ) : null}
                        {aviso.lida ? null : (
                          <button
                            type="button"
                            onClick={() => void marcar.mutateAsync(aviso.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              color: COR.textoSuave,
                              fontSize: FONTE.nota,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                              borderRadius: RAIO.pequeno,
                            }}
                          >
                            {pt.avisos.marcarLido}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Pagina>
  );
}

interface GrupoDia {
  chave: string;
  titulo: string;
  avisos: Notificacao[];
}

/** Agrupa pelo dia a que o aviso diz respeito, mantendo a ordem da API (mais recente primeiro). */
function agruparPorDia(avisos: Notificacao[]): GrupoDia[] {
  const dia = paraIso(hoje());
  const ontem = paraIso(new Date(hoje().getTime() - 86_400_000));
  const grupos: GrupoDia[] = [];

  for (const aviso of avisos) {
    const chave = paraIso(aviso.referenteA);
    let grupo = grupos.find((g) => g.chave === chave);
    if (!grupo) {
      const titulo = chave === dia ? 'Hoje' : chave === ontem ? 'Ontem' : dataExtensa(aviso.referenteA);
      grupo = { chave, titulo, avisos: [] };
      grupos.push(grupo);
    }
    grupo.avisos.push(aviso);
  }
  return grupos;
}
