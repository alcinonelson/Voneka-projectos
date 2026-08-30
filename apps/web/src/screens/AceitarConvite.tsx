import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { Marca } from '../components/base';
import { ErroApi, api, definirToken } from '../lib/api';

/**
 * Aceitacao de convite.
 *
 * A pessoa chega aqui pela ligacao do email e define a palavra-passe, o que activa a conta. O
 * minimo de doze caracteres e o mesmo que o servidor exige - dito antes de escrever, e nao
 * depois de recusar.
 */
export function AceitarConvite() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aGravar, setAGravar] = useState(false);

  const curta = password.length > 0 && password.length < 12;
  const diferem = confirmacao.length > 0 && password !== confirmacao;
  const valido = password.length >= 12 && password === confirmacao;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (!valido) return;
    setErro(null);
    setCampos({});
    setAGravar(true);
    try {
      const resposta = await api.post<{ accessToken: string }>('/auth/accept-invite', {
        token,
        password,
        confirmacao,
      });
      definirToken(resposta.accessToken);
      // Recarrega para que a sessao seja retomada pelo provedor com a conta ja activa.
      window.location.replace('/');
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro('Não foi possível activar a conta.');
      }
      setAGravar(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: COR.fundo,
        padding: 24,
      }}
    >
      <div style={{ width: 380, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Marca tamanho={34} />
          <div>
            <div style={{ fontSize: FONTE.titulo, fontWeight: PESO.forte, letterSpacing: '-0.01em' }}>VONEKA</div>
            <div
              style={{
                fontSize: FONTE.minima,
                color: COR.suave,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Projectos
            </div>
          </div>
        </div>

        {!token ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
              Convite em falta
            </h1>
            <p style={{ fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
              Esta ligação não traz um convite válido. Use a ligação completa que recebeu por email, ou peça à
              Direcção que a reenvie.
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: 22,
                fontWeight: PESO.forte,
                letterSpacing: '-0.02em',
                margin: '0 0 8px',
                lineHeight: 1.35,
              }}
            >
              Defina a sua palavra-passe
            </h1>
            <p style={{ fontSize: FONTE.base, color: COR.textoSuave, margin: '0 0 26px', lineHeight: 1.6 }}>
              A conta já existe; falta apenas a credencial. A partir daqui entra com o seu email.
            </p>

            <form onSubmit={(e) => void submeter(e)} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label style={rotuloCampo} htmlFor="pw">
                  Palavra-passe
                </label>
                <input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...campo, borderColor: curta || campos.password ? COR.vermelhoBorda : COR.bordaForte }}
                />
                <div style={{ fontSize: FONTE.nota, color: curta ? COR.vermelho : COR.suave, marginTop: 6 }}>
                  {curta
                    ? `Faltam ${12 - password.length} caracteres.`
                    : 'Pelo menos 12 caracteres. Esta conta vê a carteira da organização.'}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={rotuloCampo} htmlFor="pw2">
                  Confirmar
                </label>
                <input
                  id="pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  style={{ ...campo, borderColor: diferem ? COR.vermelhoBorda : COR.bordaForte }}
                />
                {diferem ? <div style={erroCampo}>As palavras-passe não coincidem.</div> : null}
              </div>

              {erro ? (
                <div
                  role="alert"
                  style={{
                    background: COR.vermelhoFundo,
                    color: COR.vermelho,
                    border: `1px solid ${COR.vermelhoBorda}`,
                    borderRadius: RAIO.campo,
                    padding: '10px 12px',
                    fontSize: FONTE.corpo,
                    marginBottom: 16,
                    lineHeight: 1.5,
                  }}
                >
                  {erro}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!valido || aGravar}
                style={{
                  ...botaoPrincipal,
                  width: '100%',
                  height: 38,
                  justifyContent: 'center',
                  background: valido ? COR.tinta : COR.bordaForte,
                  cursor: valido ? 'pointer' : 'not-allowed',
                }}
              >
                {aGravar ? 'A activar…' : 'Activar conta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
