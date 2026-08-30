import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { COR, FONTE, botaoPrincipal, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { CascaPublica, ErroFormulario } from '../components/CascaPublica';
import { pt } from '../i18n/pt';
import { ErroApi, api, definirToken } from '../lib/api';

/**
 * Recuperacao de palavra-passe.
 *
 * Dois estados no mesmo endereco: sem token pede o email; com token define a palavra-passe nova.
 * A resposta do pedido de email e sempre a mesma, exista ou nao a conta.
 */
export function Recuperar() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';

  return token ? <DefinirNova token={token} /> : <PedirLigacao />;
}

function PedirLigacao() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAEnviar(true);
    try {
      await api.post<null>('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setEnviado(pt.recuperar.enviado);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : pt.sessao.naoFoiPossivelContactar);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <CascaPublica
      titulo={pt.recuperar.tituloPedir}
      subtitulo={pt.recuperar.subtituloPedir}
      citacao={pt.recuperar.citacao}
      atribuicao="Voneka Projectos"
      rodape={
        <>
          {pt.recuperar.lembrouSe} <Link to="/entrar">{pt.recuperar.voltar}</Link>.
        </>
      }
    >
      {enviado ? (
        <p style={{ margin: 0, fontSize: FONTE.corpo, lineHeight: 1.68, color: COR.texto }}>{enviado}</p>
      ) : (
        <form onSubmit={(e) => void submeter(e)} noValidate>
          {erro ? <ErroFormulario mensagem={erro} /> : null}
          <div style={{ marginBottom: 22 }}>
            <label style={rotuloCampo} htmlFor="rec-email">
              Email
            </label>
            <input
              id="rec-email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.co.mz"
              style={campo}
            />
          </div>
          <button
            type="submit"
            disabled={!email.trim() || aEnviar}
            style={{
              ...botaoPrincipal,
              width: '100%',
              height: 42,
              justifyContent: 'center',
              background: email.trim() ? COR.tinta : COR.bordaForte,
              cursor: email.trim() && !aEnviar ? 'pointer' : 'not-allowed',
            }}
          >
            {aEnviar ? pt.recuperar.aEnviar : pt.recuperar.enviar}
          </button>
        </form>
      )}
    </CascaPublica>
  );
}

function DefinirNova({ token }: { token: string }) {
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
      const resposta = await api.post<{ accessToken: string }>('/auth/reset-password', {
        token,
        password,
        confirmacao,
      });
      definirToken(resposta.accessToken);
      window.location.replace('/');
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro(pt.recuperar.falhouDefinir);
      }
      setAGravar(false);
    }
  }

  return (
    <CascaPublica
      titulo={pt.recuperar.tituloNova}
      subtitulo={pt.recuperar.subtituloNova}
      citacao={pt.recuperar.citacaoNova}
      atribuicao="Voneka Projectos"
      rodape={
        <>
          {pt.recuperar.ligacaoInvalida} <Link to="/recuperar">{pt.recuperar.pedirOutra}</Link>.
        </>
      }
    >
      <form onSubmit={(e) => void submeter(e)} noValidate>
        {erro ? <ErroFormulario mensagem={erro} /> : null}
        <div style={{ marginBottom: 16 }}>
          <label style={rotuloCampo} htmlFor="rec-pass">
            {pt.recuperar.novaPassword}
          </label>
          <input
            id="rec-pass"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...campo, borderColor: campos.password || curta ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {curta ? <div style={erroCampo}>{pt.recuperar.curta}</div> : null}
          {campos.password ? <div style={erroCampo}>{campos.password}</div> : null}
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={rotuloCampo} htmlFor="rec-conf">
            {pt.recuperar.confirmacao}
          </label>
          <input
            id="rec-conf"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            style={{ ...campo, borderColor: campos.confirmacao || diferem ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {diferem ? <div style={erroCampo}>{pt.recuperar.diferem}</div> : null}
        </div>
        <button
          type="submit"
          disabled={!valido || aGravar}
          style={{
            ...botaoPrincipal,
            width: '100%',
            height: 42,
            justifyContent: 'center',
            background: valido ? COR.tinta : COR.bordaForte,
            cursor: valido && !aGravar ? 'pointer' : 'not-allowed',
          }}
        >
          {aGravar ? pt.recuperar.aGravar : pt.recuperar.definir}
        </button>
      </form>
    </CascaPublica>
  );
}
