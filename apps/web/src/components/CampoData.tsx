import { useId } from 'react';
import { dataExtensa, formatarData, lerData, paraIso } from '@nexora/shared';
import { COR, FONTE, RAIO, campo, erroCampo, numerico, rotuloCampo } from '../design/tokens';

/**
 * Campo de data.
 *
 * Escrever `dd/mm/aaaa` a mao e rapido para quem ja o faz todos os dias e uma armadilha para quem
 * nao o faz: o formato falha em silencio e o erro so aparece ao submeter. Este campo aceita as
 * duas coisas - o texto, para quem escreve depressa, e o calendario do navegador, para quem
 * prefere apontar - e confirma por baixo, por extenso, que dia ficou escolhido. A confirmacao e o
 * que apanha o `03/04` que se queria `04/03`.
 */
export function CampoData({
  id,
  rotulo,
  valor,
  onChange,
  ajuda,
  erro,
  minimo,
}: {
  id?: string;
  rotulo: string;
  /** Texto no formato `dd/mm/aaaa`. Vazio significa por escolher. */
  valor: string;
  onChange: (texto: string) => void;
  ajuda?: string;
  erro?: string;
  /** Data minima aceite pelo calendario, no formato `aaaa-mm-dd`. */
  minimo?: string;
}) {
  const gerado = useId();
  const idTexto = id ?? `data-${gerado}`;
  const idCalendario = `${idTexto}-cal`;
  const data = lerData(valor);

  return (
    <div>
      <label style={rotuloCampo} htmlFor={idTexto}>
        {rotulo}
      </label>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          id={idTexto}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${idTexto}-erro` : undefined}
          style={{
            ...campo,
            ...numerico,
            flex: 1,
            borderColor: erro ? COR.vermelhoBorda : COR.bordaForte,
          }}
        />
        <label
          htmlFor={idCalendario}
          title="Escolher no calendário"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 38,
            flex: '0 0 38px',
            border: `1px solid ${COR.bordaForte}`,
            borderRadius: RAIO.campo,
            background: COR.branco,
            cursor: 'pointer',
            color: COR.textoSuave,
            fontSize: 15,
          }}
        >
          <span aria-hidden="true">▤</span>
          <span
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
            }}
          >
            Escolher {rotulo.toLowerCase()} no calendário
          </span>
        </label>
        <input
          id={idCalendario}
          type="date"
          value={data ? paraIso(data) : ''}
          min={minimo}
          onChange={(e) => {
            const escolhida = e.target.value ? new Date(`${e.target.value}T00:00:00Z`) : null;
            onChange(escolhida ? formatarData(escolhida) : '');
          }}
          // Fica fora do fluxo mas continua alcancavel: o rotulo acima e que o abre.
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          tabIndex={-1}
        />
      </div>

      {erro ? (
        <div id={`${idTexto}-erro`} style={erroCampo}>
          {erro}
        </div>
      ) : data ? (
        <div style={{ fontSize: FONTE.nota, color: COR.textoSuave, marginTop: 6 }}>{dataExtensa(data)}</div>
      ) : ajuda ? (
        <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6 }}>{ajuda}</div>
      ) : null}
    </div>
  );
}
