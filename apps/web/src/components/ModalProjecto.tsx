import { useEffect, useMemo, useState } from 'react';
import {
  ANTECEDENCIA,
  ANTECEDENCIAS,
  type RascunhoFase,
  type TaxonomiaRef,
  chip,
  dataExtensa,
  formatarData,
  formatarMetical,
  hoje,
  lerData,
  lerMetical,
  modeloParaRascunhos,
  paraIso,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, campo, erroCampo, numerico, pastilha, rotuloCampo } from '../design/tokens';
import { ErroApi } from '../lib/api';
import { useCriarProjecto, usePessoas, useVocabulario } from '../lib/queries';
import { Avatar, Ponto } from './base';
import { CampoData } from './CampoData';
import { EditorFases } from './EditorFases';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Registo de projecto, em tres passos.
 *
 * Antes eram catorze campos empilhados num modal. Quem regista um projecto nao e informatico:
 * pedir tudo de uma vez obrigava a perceber o formulario inteiro antes de escrever a primeira
 * letra. Agora cada passo faz uma pergunta - o que e, quem responde e por quando, como se divide -
 * e o rodape diz sempre, por palavras, o que vai ser gravado.
 *
 * Natureza e estagio vem do vocabulario da empresa. Escolher a natureza carrega o modelo de fases
 * que a empresa definiu para ela, que continua a ser um ponto de partida e nao uma imposicao.
 */

const PASSOS = ['O projecto', 'Responsáveis e prazo', 'Roteiro de fases'];

