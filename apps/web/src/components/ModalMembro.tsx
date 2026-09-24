import { useEffect, useState } from 'react';
import {
  ALOCACOES_SUGERIDAS,
  MODO_ACESSO,
  NIVEIS_ACESSO,
  NIVEL_ACESSO,
  NIVEL_ACESSO_NOTA,
  type AcessoEmitido,
  type ModoAcesso,
  type NivelAcesso,
  emailValido,
  formatarData,
  hoje,
  lerData,
  paraIso,
} from '@nexora/shared';
import {
  COR,
  FONTE,
  PESO,
  RAIO,
  botaoSecundario,
  campo,
  erroCampo,
  numerico,
  pastilha,
  rotuloCampo,
} from '../design/tokens';
import { ErroApi } from '../lib/api';
import { useSessao } from '../lib/auth';
import {
  useActualizarMembro,
  useCarteira,
  useCriarMembro,
  useGerarPasswordTemporaria,
  useReenviarConvite,
  useVocabulario,
} from '../lib/queries';
import type { MembroEquipa } from '../lib/tipos';
import { CampoData } from './CampoData';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Registo de um membro, que e o mesmo que criar a conta.
 *
 * O nivel de acesso vem com a sua consequencia escrita por baixo. Escolher entre tres palavras
 * sem saber o que cada uma abre e como assinar sem ler; a nota diz exactamente o que a pessoa
 * passa a poder fazer.
 *
 * O acesso e escolhido e nao presumido. Enquanto nao ha email configurado, "enviar convite por
 * email" era uma promessa que o servidor nao cumpria; agora a ligacao ou a palavra-passe voltam
 * para o Administrador, que as entrega pelo canal que tiver.
 */

const NOTA_ACESSO: Record<ModoAcesso, string> = {
  ligacao: 'Recebe uma ligação para definir a palavra-passe. Válida 7 dias.',
  password: 'Entra já com uma palavra-passe gerada aqui, e troca-a no primeiro acesso.',
  nenhum: 'A conta existe para atribuir trabalho, mas ninguém entra nela até lhe dar acesso.',
};

const MODOS: ModoAcesso[] = ['ligacao', 'password', 'nenhum'];

