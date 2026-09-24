import { corBarraAvanco, dataCurta } from '@nexora/shared';
import { COR, FONTE, PESO, cartao, numerico } from '../design/tokens';
import { BarraAvanco, Carregando, EtiquetaVocabulario, Vazio } from '../components/base';
import { Pagina } from '../components/Layout';
import { useCarteira, useTarefas } from '../lib/queries';

/**
 * Os projectos onde a pessoa esta alocada, com a sua parte a vista.
 *
 * "A sua parte" e o que distingue este ecra da carteira da Direccao: nao interessa aqui o estado
 * geral do projecto tanto como saber o que, dentro dele, esta entregue a si.
 */
export function MeusProjectos() {
  const { data: carteira, isLoading } = useCarteira('todos');
  const { data: minhas } = useTarefas('todas', true);

  const porProjecto = new Map<string, string[]>();
  for (const t of minhas ?? []) {
    if (t.estado === 'concluida') continue;
    const lista = porProjecto.get(t.projecto.id) ?? [];
    lista.push(t.titulo);
    porProjecto.set(t.projecto.id, lista);
  }

  return (
    <Pagina
      titulo="Os meus projectos"
      subtitulo="Onde está alocada e qual é a sua parte"
      larguraMaxima={1000}
    >
      {isLoading ? (
        <Carregando />
      ) : !carteira?.projectos.length ? (
        <Vazio style={{ ...cartao, padding: 40 }}>Não está alocada a nenhum projecto activo.</Vazio>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {carteira.projectos.map((p) => {
            const minhaParte = porProjecto.get(p.id) ?? [];

            return (
              <article key={p.id} className="vn-cartao-lista" style={cartao}>
                <div className="vn-cartao-topo vn-cartao-topo-centro" style={{ marginBottom: 12 }}>
                  <div className="vn-cartao-titulo">
                    <div style={{ fontSize: FONTE.media, fontWeight: PESO.medio, lineHeight: 1.4 }}>{p.nome}</div>
                    <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 4 }}>
                      {p.cliente} · responsável {p.responsavel.nome} · entrega {dataCurta(p.deadline)}
                    </div>
                  </div>
                  <div className="vn-cartao-estado">
                    <EtiquetaVocabulario valor={p.estagio} />
                    <BarraAvanco pct={p.avancoPct} cor={corBarraAvanco(p.saude)} largura={120} />
                    <span style={{ fontSize: FONTE.base, fontWeight: PESO.forte, width: 40, textAlign: 'right', ...numerico }}>
                      {p.avancoPct}%
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    borderTop: `1px solid ${COR.linha}`,
                    paddingTop: 12,
                    fontSize: FONTE.corpo,
                    color: COR.texto,
                    lineHeight: 1.6,
                  }}
                >
                  {minhaParte.length ? (
                    <>
                      <span style={{ color: COR.suave }}>A sua parte: </span>
                      {minhaParte.join(' · ')}
                    </>
                  ) : (
                    <span style={{ color: COR.suave }}>
                      Sem tarefas suas em aberto neste projecto.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Pagina>
  );
}