export function ModalProjecto({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { data: pessoas } = usePessoas();
  const { data: naturezas } = useVocabulario('natureza');
  const { data: estagios } = useVocabulario('estagio');
  const criar = useCriarProjecto();
  const toast = useToast();

  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState('');
  const [cliente, setCliente] = useState('');
  const [naturezaId, setNaturezaId] = useState('');
  const [estagioId, setEstagioId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [inicioTexto, setInicioTexto] = useState('');
  const [deadlineTexto, setDeadlineTexto] = useState('');
  const [orcamento, setOrcamento] = useState('');
  const [antecedencia, setAntecedencia] = useState<number>(3);
  const [equipa, setEquipa] = useState<string[]>([]);
  const [fases, setFases] = useState<RascunhoFase[]>([]);
  const [tocado, setTocado] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setPasso(0);
    setNome('');
    setCliente('');
    setNaturezaId(naturezas?.[0]?.id ?? '');
    setEstagioId(estagios?.[0]?.id ?? '');
    setResponsavelId(pessoas?.[0]?.id ?? '');
    // O arranque é hoje porque é o caso comum; a entrega fica em branco de propósito, para ser
    // uma decisão de quem regista e não um valor que apareceu sozinho.
    setInicioTexto(formatarData(hoje()));
    setDeadlineTexto('');
    setOrcamento('');
    setAntecedencia(3);
    setEquipa([]);
    setFases(modeloParaRascunhos(naturezas?.[0]?.fasesModelo ?? null));
    setTocado(false);
    setErroServidor(null);
  }, [aberto, pessoas, naturezas, estagios]);

  const inicio = useMemo(() => lerData(inicioTexto), [inicioTexto]);
  const deadline = useMemo(() => lerData(deadlineTexto), [deadlineTexto]);

  const natureza = naturezas?.find((n) => n.id === naturezaId) ?? null;
  const estagio = estagios?.find((e) => e.id === estagioId) ?? null;
  const responsavel = pessoas?.find((p) => p.id === responsavelId) ?? null;

  const semVocabulario = Boolean(naturezas && estagios && (!naturezas.length || !estagios.length));

  const passoUmValido = nome.trim().length >= 3 && cliente.trim().length >= 2 && Boolean(naturezaId) && Boolean(estagioId);
  const prazoCoerente = Boolean(inicio && deadline && deadline.getTime() >= inicio.getTime());
  const passoDoisValido = Boolean(responsavelId) && prazoCoerente;
  const passoTresValido = fases.some((f) => f.nome.trim());
  const valido = passoUmValido && passoDoisValido && passoTresValido;

  function mudarNatureza(n: TaxonomiaRef) {
    setNaturezaId(n.id);
    // Trocar a natureza troca o modelo de fases: e essa a razao de a natureza vir primeiro.
    setFases(modeloParaRascunhos(n.fasesModelo));
  }

  /** A frase que descreve, em portugues corrente, o que vai ser gravado. */
  function resumo(): string {
    if (!passoUmValido) return 'Dê um nome ao projecto, diga para quem é e como o classifica.';
    if (!passoDoisValido) {
      if (!prazoCoerente && inicio && deadline) return 'A entrega não pode ser anterior ao arranque.';
      return 'Escolha quem responde pelo projecto e a data de entrega.';
    }
    if (!passoTresValido) return 'Dê nome a pelo menos uma fase do roteiro.';

    const comFases = fases.filter((f) => f.nome.trim()).length;
    const orcamentoCentavos = lerMetical(orcamento);
    return [
      `${responsavel?.nome ?? 'O responsável'} responde por "${nome.trim()}"`,
      `para ${cliente.trim()}, entrega a ${dataExtensa(deadline as Date)}.`,
      `${comFases} fase${comFases === 1 ? '' : 's'}, ${equipa.length + 1} pessoa${equipa.length ? 's' : ''} alocada${equipa.length ? 's' : ''}`,
      orcamentoCentavos ? `, orçamento de ${formatarMetical(orcamentoCentavos)}` : '',
      `. Aviso ${ANTECEDENCIA[antecedencia as keyof typeof ANTECEDENCIA].toLowerCase()} antes de cada prazo.`,
    ].join(' ').replace(' .', '.').replace(' ,', ',');
  }

  async function submeter() {
    if (!valido || !inicio || !deadline) {
      setTocado(true);
      return;
    }
    setErroServidor(null);
    try {
      const criado = await criar.mutateAsync({
        nome: nome.trim(),
        cliente: cliente.trim(),
        naturezaId,
        estagioId,
        responsavelId,
        inicio: paraIso(inicio),
        deadline: paraIso(deadline),
        orcamentoCentavos: lerMetical(orcamento),
        pessoas: equipa,
        antecedenciaAlerta: antecedencia as 0 | 1 | 3 | 7,
        fases: fases
          .filter((f) => f.nome.trim())
          .map((f) => ({ nome: f.nome.trim(), estado: f.estado, nota: f.nota, semanas: f.semanas })),
      });
      toast.mostrar(`Projecto ${criado.codigo} registado · entrega ${formatarData(deadline)}`);
      onFechar();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível registar o projecto.');
    }
  }

  function avancar() {
    setTocado(true);
    if (passo === 0 && !passoUmValido) return;
    if (passo === 1 && !passoDoisValido) return;
    if (passo === 2) {
      void submeter();
      return;
    }
    setTocado(false);
    setPasso((p) => p + 1);
  }

  const podeAvancar = passo === 0 ? passoUmValido : passo === 1 ? passoDoisValido : valido;

  if (semVocabulario) {
    return (
      <Modal
        aberto={aberto}
        onFechar={onFechar}
        titulo="Ainda falta definir o vocabulário"
        subtitulo="Um projecto precisa de uma natureza e de um estágio para ser classificado."
        largura={520}
      >
        <p style={{ fontSize: FONTE.base, color: COR.texto, lineHeight: 1.6, margin: 0 }}>
          A sua empresa ainda não definiu como classifica o trabalho que faz. Vá a{' '}
          <strong>Empresa → Vocabulário</strong> e crie pelo menos uma natureza de projecto e um
          estágio. Leva um minuto e é feito uma vez só.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Registar projecto"
      subtitulo="Três passos: o que é, quem responde e por quando, e como se divide."
      largura={780}
      passos={{ actual: passo, rotulos: PASSOS }}
      rodapeNota={resumo()}
      rodapeErro={tocado && !podeAvancar}
      accaoAnterior={passo > 0 ? { rotulo: 'Voltar', onClick: () => setPasso((p) => p - 1) } : undefined}
      accao={{
        rotulo: passo === 2 ? 'Registar projecto' : 'Continuar',
        onClick: avancar,
        desactivada: passo === 2 && !valido,
        aCarregar: criar.isPending,
      }}
    >
      {passo === 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={rotuloCampo} htmlFor="np-nome">
                Nome do projecto
              </label>
              <input
                id="np-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onBlur={() => setTocado(true)}
                placeholder="Migração do sistema de facturação"
                style={{
                  ...campo,
                  borderColor: tocado && nome.trim().length < 3 ? COR.vermelhoBorda : COR.bordaForte,
                }}
              />
              {tocado && nome.trim().length < 3 ? (
                <div style={erroCampo}>Escreva um nome que a equipa reconheça na lista.</div>
              ) : null}
            </div>
            <div>
              <label style={rotuloCampo} htmlFor="np-cliente">
                Para quem é
              </label>
              <input
                id="np-cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                onBlur={() => setTocado(true)}
                placeholder="Nome do cliente, ou a frente interna"
                style={{
                  ...campo,
                  borderColor: tocado && cliente.trim().length < 2 ? COR.vermelhoBorda : COR.bordaForte,
                }}
              />
              {tocado && cliente.trim().length < 2 ? (
                <div style={erroCampo}>Diga o cliente, ou escreva a frente interna.</div>
              ) : null}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={rotuloCampo}>Que tipo de trabalho é</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {naturezas?.map((n) => {
                const activa = naturezaId === n.id;
                const cor = chip(n.cor);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => mudarNatureza(n)}
                    style={{
                      ...pastilha(false),
                      border: `1px solid ${activa ? COR.tinta : COR.borda}`,
                      background: activa ? COR.fundoCampo : COR.branco,
                      color: activa ? cor.fg : COR.texto,
                      fontWeight: activa ? PESO.forte : PESO.normal,
                    }}
                  >
                    <Ponto cor={cor.ponto} tamanho={6} />
                    {n.rotulo}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>
              {natureza?.fasesModelo?.length
                ? `O roteiro abre com as ${natureza.fasesModelo.length} fases que a empresa definiu para ${natureza.rotulo.toLowerCase()}. Vai poder mudá-las no último passo.`
                : 'Esta natureza ainda não tem modelo de fases — vai escrever o roteiro no último passo.'}
            </div>
          </div>

          <div>
            <span style={rotuloCampo}>Em que ponto está</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {estagios?.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEstagioId(e.id)}
                  style={pastilha(estagioId === e.id)}
                >
                  {e.rotulo}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {passo === 1 ? (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={rotuloCampo} htmlFor="np-resp">
              Quem responde por este projecto
            </label>
            <select
              id="np-resp"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              style={campo}
            >
              {pessoas?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} · {p.funcao}
                </option>
              ))}
            </select>
            <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
              É esta pessoa que define o roteiro, atribui tarefas e valida os relatórios da equipa.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
            <CampoData
              id="np-inicio"
              rotulo="Quando arranca"
              valor={inicioTexto}
              onChange={setInicioTexto}
            />
            <CampoData
              id="np-fim"
              rotulo="Quando tem de estar entregue"
              valor={deadlineTexto}
              onChange={setDeadlineTexto}
              erro={
                tocado && !deadline
                  ? 'Indique a data de entrega.'
                  : inicio && deadline && deadline.getTime() < inicio.getTime()
                    ? 'A entrega não pode ser anterior ao arranque.'
                    : undefined
              }
            />
            <div>
              <label style={rotuloCampo} htmlFor="np-orc">
                Orçamento em meticais
              </label>
              <input
                id="np-orc"
                value={orcamento}
                onChange={(e) => setOrcamento(e.target.value)}
                placeholder="Deixe vazio se não houver"
                style={{ ...campo, ...numerico }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <span style={rotuloCampo}>Quem mais trabalha neste projecto</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {pessoas
                ?.filter((p) => p.id !== responsavelId)
                .map((p) => {
                  const activo = equipa.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() =>
                        setEquipa((lista) => (activo ? lista.filter((id) => id !== p.id) : [...lista, p.id]))
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        height: 32,
                        padding: '0 10px 0 6px',
                        border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                        background: activo ? COR.fundoCampo : COR.branco,
                        color: activo ? COR.tinta : COR.texto,
                        fontWeight: activo ? PESO.forte : PESO.normal,
                        borderRadius: RAIO.campo,
                        fontSize: FONTE.corpo,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Avatar nome={p.nome} tamanho={20} esbatido={!activo} />
                      {p.nome}
                    </button>
                  );
                })}
            </div>
            <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>
              Quem estiver aqui passa a ver o projecto. Pode acrescentar pessoas mais tarde.
            </div>
          </div>

          <div>
            <span style={rotuloCampo}>Com quanta antecedência avisar de cada prazo</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {ANTECEDENCIAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAntecedencia(a)}
                  style={pastilha(antecedencia === a)}
                >
                  {ANTECEDENCIA[a]}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {passo === 2 ? (
        <>
          <div style={{ fontSize: FONTE.corpo, color: COR.textoSuave, lineHeight: 1.6, marginBottom: 14 }}>
            Cada fase ocupa as semanas que lhe der, e a seguinte começa dois dias depois de a
            anterior acabar. Arraste ⠿ para reordenar; as datas voltam a encadear-se sozinhas.
          </div>
          <EditorFases fases={fases} inicio={inicio} onChange={setFases} />
        </>
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
