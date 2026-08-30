import { SITUACAO, VALIDACAO, corSituacao, dataLonga } from '@nexora/shared';
import { COR, ESPACO, FONTE, PESO, cartao, numerico } from '../design/tokens';
import { Carregando, Etiqueta, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { useRelatorios } from '../lib/queries';

/**
 * Os relatorios de quem esta a ver, com o estado de validacao.
 *
 * O estado importa: um relatorio ainda por validar significa que a entrega nao esta fechada do
 * lado da gestao, e quem o escreveu tem direito a saber isso sem ter de perguntar.
 */
export function MeusRelatorios() {
  const { data, isLoading } = useRelatorios(true);

  return (
    <Pagina
      titulo="Os meus relatórios"
      subtitulo="O que reportou e o estado de validação"
      larguraMaxima={900}
    >
      {isLoading ? (
        <Carregando />
      ) : !data?.relatorios.length ? (
        <Vazio style={{ ...cartao, padding: 40 }}>
          Ainda não submeteu nenhum relatório. Aparecem aqui quando fechar a primeira tarefa.
        </Vazio>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.relatorios.map((r) => {
            const situacao = corSituacao(r.situacao);
            const porValidar = r.validacao === 'a_espera';

            return (
              <article key={r.id} style={{ ...cartao, padding: `18px ${ESPACO.cartao}px` }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: FONTE.linha, fontWeight: PESO.medio }}>
                      {r.tarefa.titulo}
                    </span>
                    <span style={{ display: 'block', fontSize: FONTE.nota, color: COR.suave, marginTop: 3 }}>
                      {r.projecto.nome} · {dataLonga(r.createdAt)}
                    </span>
                  </span>
                  <Etiqueta fg={situacao.fg} bg={situacao.bg}>
                    {SITUACAO[r.situacao]}
                  </Etiqueta>
                </header>

                <p style={{ fontSize: FONTE.linha, lineHeight: 1.68, margin: '0 0 14px', textWrap: 'pretty' }}>
                  {r.texto}
                </p>

                <footer
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: 12,
                    borderTop: `1px solid ${COR.linha}`,
                    fontSize: FONTE.nota,
                  }}
                >
                  <span style={{ color: COR.suave, ...numerico }}>{r.esforcoRealHoras}h declaradas</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: porValidar ? COR.ambar : r.validacao === 'escalado' ? COR.ambar : COR.verde,
                      fontWeight: PESO.medio,
                    }}
                  >
                    {VALIDACAO[r.validacao]}
                    {r.validadoPor ? ` por ${r.validadoPor}` : ''}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}
