import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import {
  MAX_SEMANAS_FASE,
  NOMES_CHIP,
  TIPO_TAXONOMIA,
  type TaxonomiaRef,
  type TipoTaxonomia,
  chip,
  reordenar,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, botaoSecundario, campo, cartao, rotuloCampo } from '../design/tokens';
import { pt } from '../i18n/pt';
import { ErroApi } from '../lib/api';
import {
  useActualizarEntradaVocabulario,
  useCriarEntradaVocabulario,
  useRemoverEntradaVocabulario,
  useReordenarVocabulario,
} from '../lib/queries';
import { useToast } from './Toast';

/**
 * Uma familia do vocabulario da empresa: as naturezas, os estagios ou os departamentos.
 *
 * Uma entrada em uso nao pode desaparecer - apagar a natureza "Concurso" deixaria dezenas de
 * projectos sem nome para o que sao. O botao diz-o antes de ser carregado: mostra "Arquivar"
 * quando ha registos a depender dela, e "Remover" quando nao ha. O servidor recusa na mesma, mas
 * uma recusa que a pessoa nao viu chegar e uma recusa mal desenhada.
 */

interface Rascunho {
  rotulo: string;
  cor: string;
  prefixo: string;
  fases: { nome: string; semanas: number }[];
}

const VAZIO: Rascunho = { rotulo: '', cor: 'neutro', prefixo: '', fases: [] };

