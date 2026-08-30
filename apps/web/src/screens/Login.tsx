import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { COR, FONTE, botaoPrincipal, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { CascaPublica, ErroFormulario } from '../components/CascaPublica';
import { ErroApi } from '../lib/api';
import { useSessao } from '../lib/auth';

/**
 * Entrada na aplicacao.
 *
 * Duas colunas: a razao de ser do produto a esquerda, o formulario a direita. Sem gradientes e
 * sem cartao a flutuar sobre uma fotografia - o que a plataforma promete e sobriedade, e a
 * primeira pagina responde por isso.
 *
 * O erro do servidor e mostrado tal como vem, porque ja diz a causa e o caminho de saida. O que
 * nao pode e transformar-se num "algo correu mal" que deixa a pessoa sem saber o que fazer.
 */
export function Login() {
  const { entrar } = useSessao();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aEntrar, setAEntrar] = useState(false);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCampos({});
    setAEntrar(true);
    try {
      await entrar(email.trim(), password);
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro('Não foi possível contactar o servidor. Verifique a ligação e tente de novo.');
      }
    } finally {
      setAEntrar(false);
    }
  }

  const podeEntrar = email.trim().length > 0 && password.length > 0;

  return (
    <CascaPublica
      titulo="Entre na sua conta"
      subtitulo="Use o email com que foi registado na sua empresa."
      citacao="O que a Direcção lê não é uma percentagem. É o que a pessoa escreveu ao fechar a tarefa."
      atribuicao="Voneka Projectos"
      rodape={
        <>
          Ainda não tem empresa no Voneka?{' '}
          <Link to="/criar-empresa">Criar a minha empresa</Link>.
          <br />
          Se foi convidado por email, abra a ligação do convite para definir a sua palavra-passe.
        </>
      }
    >
      <form onSubmit={(e) => void submeter(e)} noValidate>
        {erro ? <ErroFormulario mensagem={erro} /> : null}

        <div style={{ marginBottom: 16 }}>
          <label style={rotuloCampo} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@empresa.co.mz"
            style={{ ...campo, borderColor: campos.email ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {campos.email ? <div style={erroCampo}>{campos.email}</div> : null}
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={rotuloCampo} htmlFor="login-password">
            Palavra-passe
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...campo, borderColor: campos.password ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {campos.password ? <div style={erroCampo}>{campos.password}</div> : null}
        </div>

        <button
          type="submit"
          disabled={!podeEntrar || aEntrar}
          style={{
            ...botaoPrincipal,
            width: '100%',
            height: 42,
            justifyContent: 'center',
            background: podeEntrar ? COR.tinta : COR.bordaForte,
            cursor: podeEntrar && !aEntrar ? 'pointer' : 'not-allowed',
          }}
        >
          {aEntrar ? 'A entrar…' : 'Entrar'}
        </button>

        <p style={{ margin: '14px 0 0', fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.6 }}>
          Perdeu a palavra-passe? Peça ao Administrador da sua empresa que reenvie o convite —
          a ligação deixa-o definir uma nova.
        </p>
      </form>
    </CascaPublica>
  );
}
