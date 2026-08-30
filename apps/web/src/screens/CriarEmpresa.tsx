import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { emailValido } from '@nexora/shared';
import { COR, FONTE, PESO, botaoPrincipal, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { CascaPublica, ErroFormulario } from '../components/CascaPublica';
import { ErroApi, api } from '../lib/api';
import { useSessao } from '../lib/auth';
import type { Utilizador } from '../lib/tipos';

/**
 * Criacao de uma empresa.
 *
 * Duas coisas ao mesmo tempo, e de proposito: a empresa e a conta de quem a vai gerir. Pedir
 * primeiro uma e depois a outra deixaria empresas sem dono a ocupar nomes.
 *
 * Terminado o registo, a pessoa entra directamente - ja provou quem e ao escolher a palavra-passe,
 * e obriga-la a escreve-la outra vez a seguir seria burocracia sem ganho.
 */

interface RespostaRegisto {
  utilizador: Utilizador;
  empresa: { id: string; nome: string; moeda: string; slug: string };
  accessToken: string;
}

const MIN_PASSWORD = 12;

/** Leitura da forca da palavra-passe, em palavras e nao numa barra colorida sem legenda. */
function forcaPassword(valor: string): { rotulo: string; cor: string; pontos: number } {
  const criterios = [
    valor.length >= MIN_PASSWORD,
    valor.length >= 16,
    /[a-z]/.test(valor) && /[A-Z]/.test(valor),
    /\d/.test(valor),
    /[^A-Za-z0-9]/.test(valor),
  ].filter(Boolean).length;

  if (valor.length < MIN_PASSWORD) {
    return { rotulo: `Faltam ${MIN_PASSWORD - valor.length} caracteres`, cor: COR.vermelho, pontos: 1 };
  }
  if (criterios <= 2) return { rotulo: 'Fraca', cor: COR.ambar, pontos: 2 };
  if (criterios === 3) return { rotulo: 'Razoável', cor: COR.ambar, pontos: 3 };
  if (criterios === 4) return { rotulo: 'Boa', cor: COR.verde, pontos: 4 };
  return { rotulo: 'Forte', cor: COR.verde, pontos: 5 };
}

export function CriarEmpresa() {
  const { assumirSessao } = useSessao();
  const navegar = useNavigate();

  const [empresa, setEmpresa] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [tocado, setTocado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aCriar, setACriar] = useState(false);

  const forca = useMemo(() => forcaPassword(password), [password]);

  const erroEmpresa = tocado && empresa.trim().length < 2 ? 'Escreva o nome da empresa.' : null;
  const erroNome = tocado && nome.trim().length < 3 ? 'Escreva o seu nome completo.' : null;
  const erroEmail =
    tocado && !emailValido(email)
      ? email.trim()
        ? 'Esse email não parece válido.'
        : 'O email é a credencial com que vai entrar.'
      : (campos.email ?? null);
  const erroConfirmacao =
    tocado && confirmacao && password !== confirmacao ? 'As palavras-passe não coincidem.' : null;

  const valido =
    empresa.trim().length >= 2 &&
    nome.trim().length >= 3 &&
    emailValido(email) &&
    password.length >= MIN_PASSWORD &&
    password === confirmacao;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    setTocado(true);
    if (!valido) return;

    setErro(null);
    setCampos({});
    setACriar(true);
    try {
      const resposta = await api.post<RespostaRegisto>('/auth/register-company', {
        empresa: { nome: empresa.trim(), moeda: 'MZN' },
        administrador: {
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmacao,
        },
      });
      assumirSessao(resposta.utilizador, resposta.accessToken);
      navegar('/arranque', { replace: true });
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro('Não foi possível contactar o servidor. Verifique a ligação e tente de novo.');
      }
    } finally {
      setACriar(false);
    }
  }

  return (
    <CascaPublica
      titulo="Criar a sua empresa"
      subtitulo="Cria a empresa e a sua conta de Administrador. A seguir define como a empresa trabalha."
      citacao="Cada empresa nomeia o seu trabalho à sua maneira. O sistema aprende as suas palavras, não o contrário."
      atribuicao="Voneka Projectos"
      rodape={
        <>
          Já tem conta? <Link to="/entrar">Entrar</Link>.
        </>
      }
    >
      <form onSubmit={(e) => void submeter(e)} noValidate>
        {erro ? <ErroFormulario mensagem={erro} /> : null}

        <div style={{ marginBottom: 20 }}>
          <label style={rotuloCampo} htmlFor="ce-empresa">
            Nome da empresa
          </label>
          <input
            id="ce-empresa"
            autoFocus
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            onBlur={() => setTocado(true)}
            placeholder="Sociedade de Consultoria do Índico"
            style={{ ...campo, borderColor: erroEmpresa ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroEmpresa ? <div style={erroCampo}>{erroEmpresa}</div> : null}
        </div>

        <div
          style={{
            fontSize: FONTE.minima,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: COR.suave,
            fontWeight: PESO.medio,
            paddingTop: 4,
            marginBottom: 14,
            borderTop: `1px solid ${COR.linha}`,
          }}
        >
          <span style={{ display: 'block', paddingTop: 16 }}>A sua conta de Administrador</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={rotuloCampo} htmlFor="ce-nome">
            O seu nome
          </label>
          <input
            id="ce-nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => setTocado(true)}
            style={{ ...campo, borderColor: erroNome ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroNome ? <div style={erroCampo}>{erroNome}</div> : null}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={rotuloCampo} htmlFor="ce-email">
            Email
          </label>
          <input
            id="ce-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTocado(true)}
            placeholder="nome@empresa.co.mz"
            style={{ ...campo, borderColor: erroEmail ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroEmail ? <div style={erroCampo}>{erroEmail}</div> : null}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={rotuloCampo} htmlFor="ce-password">
            Palavra-passe
          </label>
          <input
            id="ce-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={campo}
          />
          {password ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ display: 'flex', gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    style={{
                      width: 22,
                      height: 3,
                      borderRadius: 2,
                      background: n <= forca.pontos ? forca.cor : COR.linha,
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: FONTE.nota, color: forca.cor, fontWeight: PESO.medio }}>
                {forca.rotulo}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
              Pelo menos {MIN_PASSWORD} caracteres. Esta conta vê toda a carteira da empresa.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={rotuloCampo} htmlFor="ce-conf">
            Repita a palavra-passe
          </label>
          <input
            id="ce-conf"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            onBlur={() => setTocado(true)}
            style={{ ...campo, borderColor: erroConfirmacao ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroConfirmacao ? <div style={erroCampo}>{erroConfirmacao}</div> : null}
        </div>

        <button
          type="submit"
          disabled={aCriar}
          style={{
            ...botaoPrincipal,
            width: '100%',
            height: 42,
            justifyContent: 'center',
            background: valido ? COR.tinta : COR.bordaForte,
            cursor: aCriar ? 'progress' : valido ? 'pointer' : 'not-allowed',
          }}
        >
          {aCriar ? 'A criar a empresa…' : 'Criar empresa e entrar'}
        </button>
      </form>
    </CascaPublica>
  );
}
