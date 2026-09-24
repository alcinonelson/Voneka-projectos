import { useEffect, useMemo, useState } from 'react';
import {
  ANTECEDENCIA,
  ANTECEDENCIAS,
  ESFORCOS_SUGERIDOS,
  PRIORIDADE,
  PRIORIDADES,
  type Prioridade,
  dataCurta,
  dataLonga,
  hoje,
  lerData,
  paraIso,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, campo, erroCampo, numerico, pastilha, rotuloCampo } from '../design/tokens';
import { ErroApi } from '../lib/api';
import { useCarteira, useCriarTarefa, usePessoas, useProjecto } from '../lib/queries';
import { Avatar } from './base';
import { CampoData } from './CampoData';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Atribuicao de uma tarefa, em tres passos.
 *
 * As tarefas sao escritas por quem atribui, nunca escolhidas de uma lista pre-feita - e por isso
 * o primeiro campo e um texto livre e nao um selector.
 *
 * O rodape mostra sempre a frase completa do que vai acontecer, com nomes e datas por extenso.
 * Onze campos preenchidos deixam quem atribui sem saber o que combinou; uma frase - "a Sara
 * entrega isto ate 12 de Setembro e ao fechar tem de escrever um relatorio" - deixa.
 *
 * A carga de cada pessoa aparece em palavras alem da cor. A cor sozinha exclui quem nao a
 * distingue, e uma decisao destas nao pode depender de ver bem vermelho.
 */

const PASSOS = ['O que é para fazer', 'Quem e onde', 'Quando e como fecha'];

/** Leitura da carga de uma pessoa em palavras, e nao apenas em cor. */
function leituraCarga(abertas: number): { texto: string; cor: string } {
  if (abertas === 0) return { texto: 'sem tarefas abertas', cor: COR.verde };
  if (abertas >= 4) return { texto: `${abertas} tarefas abertas — já é muita coisa`, cor: COR.vermelho };
  if (abertas === 3) return { texto: '3 tarefas abertas', cor: COR.ambar };
  return { texto: `${abertas} tarefa${abertas === 1 ? '' : 's'} aberta${abertas === 1 ? '' : 's'}`, cor: COR.textoSuave };
}

