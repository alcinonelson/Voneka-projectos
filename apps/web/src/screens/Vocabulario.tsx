import { TIPO_TAXONOMIA_NOTA, type TipoTaxonomia } from '@nexora/shared';
import { COR, FONTE, cartao } from '../design/tokens';
import { EditorVocabulario } from '../components/EditorVocabulario';
import { Pagina } from '../components/Layout';
import { useVocabulario } from '../lib/queries';

/**
 * Vocabulario da empresa.
 *
 * Antes isto era um enum no codigo: cinco naturezas e cinco estagios, iguais para toda a gente.
 * Uma empresa que faz fiscalizacao de obra nao classifica trabalho como uma que faz consultoria,
 * e obriga-la a traduzir mentalmente todos os dias e um custo que se paga em atencao.
 */
const FAMILIAS: TipoTaxonomia[] = ['natureza', 'estagio', 'departamento'];

export function Vocabulario() {
  const { data: naturezas } = useVocabulario('natureza', true);
  const { data: estagios } = useVocabulario('estagio', true);
  const { data: departamentos } = useVocabulario('departamento', true);

  const porTipo = { natureza: naturezas, estagio: estagios, departamento: departamentos };

  return (
    <Pagina
      acento={'#C3B5FD'}
      titulo="Vocabulário"
      subtitulo="As palavras com que a sua empresa nomeia o trabalho que faz"
      larguraMaxima={880}
    >
      <div style={{ ...cartao, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: FONTE.corpo, color: COR.textoSuave, lineHeight: 1.6 }}>
          Uma entrada que já classifica trabalho não é apagada: fica arquivada. Sai das listas de
          escolha e continua a ler-se nos projectos e nas pessoas que a usam.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {FAMILIAS.map((tipo) => (
          <EditorVocabulario
            key={tipo}
            tipo={tipo}
            nota={TIPO_TAXONOMIA_NOTA[tipo]}
            entradas={porTipo[tipo]}
          />
        ))}
      </div>
    </Pagina>
  );
}