export function EditorVocabulario({
  tipo,
  nota,
  entradas,
  onUsarSugestao,
  aGravarSugestao = false,
}: {
  tipo: TipoTaxonomia;
  nota: string;
  entradas: TaxonomiaRef[] | undefined;
  onUsarSugestao?: () => void;
  aGravarSugestao?: boolean;
}) {
  const criar = useCriarEntradaVocabulario();
  const actualizar = useActualizarEntradaVocabulario();
  const remover = useRemoverEntradaVocabulario();
  const reordenarVoc = useReordenarVocabulario();
  const toast = useToast();
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [aAbrir, setAAbrir] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ehNatureza = tipo === 'natureza';
  const lista = entradas ?? [];
  const activas = lista.filter((e) => !e.arquivado);
  const arquivadas = lista.filter((e) => e.arquivado);

  async function aoLargar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const de = activas.findIndex((e) => e.id === active.id);
    const para = activas.findIndex((e) => e.id === over.id);
    if (de < 0 || para < 0) return;
    const nova = reordenar(activas, de, para);
    try {
      await reordenarVoc.mutateAsync({ tipo, ids: nova.map((e) => e.id) });
      toast.mostrar(pt.vocabulario.ordemGravada);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : pt.vocabulario.falhouOrdem);
    }
  }

  async function gravar() {
    if (rascunho.rotulo.trim().length < 2) return;
    setErro(null);
    try {
      await criar.mutateAsync({
        tipo,
        rotulo: rascunho.rotulo.trim(),
        cor: rascunho.cor as 'azul',
        ...(ehNatureza && rascunho.prefixo.trim() ? { prefixo: rascunho.prefixo.trim() } : {}),
        fasesModelo: ehNatureza ? rascunho.fases.filter((f) => f.nome.trim()) : [],
      });
      toast.mostrar(`"${rascunho.rotulo.trim()}" ficou disponível`);
      setRascunho(VAZIO);
      setAAbrir(false);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível gravar.');
    }
  }

  async function apagar(entrada: TaxonomiaRef) {
    setErro(null);
    try {
      const resultado = await remover.mutateAsync(entrada.id);
      toast.mostrar(
        resultado.apagada
          ? `"${entrada.rotulo}" removido`
          : `"${entrada.rotulo}" foi arquivado: ainda classifica ${resultado.emUso} registo${resultado.emUso === 1 ? '' : 's'}.`,
      );
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível remover.');
    }
  }

  return (
    <section style={{ ...cartao, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: FONTE.titulo, fontWeight: PESO.forte, letterSpacing: '-0.01em' }}>
          {TIPO_TAXONOMIA[tipo]}
        </h2>
        <span style={{ fontSize: FONTE.nota, color: COR.suave }}>
          {lista.length ? `${lista.length} definida${lista.length === 1 ? '' : 's'}` : 'nenhuma ainda'}
        </span>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: FONTE.corpo, color: COR.textoSuave, lineHeight: 1.6 }}>
        {nota}
      </p>

      {lista.length ? (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={(evento) => void aoLargar(evento)}
        >
          <SortableContext items={activas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <ul style={{ listStyle: 'none', margin: '0 0 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activas.map((e) => (
                <LinhaVocabulario
                  key={e.id}
                  entrada={e}
                  ehNatureza={ehNatureza}
                  onApagar={() => void apagar(e)}
                />
              ))}
              {arquivadas.map((e) => (
                <LinhaVocabulario
                  key={e.id}
                  entrada={e}
                  ehNatureza={ehNatureza}
                  arrastavel={false}
                  onRepor={() => void actualizar.mutateAsync({ id: e.id, dados: { arquivado: false } })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {erro ? (
        <div
          role="alert"
          style={{
            background: COR.vermelhoFundo,
            border: `1px solid ${COR.vermelhoBorda}`,
            color: COR.vermelho,
            borderRadius: RAIO.campo,
            padding: '10px 12px',
            fontSize: FONTE.corpo,
            marginBottom: 14,
          }}
        >
          {erro}
        </div>
      ) : null}

      {aAbrir ? (
        <div style={{ border: `1px solid ${COR.borda}`, borderRadius: RAIO.campo, padding: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: ehNatureza ? '1fr 110px' : '1fr',
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={rotuloCampo} htmlFor={`voc-${tipo}`}>
                Como chama a isto
              </label>
              <input
                id={`voc-${tipo}`}
                autoFocus
                value={rascunho.rotulo}
                onChange={(e) => setRascunho((r) => ({ ...r, rotulo: e.target.value }))}
                placeholder={
                  ehNatureza ? 'Fiscalização de obra' : tipo === 'estagio' ? 'Em negociação' : 'Engenharia'
                }
                style={campo}
              />
            </div>
            {ehNatureza ? (
              <div>
                <label style={rotuloCampo} htmlFor={`voc-prefixo-${tipo}`}>
                  Prefixo
                </label>
                <input
                  id={`voc-prefixo-${tipo}`}
                  value={rascunho.prefixo}
                  maxLength={4}
                  onChange={(e) => setRascunho((r) => ({ ...r, prefixo: e.target.value.toUpperCase() }))}
                  placeholder="FIS"
                  style={{ ...campo, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            ) : null}
          </div>

          <div style={{ marginBottom: 14 }}>
            <span style={rotuloCampo}>Cor da etiqueta</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {NOMES_CHIP.map((c) => {
                const cores = chip(c);
                const activo = rascunho.cor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setRascunho((r) => ({ ...r, cor: c }))}
                    aria-label={`Cor ${c}`}
                    aria-pressed={activo}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: RAIO.campo,
                      border: `2px solid ${activo ? COR.tinta : COR.borda}`,
                      background: cores.bg,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{ width: 10, height: 10, borderRadius: 5, background: cores.ponto }}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {ehNatureza ? (
            <div style={{ marginBottom: 14 }}>
              <span style={rotuloCampo}>Fases com que um projecto deste tipo costuma começar</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rascunho.fases.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={f.nome}
                      onChange={(e) =>
                        setRascunho((r) => ({
                          ...r,
                          fases: r.fases.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)),
                        }))
                      }
                      placeholder="Nome da fase"
                      style={{ ...campo, flex: 1 }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={MAX_SEMANAS_FASE}
                      value={f.semanas}
                      onChange={(e) =>
                        setRascunho((r) => ({
                          ...r,
                          fases: r.fases.map((x, j) =>
                            j === i
                              ? { ...x, semanas: Math.min(MAX_SEMANAS_FASE, Math.max(1, Number(e.target.value) || 1)) }
                              : x,
                          ),
                        }))
                      }
                      style={{ ...campo, width: 74, fontVariantNumeric: 'tabular-nums' }}
                    />
                    <span style={{ fontSize: FONTE.corpo, color: COR.textoSuave, width: 54 }}>semanas</span>
                    <button
                      type="button"
                      onClick={() => setRascunho((r) => ({ ...r, fases: r.fases.filter((_, j) => j !== i) }))}
                      aria-label={`Remover a fase ${f.nome || i + 1}`}
                      style={{ ...botaoSecundario, height: 30, width: 30, padding: 0, justifyContent: 'center' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setRascunho((r) => ({ ...r, fases: [...r.fases, { nome: '', semanas: 4 }] }))
                  }
                  style={{ ...botaoSecundario, width: 'fit-content' }}
                >
                  Acrescentar fase
                </button>
              </div>
              <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>
                É só o ponto de partida. Quem regista o projecto pode reescrever o roteiro todo.
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void gravar()}
              disabled={rascunho.rotulo.trim().length < 2 || criar.isPending}
              style={{
                ...botaoPrincipal,
                background: rascunho.rotulo.trim().length < 2 ? COR.bordaForte : COR.tinta,
              }}
            >
              {criar.isPending ? 'A gravar…' : 'Gravar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRascunho(VAZIO);
                setAAbrir(false);
                setErro(null);
              }}
              style={botaoSecundario}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setAAbrir(true)} style={botaoPrincipal}>
            Acrescentar
          </button>
          {onUsarSugestao && !lista.length ? (
            <button
              type="button"
              onClick={onUsarSugestao}
              disabled={aGravarSugestao}
              style={botaoSecundario}
            >
              {aGravarSugestao ? 'A gravar…' : 'Usar um conjunto de partida'}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function LinhaVocabulario({
  entrada,
  ehNatureza,
  arrastavel = true,
  onApagar,
  onRepor,
}: {
  entrada: TaxonomiaRef;
  ehNatureza: boolean;
  arrastavel?: boolean;
  onApagar?: () => void;
  onRepor?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entrada.id,
    disabled: !arrastavel,
  });
  const cores = chip(entrada.cor);
  const emUso = entrada.emUso ?? 0;

  return (
    <li
      ref={setNodeRef}
      className="vn-entrada-vocab"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        border: `1px solid ${COR.borda}`,
        borderRadius: RAIO.campo,
        background: entrada.arquivado ? COR.fundoCampo : COR.branco,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
        zIndex: isDragging ? 2 : undefined,
      }}
    >
      {arrastavel ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={pt.vocabulario.arrastar}
          title={pt.vocabulario.arrastar}
          style={{
            border: 'none',
            background: 'transparent',
            color: COR.suave,
            cursor: 'grab',
            padding: 0,
            width: 16,
            fontFamily: 'inherit',
            lineHeight: 1,
          }}
        >
          ::
        </button>
      ) : (
        <span style={{ width: 16 }} />
      )}
      <span
        style={{ width: 10, height: 10, borderRadius: 5, background: cores.ponto, flex: '0 0 10px' }}
        aria-hidden="true"
      />
      <span
        style={{
          fontSize: FONTE.base,
          fontWeight: PESO.medio,
          color: entrada.arquivado ? COR.suave : COR.tinta,
        }}
      >
        {entrada.rotulo}
        {entrada.arquivado ? ' · arquivado' : ''}
      </span>
      {ehNatureza && entrada.prefixo ? (
        <span
          style={{
            fontSize: FONTE.minima,
            color: COR.textoSuave,
            background: COR.linha,
            padding: '3px 7px',
            borderRadius: RAIO.pequeno + 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {entrada.prefixo}-001
        </span>
      ) : null}
      {ehNatureza && entrada.fasesModelo.length ? (
        <span style={{ fontSize: FONTE.nota, color: COR.suave }}>
          {entrada.fasesModelo.length} fases de modelo
        </span>
      ) : null}

      <span className="vn-entrada-fim" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        {emUso ? (
          <span style={{ fontSize: FONTE.nota, color: COR.suave, whiteSpace: 'nowrap' }}>
            em uso em {emUso} registo{emUso === 1 ? '' : 's'}
          </span>
        ) : null}
        {entrada.arquivado ? (
          <button type="button" onClick={onRepor} style={{ ...botaoSecundario, height: 28, padding: '0 10px' }}>
            Repor
          </button>
        ) : (
          <button type="button" onClick={onApagar} style={{ ...botaoSecundario, height: 28, padding: '0 10px' }}>
            {emUso ? 'Arquivar' : 'Remover'}
          </button>
        )}
      </span>
    </li>
  );
}