export function ModalTarefa({
  aberto,
  projectoInicial,
  onFechar,
}: {
  aberto: boolean;
  projectoInicial?: string;
  onFechar: () => void;
}) {
  const { data: carteira } = useCarteira('todos');
  const { data: pessoas } = usePessoas();
  const criar = useCriarTarefa();
  const toast = useToast();

  const [passo, setPasso] = useState(0);
  const [projectoId, setProjectoId] = useState('');
  const [faseId, setFaseId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [dataTexto, setDataTexto] = useState('');
  const [esforco, setEsforco] = useState<number>(8);
  const [prioridade, setPrioridade] = useState<Prioridade>('normal');
  const [antecedencia, setAntecedencia] = useState<number>(3);
  const [tocado, setTocado] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const { data: projecto } = useProjecto(projectoId || null);

  useEffect(() => {
    if (!aberto) return;
    setPasso(0);
    setProjectoId(projectoInicial ?? carteira?.projectos[0]?.id ?? '');
    setFaseId(null);
    setTitulo('');
    setDescricao('');
    setResponsavelId(pessoas?.[0]?.id ?? '');
    setDataTexto('');
    setEsforco(8);
    setPrioridade('normal');
    setAntecedencia(3);
    setTocado(false);
    setErroServidor(null);
  }, [aberto, projectoInicial, carteira, pessoas]);

  useEffect(() => {
    if (projecto?.fases.length && !faseId) setFaseId(projecto.fases[0]!.id);
  }, [projecto, faseId]);

  const data = useMemo(() => lerData(dataTexto), [dataTexto]);
  const referencia = hoje();
  const noPassado = data !== null && data.getTime() < referencia.getTime();
  const tituloCurto = titulo.trim().length < 4;

  const passoUmValido = !tituloCurto;
  const passoDoisValido = Boolean(projectoId) && Boolean(responsavelId);
  const passoTresValido = data !== null && !noPassado;
  const valido = passoUmValido && passoDoisValido && passoTresValido;

  const responsavel = pessoas?.find((p) => p.id === responsavelId);
  const nomeProjecto = carteira?.projectos.find((p) => p.id === projectoId)?.nome ?? '';
  const nomeFase = projecto?.fases.find((f) => f.id === faseId)?.nome ?? null;

  /** A frase que descreve, em portugues corrente, o compromisso que vai ficar registado. */
  function resumo(): string {
    if (!passoUmValido) {
      return 'Escreva a tarefa de forma verificável — quem a receber tem de saber o que entregar.';
    }
    if (!passoDoisValido) return 'Escolha o projecto e quem vai fazer isto.';
    if (!passoTresValido) {
      if (noPassado) return 'A deadline não pode ser anterior a hoje.';
      return 'Indique até quando. Sem deadline não há alerta nem acompanhamento.';
    }

    const quem = responsavel?.nome ?? 'A pessoa escolhida';
    const onde = nomeFase ? `${nomeProjecto}, fase ${nomeFase}` : nomeProjecto;
    return `${quem} entrega "${titulo.trim()}" em ${onde} até ${dataLonga(data as Date)}. Ao dar isto por cumprido, tem de escrever um mini relatório.`;
  }

  async function submeter() {
    if (!valido || !data) {
      setTocado(true);
      return;
    }
    setErroServidor(null);
    try {
      await criar.mutateAsync({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        projectoId,
        faseId,
        responsavelId,
        deadline: paraIso(data),
        esforcoEstimadoHoras: esforco,
        prioridade,
        antecedenciaAlerta: antecedencia as 0 | 1 | 3 | 7,
        exigeRelatorio: true,
      });
      toast.mostrar(
        `Tarefa atribuída a ${responsavel?.nome ?? 'equipa'} · entrega ${dataCurta(data)}`,
      );
      onFechar();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível atribuir a tarefa.');
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

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Atribuir tarefa"
      subtitulo="O que é para fazer, quem faz, e até quando."
      largura={720}
      passos={{ actual: passo, rotulos: PASSOS }}
      rodapeNota={resumo()}
      rodapeErro={tocado && !(passo === 0 ? passoUmValido : passo === 1 ? passoDoisValido : valido)}
      accaoAnterior={passo > 0 ? { rotulo: 'Voltar', onClick: () => setPasso((p) => p - 1) } : undefined}
      accao={{
        rotulo: passo === 2 ? 'Atribuir tarefa' : 'Continuar',
        onClick: avancar,
        desactivada: passo === 2 && !valido,
        aCarregar: criar.isPending,
      }}
    >
      {passo === 0 ? (
        <>
          <div style={{ marginBottom: 18 }}>
            <label style={rotuloCampo} htmlFor="tarefa-titulo">
              O que é para fazer
            </label>
            <input
              id="tarefa-titulo"
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={() => setTocado(true)}
              placeholder="Conferir os saldos das contas a receber de Julho"
              style={{
                ...campo,
                borderColor: tocado && tituloCurto ? COR.vermelhoBorda : COR.bordaForte,
              }}
            />
            {tocado && tituloCurto ? (
              <div style={erroCampo}>
                Escreva uma frase que descreva a entrega. "Conferir saldos" diz mais do que
                "Contabilidade".
              </div>
            ) : (
              <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
                Escreva-a por palavras suas. Não há lista para escolher — a tarefa é o que combinou
                com a pessoa.
              </div>
            )}
          </div>

          <div>
            <label style={rotuloCampo} htmlFor="tarefa-desc">
              O que conta como entregue
            </label>
            <textarea
              id="tarefa-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder="A folha de conferência com os saldos batidos, enviada por email à Direcção."
              style={{ ...campo, height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical' }}
            />
            <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
              Opcional, mas é isto que evita a conversa de "eu pensei que era só…".
            </div>
          </div>
        </>
      ) : null}

      {passo === 1 ? (
        <>
          <div className="vn-campos vn-campos-2" style={{ marginBottom: 20 }}>
            <div>
              <label style={rotuloCampo} htmlFor="tarefa-projecto">
                Em que projecto
              </label>
              <select
                id="tarefa-projecto"
                value={projectoId}
                onChange={(e) => {
                  setProjectoId(e.target.value);
                  setFaseId(null);
                }}
                style={campo}
              >
                {carteira?.projectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={rotuloCampo} htmlFor="tarefa-fase">
                Em que fase do roteiro
              </label>
              <select
                id="tarefa-fase"
                value={faseId ?? ''}
                onChange={(e) => setFaseId(e.target.value || null)}
                style={campo}
              >
                <option value="">Sem fase definida</option>
                {projecto?.fases.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span style={rotuloCampo}>Quem vai fazer isto</span>
            <div className="vn-campos vn-campos-2" style={{ gap: 8 }}>
              {pessoas?.map((p) => {
                const activo = responsavelId === p.id;
                const carga = leituraCarga(p.tarefasAbertas);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setResponsavelId(p.id)}
                    aria-pressed={activo}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                      background: activo ? COR.fundoCampo : COR.branco,
                      borderRadius: RAIO.campo,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Avatar nome={p.nome} tamanho={28} esbatido={!activo} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: FONTE.corpo,
                          fontWeight: activo ? PESO.forte : PESO.medio,
                          color: COR.tinta,
                        }}
                      >
                        {p.nome}
                      </span>
                      <span style={{ display: 'block', fontSize: FONTE.nota, color: carga.cor, marginTop: 2 }}>
                        {carga.texto}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      {passo === 2 ? (
        <>
          <div className="vn-campos vn-campos-2" style={{ marginBottom: 20 }}>
            <CampoData
              id="tarefa-data"
              rotulo="Até quando"
              valor={dataTexto}
              onChange={setDataTexto}
              minimo={paraIso(referencia)}
              ajuda="Sem deadline não há alerta nem acompanhamento."
              erro={
                tocado && data === null
                  ? 'Indique a data de entrega.'
                  : noPassado
                    ? 'A deadline não pode ser anterior a hoje.'
                    : undefined
              }
            />
            <div>
              <label style={rotuloCampo} htmlFor="tarefa-esforco">
                Quantas horas deve levar
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="tarefa-esforco"
                  type="number"
                  min={1}
                  max={2000}
                  value={esforco}
                  onChange={(e) => setEsforco(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))}
                  style={{ ...campo, ...numerico, width: 86 }}
                />
                <span style={{ fontSize: FONTE.corpo, color: COR.textoSuave }}>h</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {ESFORCOS_SUGERIDOS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setEsforco(h)}
                      style={{ ...pastilha(esforco === h), height: 28, padding: '0 9px' }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 6, lineHeight: 1.5 }}>
                Usado para calcular a carga da pessoa. Qualquer número serve.
              </div>
            </div>
          </div>

          <div className="vn-campos vn-campos-2" style={{ marginBottom: 20 }}>
            <div>
              <span style={rotuloCampo}>Prioridade</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPrioridade(p)}
                    style={pastilha(prioridade === p)}
                  >
                    {PRIORIDADE[p]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span style={rotuloCampo}>Avisar com que antecedência</span>
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
          </div>

          <p
            style={{
              margin: 0,
              padding: '14px 16px',
              border: `1px solid ${COR.borda}`,
              background: COR.fundoCampo,
              borderRadius: RAIO.campo,
              fontSize: FONTE.corpo,
              color: COR.textoSuave,
              lineHeight: 1.6,
            }}
          >
            Fechar a tarefa exige sempre um mini relatório. Quem a receber só a dá por cumprida
            depois de escrever o que ficou feito — é este texto que chega à Direcção.
          </p>
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
