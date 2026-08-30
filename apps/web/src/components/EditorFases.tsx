import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ESTADO_FASE,
  MAX_SEMANAS_FASE,
  type RascunhoFase,
  cicloEstadoFase,
  corEstado,
  dataCurta,
  duracaoEmDias,
  reordenar,
  somarDias,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, campo, numerico } from '../design/tokens';
import { Etiqueta } from './base';

/**
 * Editor do roteiro de fases.
 *
 * As fases sao reordenaveis por arrasto e as datas recalculam-se enquanto se arrasta, para que a
 * consequencia de mover uma fase se veja antes de gravar. O estado cicla ao clique - Planeada,
 * Em curso, Concluida, Atrasada - como no design: quatro estados nao justificam um selector.
 *
 * O arrasto usa dnd-kit com um sensor que exige oito pixeis de movimento antes de comecar. Sem
 * essa distancia minima, escrever no campo de nome dentro de uma linha arrastavel tornava-se
 * uma luta.
 */
export function EditorFases({
  fases,
  inicio,
  onChange,
}: {
  fases: RascunhoFase[];
  /** Data de arranque do roteiro, para mostrar os periodos calculados. */
  inicio: Date | null;
  onChange: (fases: RascunhoFase[]) => void;
}) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function aoLargar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const de = Number(active.id);
    const para = Number(over.id);
    onChange(reordenar(fases, de, para));
  }

  function alterar(i: number, mudanca: Partial<RascunhoFase>) {
    onChange(fases.map((f, k) => (k === i ? { ...f, ...mudanca } : f)));
  }

  function remover(i: number) {
    if (fases.length <= 1) return;
    onChange(fases.filter((_, k) => k !== i));
  }

  // Os periodos sao encadeados aqui para acompanhar o arrasto sem esperar pelo servidor.
  let cursor = inicio;
  const periodos = fases.map((f) => {
    if (!cursor) return '—';
    const dias = duracaoEmDias(f.semanas);
    const fim = somarDias(cursor, dias);
    const texto = `${dataCurta(cursor)}–${dataCurta(fim)}`;
    cursor = somarDias(fim, 2);
    return texto;
  });

  const totalSemanas = fases.reduce((a, f) => a + f.semanas, 0);

  return (
    <div>
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={aoLargar}
      >
        <SortableContext items={fases.map((_, i) => i)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fases.map((fase, i) => (
              <LinhaFase
                key={i}
                indice={i}
                fase={fase}
                periodo={periodos[i] ?? '—'}
                podeRemover={fases.length > 1}
                onAlterar={(m) => alterar(i, m)}
                onRemover={() => remover(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => onChange([...fases, { nome: '', estado: 'planeada', nota: '', semanas: 2 }])}
          style={{
            height: 32,
            padding: '0 12px',
            border: `1px dashed ${COR.bordaForte}`,
            background: COR.branco,
            borderRadius: RAIO.campo,
            fontSize: FONTE.corpo,
            fontWeight: PESO.medio,
            color: COR.texto,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Acrescentar fase
        </button>
        <span style={{ fontSize: FONTE.nota, color: COR.suave, ...numerico }}>
          {fases.length} {fases.length === 1 ? 'fase' : 'fases'} · {totalSemanas} semanas de plano
        </span>
      </div>
    </div>
  );
}

function LinhaFase({
  indice,
  fase,
  periodo,
  podeRemover,
  onAlterar,
  onRemover,
}: {
  indice: number;
  fase: RascunhoFase;
  periodo: string;
  podeRemover: boolean;
  onAlterar: (mudanca: Partial<RascunhoFase>) => void;
  onRemover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: indice,
  });
  const estado = corEstado(fase.estado);
  const vazio = !fase.nome.trim();

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 11px',
        border: `1px solid ${vazio ? COR.vermelhoBorda : COR.borda}`,
        borderRadius: RAIO.medio,
        background: COR.branco,
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging ? '0 6px 16px rgba(16, 24, 40, 0.22)' : 'none',
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
      }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar a fase ${fase.nome || indice + 1}`}
        style={{
          width: 20,
          height: 26,
          border: 'none',
          background: 'transparent',
          color: COR.bordaForte,
          cursor: 'grab',
          fontSize: 13,
          lineHeight: 1,
          padding: 0,
          touchAction: 'none',
        }}
      >
        ⠿
      </button>

      <span style={{ fontSize: FONTE.minima, color: COR.suave, width: 14, ...numerico }}>{indice + 1}</span>

      <input
        value={fase.nome}
        onChange={(e) => onAlterar({ nome: e.target.value })}
        placeholder="Nome da fase"
        style={{ ...campo, flex: 1, height: 32, border: 'none', padding: '0 4px' }}
      />

      <span style={{ fontSize: FONTE.minima, color: COR.suave, width: 96, textAlign: 'right', ...numerico }}>
        {periodo}
      </span>

      <button
        type="button"
        onClick={() => onAlterar({ estado: cicloEstadoFase(fase.estado) })}
        title="Clique para mudar o estado"
        style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', width: 92 }}
      >
        <Etiqueta fg={estado.fg} bg={estado.bg}>
          {ESTADO_FASE[fase.estado]}
        </Etiqueta>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <BotaoPasso
          rotulo="−"
          onClick={() => onAlterar({ semanas: Math.max(1, fase.semanas - 1) })}
          desactivado={fase.semanas <= 1}
        />
        <span
          style={{
            width: 48,
            textAlign: 'center',
            fontSize: FONTE.corpo,
            fontWeight: PESO.medio,
            ...numerico,
          }}
        >
          {fase.semanas} sem
        </span>
        <BotaoPasso
          rotulo="+"
          onClick={() => onAlterar({ semanas: Math.min(MAX_SEMANAS_FASE, fase.semanas + 1) })}
          desactivado={fase.semanas >= MAX_SEMANAS_FASE}
        />
      </div>

      <button
        type="button"
        onClick={onRemover}
        disabled={!podeRemover}
        aria-label="Remover fase"
        title={podeRemover ? 'Remover fase' : 'Um roteiro precisa de pelo menos uma fase'}
        style={{
          width: 26,
          height: 26,
          border: 'none',
          background: 'transparent',
          color: podeRemover ? COR.suave : COR.borda,
          cursor: podeRemover ? 'pointer' : 'not-allowed',
          fontSize: 14,
          borderRadius: RAIO.botao,
        }}
      >
        ×
      </button>
    </div>
  );
}

function BotaoPasso({
  rotulo,
  onClick,
  desactivado,
}: {
  rotulo: string;
  onClick: () => void;
  desactivado: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivado}
      style={{
        width: 24,
        height: 24,
        border: `1px solid ${COR.borda}`,
        background: COR.branco,
        color: desactivado ? COR.borda : COR.texto,
        borderRadius: RAIO.botao,
        cursor: desactivado ? 'not-allowed' : 'pointer',
        fontSize: 13,
        lineHeight: 1,
        padding: 0,
      }}
    >
      {rotulo}
    </button>
  );
}
