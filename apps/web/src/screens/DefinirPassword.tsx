import { useState, type FormEvent } from 'react';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, campo, erroCampo, rotuloCampo } from '../design/tokens';
import { Marca } from '../components/base';
import { ErroApi, api } from '../lib/api';
import { useSessao } from '../lib/auth';
import type { Utilizador } from '../lib/tipos';

const MINIMO = 12;

/**
 * Primeiro acesso com palavra-passe temporaria.
 *
 * A temporaria foi gerada pelo Administrador e passou pelas maos dele: enquanto a pessoa nao
 * escolher a sua, o servidor recusa tudo o resto. Este ecra substitui o portal inteiro, e nao
 * aparece por cima dele, porque nao ha nada no portal que se possa fazer entretanto.
 */
export function DefinirPassword() {
  const { utilizador, assumirSessao, sair } = useSessao();

  const [temporaria, setTemporaria] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [aGravar, setAGravar] = useState(false);

  const curta = nova.length > 0 && nova.length < MINIMO;
  const diferem = confirmacao.length > 0 && nova !== confirmacao;
  const repetida = nova.length > 0 && nova === temporaria;
  const valido = temporaria.length > 0 && nova.length >= MINIMO && nova === confirmacao && !repetida;

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if (!valido) return;
    setErro(null);
    setCampos({});
    setAGravar(true);
    try {
      const resposta = await api.post<{ utilizador: Utilizador; accessToken: string }>(
        '/auth/change-password',
        { actual: temporaria, nova, confirmacao },
      );
      // A sessao nova ja vem sem a marca de temporaria: e ela que abre o portal.
      assumirSessao(resposta.utilizador, resposta.accessToken);
    } catch (e) {
      if (e instanceof ErroApi) {
        setErro(e.message);
        setCampos(e.campos);
      } else {
        setErro('Não foi possível contactar o servidor. Tente de novo.');
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
      <div style={{ width: 400, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <Marca tamanho={34} />
          <div>
            <div style={{ fontSize: FONTE.titulo, fontWeight: PESO.forte, letterSpacing: '-0.01em' }}>VONEKA</div>
            <div style={{ fontSize: FONTE.minima, color: COR.suave, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Projectos
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.35 }}>
          Escolha a sua palavra-passe
        </h1>
        <p style={{ fontSize: FONTE.base, color: COR.textoSuave, margin: '0 0 26px', lineHeight: 1.6 }}>
          {utilizador?.nome ? `${utilizador.nome}, entrou` : 'Entrou'} com uma palavra-passe temporária,
          criada pela Direcção. Troque-a agora: a partir daqui só você a conhece.
        </p>

        <form onSubmit={(e) => void submeter(e)} noValidate>
          <div style={{ marginBottom: 16 }}>
            <label style={rotuloCampo} htmlFor="dp-temp">
              Palavra-passe temporária
            </label>
            <input
              id="dp-temp"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={temporaria}
              onChange={(e) => setTemporaria(e.target.value)}
              style={{ ...campo, borderColor: campos.actual ? COR.vermelhoBorda : COR.bordaForte }}
            />
            {campos.actual ? <div style={erroCampo}>{campos.actual}</div> : null}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={rotuloCampo} htmlFor="dp-nova">
              Nova palavra-passe
            </label>
            <input
              id="dp-nova"
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              style={{ ...campo, borderColor: curta || repetida || campos.nova ? COR.vermelhoBorda : COR.bordaForte }}
            />
            <div style={{ fontSize: FONTE.nota, color: curta || repetida ? COR.vermelho : COR.suave, marginTop: 6 }}>
              {repetida
                ? 'Tem de ser diferente da temporária.'
                : curta
                  ? `Faltam ${MINIMO - nova.length} caracteres.`
                  : campos.nova ?? `Pelo menos ${MINIMO} caracteres.`}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={rotuloCampo} htmlFor="dp-conf">
              Repita a nova palavra-passe
            </label>
            <input
              id="dp-conf"
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
            {aGravar ? 'A gravar…' : 'Gravar e entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void sair()}
          style={{
            display: 'block',
            margin: '18px auto 0',
            border: 'none',
            background: 'transparent',
            color: COR.textoSuave,
            fontSize: FONTE.corpo,
            fontFamily: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Sair sem trocar
        </button>
      </div>
    </div>
  );
}
