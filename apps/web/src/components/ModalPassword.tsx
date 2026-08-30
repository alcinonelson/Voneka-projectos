import { useEffect, useMemo, useState } from 'react';
import { COR, FONTE, PESO, RAIO, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { ErroApi, api, definirToken } from '../lib/api';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Alteracao da palavra-passe da propria conta.
 *
 * O servidor devolve um access token novo porque a alteracao derruba todas as sessoes, incluindo
 * esta. Guardar o token que vem na resposta e o que faz a pessoa continuar a trabalhar em vez de
 * ser atirada para o ecra de entrada a meio do que estava a fazer.
 */

const MINIMO = 12;

interface RespostaAuth {
  accessToken: string;
}

function forca(valor: string): { rotulo: string; cor: string; pontos: number } {
  const criterios = [
    valor.length >= MINIMO,
    valor.length >= 16,
    /[a-z]/.test(valor) && /[A-Z]/.test(valor),
    /\d/.test(valor),
    /[^A-Za-z0-9]/.test(valor),
  ].filter(Boolean).length;

  if (valor.length < MINIMO) {
    return { rotulo: `Faltam ${MINIMO - valor.length} caracteres`, cor: COR.vermelho, pontos: 1 };
  }
  if (criterios <= 2) return { rotulo: 'Fraca', cor: COR.ambar, pontos: 2 };
  if (criterios === 3) return { rotulo: 'Razoável', cor: COR.ambar, pontos: 3 };
  if (criterios === 4) return { rotulo: 'Boa', cor: COR.verde, pontos: 4 };
  return { rotulo: 'Forte', cor: COR.verde, pontos: 5 };
}

export function ModalPassword({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const toast = useToast();

  const [actual, setActual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [tocado, setTocado] = useState(false);
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!aberto) return;
    setActual('');
    setNova('');
    setConfirmacao('');
    setTocado(false);
    setErro(null);
    setCampos({});
  }, [aberto]);

  const medida = useMemo(() => forca(nova), [nova]);

  const erroConfirmacao =
    tocado && confirmacao && nova !== confirmacao ? 'As palavras-passe não coincidem.' : null;
  const repetida = tocado && nova.length > 0 && nova === actual ? 'Escolha uma diferente da actual.' : null;

  const valido =
    actual.length > 0 && nova.length >= MINIMO && nova === confirmacao && nova !== actual;

  async function submeter() {
    setTocado(true);
    if (!valido) return;

    setErro(null);
    setCampos({});
    setAGravar(true);
    try {
      const resposta = await api.post<RespostaAuth>('/auth/change-password', {
        actual,
        nova,
        confirmacao,
      });
      // A sessao antiga acabou de ser revogada no servidor; sem isto, o proximo pedido cairia.
      definirToken(resposta.accessToken);
      toast.mostrar('Palavra-passe alterada · as outras sessões foram terminadas');
      onFechar();
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro('Não foi possível contactar o servidor. Tente de novo.');
      }
    } finally {
      setAGravar(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Alterar a palavra-passe"
      subtitulo="Pedimos a actual mesmo com a sessão aberta — um terminal deixado aberto não pode chegar."
      largura={480}
      rodapeNota={
        valido
          ? 'Ao gravar, as sessões abertas noutros dispositivos são terminadas. Esta continua.'
          : 'Indique a actual e escolha uma nova com pelo menos 12 caracteres.'
      }
      rodapeErro={tocado && !valido}
      accao={{
        rotulo: 'Alterar palavra-passe',
        onClick: () => void submeter(),
        desactivada: !valido,
        aCarregar: aGravar,
      }}
    >
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
            marginBottom: 16,
            lineHeight: 1.55,
          }}
        >
          {erro}
        </div>
      ) : null}

      <div style={{ marginBottom: 18 }}>
        <label style={rotuloCampo} htmlFor="pw-actual">
          Palavra-passe actual
        </label>
        <input
          id="pw-actual"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          style={{ ...campo, borderColor: campos.actual ? COR.vermelhoBorda : COR.bordaForte }}
        />
        {campos.actual ? <div style={erroCampo}>{campos.actual}</div> : null}
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={rotuloCampo} htmlFor="pw-nova">
          Nova palavra-passe
        </label>
        <input
          id="pw-nova"
          type="password"
          autoComplete="new-password"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          onBlur={() => setTocado(true)}
          style={{
            ...campo,
            borderColor: repetida || campos.nova ? COR.vermelhoBorda : COR.bordaForte,
          }}
        />
        {repetida ? (
          <div style={erroCampo}>{repetida}</div>
        ) : campos.nova ? (
          <div style={erroCampo}>{campos.nova}</div>
        ) : nova ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ display: 'flex', gap: 3 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  style={{
                    width: 22,
                    height: 3,
                    borderRadius: 2,
                    background: n <= medida.pontos ? medida.cor : COR.linha,
                  }}
                />
              ))}
            </span>
            <span style={{ fontSize: FONTE.nota, color: medida.cor, fontWeight: PESO.medio }}>
              {medida.rotulo}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
            Pelo menos {MINIMO} caracteres.
          </div>
        )}
      </div>

      <div>
        <label style={rotuloCampo} htmlFor="pw-conf">
          Repita a nova palavra-passe
        </label>
        <input
          id="pw-conf"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          onBlur={() => setTocado(true)}
          style={{ ...campo, borderColor: erroConfirmacao ? COR.vermelhoBorda : COR.bordaForte }}
        />
        {erroConfirmacao ? <div style={erroCampo}>{erroConfirmacao}</div> : null}
      </div>
    </Modal>
  );
}
