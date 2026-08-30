import { useEffect, useState } from 'react';
import { type RascunhoFase, dataCurta, paraIso, paraRascunho } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO } from '../design/tokens';
import { ErroApi } from '../lib/api';
import { useGravarRoteiro, useProjecto } from '../lib/queries';
import { EtiquetaVocabulario } from './base';
import { EditorFases } from './EditorFases';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Edicao do roteiro de um projecto ja registado.
 *
 * Ao gravar, as fases voltam a encadear-se pela ordem, com dois dias entre elas - o que significa
 * que gravar descarta os ajustes finos feitos por arrasto no roteiro. E deliberado: o editor
 * define o plano, o arrasto afina-o. O aviso no rodape diz isso antes de acontecer.
 */
export function ModalRoteiro({
  projectoId,
  onFechar,
}: {
  projectoId: string | null;
  onFechar: () => void;
}) {
  const { data: projecto } = useProjecto(projectoId);
  const gravar = useGravarRoteiro();
  const toast = useToast();

  const [fases, setFases] = useState<RascunhoFase[]>([]);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  useEffect(() => {
    if (!projecto) return;
    setFases(projecto.fases.map((f) => paraRascunho(f)));
    setErroServidor(null);
  }, [projecto]);

  if (!projectoId || !projecto) return null;

  const inicio = projecto.fases[0]?.startsOn ?? projecto.inicio;
  const valido = fases.some((f) => f.nome.trim());

  async function submeter() {
    if (!valido || !projecto) return;
    setErroServidor(null);
    try {
      const gravadas = await gravar.mutateAsync({
        projectoId: projecto.id,
        dados: {
          inicio: paraIso(inicio),
          fases: fases
            .filter((f) => f.nome.trim())
            .map((f) => ({ nome: f.nome.trim(), estado: f.estado, nota: f.nota, semanas: f.semanas })),
        },
      });
      const ultima = gravadas[gravadas.length - 1];
      toast.mostrar(
        `Roteiro de ${gravadas.length} fases gravado${
          ultima ? ` · ${dataCurta(gravadas[0]!.startsOn)} a ${dataCurta(ultima.endsOn)}` : ''
        }`,
      );
      onFechar();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível gravar o roteiro.');
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Editar fases"
      subtitulo={`${projecto.codigo} · ${projecto.nome}`}
      largura={760}
      rodapeNota={
        valido
          ? 'Ao gravar, as fases reencadeiam-se pela ordem com dois dias entre elas. Os ajustes feitos por arrasto no roteiro são substituídos por este plano.'
          : 'Dê nome a pelo menos uma fase.'
      }
      rodapeErro={!valido}
      accao={{
        rotulo: 'Gravar roteiro',
        onClick: () => void submeter(),
        desactivada: !valido,
        aCarregar: gravar.isPending,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          fontSize: FONTE.corpo,
          color: COR.textoSuave,
        }}
      >
        <EtiquetaVocabulario valor={projecto.natureza} comPonto />
        <span>· arranque {dataCurta(inicio)}</span>
        <span style={{ marginLeft: 'auto', color: COR.suave }}>Arraste ⠿ para reordenar</span>
      </div>

      <EditorFases fases={fases} inicio={inicio} onChange={setFases} />

      {erroServidor ? (
        <div
          role="alert"
          style={{
            marginTop: 18,
            background: COR.vermelhoFundo,
            color: COR.vermelho,
            border: `1px solid ${COR.vermelhoBorda}`,
            borderRadius: RAIO.campo,
            padding: '10px 12px',
            fontSize: FONTE.corpo,
          }}
        >
          {erroServidor}
        </div>
      ) : null}
    </Modal>
  );
}