export function ModalMembro({
  aberto,
  onFechar,
  membro,
  onAcesso,
}: {
  aberto: boolean;
  onFechar: () => void;
  membro?: MembroEquipa | null;
  /** Recebe a ligacao ou a palavra-passe acabada de emitir, para a mostrar ao Administrador. */
  onAcesso: (acesso: AcessoEmitido, nome: string) => void;
}) {
  const aEditar = Boolean(membro);
  const { utilizador } = useSessao();
  const { data: carteira } = useCarteira('todos');
  const { data: departamentos } = useVocabulario('departamento');
  const criar = useCriarMembro();
  const actualizar = useActualizarMembro();
  const reenviar = useReenviarConvite();
  const gerarPassword = useGerarPasswordTemporaria();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [funcao, setFuncao] = useState('');
  const [departamentoId, setDepartamentoId] = useState<string | null>(null);
  const [entrada, setEntrada] = useState(formatarData(hoje()));
  const [alocacao, setAlocacao] = useState(100);
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>('colaborador');
  const [projectos, setProjectos] = useState<string[]>([]);
  const [acesso, setAcesso] = useState<ModoAcesso>('ligacao');
  const [tocado, setTocado] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!aberto) return;
    setNome(membro?.nome ?? '');
    setEmail(membro?.email ?? '');
    setTelefone(membro?.telefone ?? '');
    setFuncao(membro?.funcao ?? '');
    setDepartamentoId(membro?.departamento?.id ?? null);
    setEntrada(formatarData(membro?.dataEntrada ?? hoje()));
    setAlocacao(membro?.alocacao ?? 100);
    setNivelAcesso(membro?.nivelAcesso ?? 'colaborador');
    setProjectos(membro?.projectos ?? []);
    setAcesso('ligacao');
    setTocado(false);
    setErroServidor(null);
    setCampos({});
  }, [aberto, membro]);

  const dataEntrada = lerData(entrada);
  const erroNome = tocado && nome.trim().length < 3 ? 'Indique o nome completo.' : campos.nome;
  const erroEmail =
    tocado && !emailValido(email)
      ? email.trim()
        ? 'Formato de email inválido.'
        : 'O email é a credencial de acesso.'
      : campos.email;
  const erroFuncao =
    tocado && !funcao.trim() ? 'Indique a função que a pessoa desempenha.' : campos.funcao;

  const valido =
    nome.trim().length >= 3 &&
    (aEditar || emailValido(email)) &&
    funcao.trim().length > 0 &&
    dataEntrada !== null;

  async function submeter() {
    if (!valido || !dataEntrada) {
      setTocado(true);
      return;
    }
    setErroServidor(null);
    setCampos({});
    try {
      if (membro) {
        await actualizar.mutateAsync({
          id: membro.id,
          dados: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            funcao: funcao.trim(),
            departamentoId,
            dataEntrada: paraIso(dataEntrada),
            alocacao,
            nivelAcesso,
            projectos,
          },
        });
        toast.mostrar(`Ficha de ${nome.trim()} actualizada`);
      } else {
        const resultado = await criar.mutateAsync({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim(),
          funcao: funcao.trim(),
          departamentoId,
          dataEntrada: paraIso(dataEntrada),
          alocacao,
          nivelAcesso,
          projectos,
          acesso,
        });
        toast.mostrar(`${resultado.membro.nome} registado como ${NIVEL_ACESSO[nivelAcesso]}`);
        onFechar();
        if (resultado.acesso) onAcesso(resultado.acesso, resultado.membro.nome);
        return;
      }
      onFechar();
    } catch (e) {
      if (e instanceof ErroApi) {
        setErroServidor(e.message);
        setCampos(e.campos);
      } else {
        setErroServidor(aEditar ? 'Não foi possível actualizar a ficha.' : 'Não foi possível criar a conta.');
      }
    }
  }

  /** Nova ligacao ou nova palavra-passe temporaria para um membro ja registado. */
  async function darAcesso(modo: 'ligacao' | 'password') {
    if (!membro) return;
    setErroServidor(null);
    try {
      const emitido =
        modo === 'ligacao'
          ? await reenviar.mutateAsync(membro.id)
          : await gerarPassword.mutateAsync(membro.id);
      onFechar();
      onAcesso(emitido, membro.nome);
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível gerar o acesso.');
    }
  }

  async function alterarActivo(activo: boolean) {
    if (!membro) return;
    setErroServidor(null);
    try {
      await actualizar.mutateAsync({ id: membro.id, dados: { activo } });
      toast.mostrar(
        activo
          ? `${membro.nome} voltou a poder entrar`
          : `${membro.nome} deixa de entrar; o histórico mantém-se`,
      );
      onFechar();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível alterar a conta.');
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={aEditar ? 'Editar ficha' : 'Registar membro'}
      subtitulo={
        aEditar
          ? 'Altere o que mudou. O email continua a ser a credencial e não se troca aqui.'
          : 'Criar o membro cria a conta de utilizador. O email é a credencial de acesso.'
      }
      largura={720}
      rodapeNota={
        valido
          ? `Acesso ${NIVEL_ACESSO[nivelAcesso]} · ${projectos.length} ${projectos.length === 1 ? 'projecto atribuído' : 'projectos atribuídos'}`
          : aEditar
            ? 'Nome e função são obrigatórios'
            : 'Nome, email válido e função são obrigatórios'
      }
      rodapeErro={!valido && tocado}
      accao={{
        rotulo: aEditar
          ? 'Gravar ficha'
          : acesso === 'ligacao'
            ? 'Criar conta e gerar ligação'
            : acesso === 'password'
              ? 'Criar conta e gerar palavra-passe'
              : 'Criar conta',
        onClick: () => void submeter(),
        desactivada: !valido,
        aCarregar: criar.isPending || actualizar.isPending,
      }}
    >
      <div className="vn-campos vn-campos-2" style={{ marginBottom: 18 }}>
        <div>
          <label style={rotuloCampo} htmlFor="mb-nome">
            Nome completo
          </label>
          <input
            id="mb-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => setTocado(true)}
            style={{ ...campo, borderColor: erroNome ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroNome ? <div style={erroCampo}>{erroNome}</div> : null}
        </div>
        <div>
          <label style={rotuloCampo} htmlFor="mb-email">
            Email
          </label>
          <input
            id="mb-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTocado(true)}
            placeholder="nome.apelido@empresa.co.mz"
            disabled={aEditar}
            style={{
              ...campo,
              borderColor: erroEmail ? COR.vermelhoBorda : COR.bordaForte,
              color: aEditar ? COR.suave : COR.tinta,
            }}
          />
          {erroEmail ? <div style={erroCampo}>{erroEmail}</div> : null}
        </div>
      </div>

      <div className="vn-campos vn-campos-3" style={{ marginBottom: 18 }}>
        <div>
          <label style={rotuloCampo} htmlFor="mb-funcao">
            Função
          </label>
          <input
            id="mb-funcao"
            value={funcao}
            onChange={(e) => setFuncao(e.target.value)}
            onBlur={() => setTocado(true)}
            placeholder="Analista de Processos"
            style={{ ...campo, borderColor: erroFuncao ? COR.vermelhoBorda : COR.bordaForte }}
          />
          {erroFuncao ? <div style={erroCampo}>{erroFuncao}</div> : null}
        </div>
        <div>
          <label style={rotuloCampo} htmlFor="mb-tel">
            Telefone
          </label>
          <input
            id="mb-tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+258 84 000 0000"
            style={{ ...campo, ...numerico }}
          />
        </div>
        <CampoData
          id="mb-entrada"
          rotulo="Data de entrada"
          valor={entrada}
          onChange={setEntrada}
          erro={tocado && dataEntrada === null ? 'Indique a data de entrada.' : undefined}
        />
      </div>

      <div className="vn-campos vn-campos-2" style={{ marginBottom: 18 }}>
        <div>
          <span style={rotuloCampo}>Departamento</span>
          {departamentos?.length ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {departamentos.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepartamentoId(departamentoId === d.id ? null : d.id)}
                  style={pastilha(departamentoId === d.id)}
                >
                  {d.rotulo}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.5 }}>
              A empresa ainda não tem departamentos definidos. Pode registar a pessoa na mesma e
              atribuir-lhe um departamento mais tarde, em Empresa → Vocabulário.
            </div>
          )}
        </div>
        <div>
          <label style={rotuloCampo} htmlFor="nm-aloc">
            Quanto do tempo dela é para aqui
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="nm-aloc"
              type="number"
              min={1}
              max={100}
              value={alocacao}
              onChange={(e) => setAlocacao(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              style={{ ...campo, ...numerico, width: 92 }}
            />
            <span style={{ fontSize: FONTE.corpo, color: COR.textoSuave }}>%</span>
            <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
              {ALOCACOES_SUGERIDAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlocacao(a)}
                  style={{ ...pastilha(alocacao === a), height: 28, padding: '0 9px' }}
                >
                  {a}%
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
            Usado para calcular a carga na tabela de Equipa. Qualquer valor de 1 a 100.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={rotuloCampo}>Nível de acesso</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NIVEIS_ACESSO.map((n) => {
            const activo = nivelAcesso === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setNivelAcesso(n)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 11,
                  padding: '12px 14px',
                  border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                  background: activo ? COR.fundoCampo : COR.branco,
                  borderRadius: RAIO.medio,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    flex: '0 0 14px',
                    marginTop: 2,
                    borderRadius: '50%',
                    border: `4px solid ${activo ? COR.tinta : COR.bordaForte}`,
                    background: COR.branco,
                  }}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: FONTE.corpo, fontWeight: PESO.forte }}>
                    {NIVEL_ACESSO[n]}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: FONTE.minima,
                      color: COR.suave,
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {NIVEL_ACESSO_NOTA[n]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={rotuloCampo}>{aEditar ? 'Projectos' : 'Projectos iniciais'}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {carteira?.projectos.slice(0, 8).map((p) => {
            const activo = projectos.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setProjectos((lista) =>
                    activo ? lista.filter((id) => id !== p.id) : [...lista, p.id],
                  )
                }
                style={{
                  ...pastilha(false),
                  border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                  background: activo ? COR.fundoCampo : COR.branco,
                  color: activo ? COR.tinta : COR.texto,
                  fontWeight: activo ? PESO.medio : PESO.normal,
                }}
              >
                {p.nome}
              </button>
            );
          })}
        </div>
      </div>

      {aEditar ? null : (
        <div>
          <span style={rotuloCampo}>Como a pessoa entra</span>
          <div role="radiogroup" className="vn-campos vn-campos-3">
            {MODOS.map((m) => {
              const activo = acesso === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setAcesso(m)}
                  style={{
                    display: 'block',
                    padding: '12px 14px',
                    border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                    background: activo ? COR.fundoCampo : COR.branco,
                    borderRadius: RAIO.medio,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'block', fontSize: FONTE.corpo, fontWeight: PESO.forte }}>
                    {MODO_ACESSO[m]}
                  </span>
                  <span
                    style={{ display: 'block', fontSize: FONTE.minima, color: COR.suave, marginTop: 4, lineHeight: 1.5 }}
                  >
                    {NOTA_ACESSO[m]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {aEditar && membro && membro.activo ? (
        <div style={{ marginTop: 4 }}>
          <span style={rotuloCampo}>Acesso</span>
          <div style={{ fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.5, marginBottom: 10 }}>
            {membro.estado === 'convite_pendente'
              ? 'Ainda não entrou. Gere uma ligação nova, ou dê-lhe já uma palavra-passe temporária.'
              : 'Se a pessoa perdeu a palavra-passe, gere uma temporária. A actual deixa de servir e as sessões abertas terminam.'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {membro.estado === 'convite_pendente' ? (
              <button
                type="button"
                onClick={() => void darAcesso('ligacao')}
                disabled={reenviar.isPending}
                style={botaoSecundario}
              >
                Gerar nova ligação de convite
              </button>
            ) : null}
            {membro.id !== utilizador?.id ? (
              <button
                type="button"
                onClick={() => void darAcesso('password')}
                disabled={gerarPassword.isPending}
                style={botaoSecundario}
              >
                Gerar palavra-passe temporária
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {aEditar && membro ? (
        <button
          type="button"
          onClick={() => void alterarActivo(!membro.activo)}
          disabled={actualizar.isPending}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 14,
            padding: '12px 14px',
            border: `1px solid ${membro.activo ? COR.vermelhoBorda : COR.borda}`,
            borderRadius: RAIO.medio,
            background: membro.activo ? COR.vermelhoFundo : COR.fundoCampo,
            color: membro.activo ? COR.vermelho : COR.tinta,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            fontSize: FONTE.corpo,
          }}
        >
          {membro.activo
            ? 'Desactivar conta — deixa de entrar; o histórico mantém-se'
            : 'Reactivar conta — volta a poder entrar com a palavra-passe que já tinha'}
        </button>
      ) : null}

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
