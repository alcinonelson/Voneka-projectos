import { useEffect, useState } from 'react';
import {
  MENSAGEM_RELATORIO_CURTO,
  MIN_CARACTERES_RELATORIO,
  SITUACAO,
  SITUACAO_NOTA,
  SITUACOES,
  type Situacao,
  corSituacao,
  dataCurta,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, areaTexto, campo, erroCampo, numerico, rotuloCampo } from '../design/tokens';
import { ErroApi } from '../lib/api';
import { useConcluirTarefa } from '../lib/queries';
import type { Tarefa } from '../lib/tipos';
import { Modal } from './Modal';
import { useToast } from './Toast';

/**
 * Conclusao de uma tarefa com o mini relatorio.
 *
 * E aqui que o produto se decide. O botao so acende quando o texto tem substancia, e o rodape
 * diz quantos caracteres faltam em vez de se limitar a recusar. A contagem nao e burocracia: a
 * Direccao le este texto para decidir, e uma linha de tres palavras nao lhe serve de nada.
 */
export function ModalRelatorio({
  tarefa,
  onFechar,
}: {
  tarefa: Tarefa | null;
  onFechar: () => void;
}) {
  const [situacao, setSituacao] = useState<Situacao>('sem_obstaculos');
  const [texto, setTexto] = useState('');
  const [horas, setHoras] = useState(0);
  const [prova, setProva] = useState('');
  const [tocado, setTocado] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);

  const concluir = useConcluirTarefa();
  const toast = useToast();

  useEffect(() => {
    if (!tarefa) return;
    setSituacao('sem_obstaculos');
    setTexto('');
    setHoras(tarefa.esforcoRealHoras || tarefa.esforcoEstimadoHoras);
    setProva('');
    setTocado(false);
    setErroServidor(null);
  }, [tarefa]);

  if (!tarefa) return null;

  const limpo = texto.trim();
  const faltam = Math.max(0, MIN_CARACTERES_RELATORIO - limpo.length);
  const valido = limpo.length >= MIN_CARACTERES_RELATORIO;

  async function submeter() {
    if (!valido) {
      setTocado(true);
      return;
    }
    setErroServidor(null);
    try {
      await concluir.mutateAsync({
        id: tarefa!.id,
        dados: {
          situacao,
          texto: limpo,
          esforcoRealHoras: horas,
          provaExecucao: prova.trim(),
        },
      });
      toast.mostrar('Tarefa cumprida · relatório enviado à gestão');
      onFechar();
    } catch (e) {
      setErroServidor(e instanceof ErroApi ? e.message : 'Não foi possível submeter o relatório.');
    }
  }

  return (
    <Modal
      aberto
      onFechar={onFechar}
      titulo="Assinalar cumprida"
      subtitulo={`${tarefa.titulo} · ${tarefa.projecto.nome} · vencia ${dataCurta(tarefa.deadline)}`}
      largura={660}
      rodapeNota={
        valido
          ? 'Pronto a submeter. O relatório entra no feed da Direcção à espera de validação.'
          : `Relatório obrigatório · faltam ${faltam} caracteres`
      }
      rodapeErro={!valido && tocado}
      accao={{
        rotulo: 'Submeter e fechar',
        onClick: () => void submeter(),
        desactivada: !valido,
        aCarregar: concluir.isPending,
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <span style={rotuloCampo}>Situação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {SITUACOES.map((s) => {
            const activa = situacao === s;
            const { fg, bg } = corSituacao(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSituacao(s)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  padding: '11px 13px',
                  border: `1px solid ${activa ? fg : COR.borda}`,
                  background: activa ? bg : COR.branco,
                  borderRadius: RAIO.medio,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: FONTE.corpo,
                    fontWeight: PESO.forte,
                    color: activa ? fg : COR.texto,
                  }}
                >
                  {SITUACAO[s]}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: FONTE.minima,
                    color: COR.suave,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {SITUACAO_NOTA[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={rotuloCampo} htmlFor="relatorio">
          O que aconteceu
        </label>
        <textarea
          id="relatorio"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => setTocado(true)}
          placeholder="Diga o que ficou feito, o que ficou por fazer e o que precisa de decisão. É este texto que a gestão lê."
          style={{
            ...areaTexto,
            borderColor: tocado && !valido ? COR.vermelhoBorda : COR.bordaForte,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <span style={{ flex: 1 }}>
            {tocado && !valido ? (
              <span style={{ ...erroCampo, marginTop: 0 }}>{MENSAGEM_RELATORIO_CURTO}</span>
            ) : (
              <span style={{ fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.5 }}>
                Uma frase completa chega, desde que diga alguma coisa.
              </span>
            )}
          </span>
          <span style={{ fontSize: FONTE.minima, color: COR.suave, ...numerico }}>
            {limpo.length} caracteres
          </span>
        </div>
      </div>

      <div className="vn-campos-horas">
        <div>
          <label style={rotuloCampo} htmlFor="horas">
            Esforço real
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="horas"
              type="number"
              min={0}
              max={2000}
              value={horas}
              onChange={(e) => setHoras(Math.max(0, Number(e.target.value) || 0))}
              style={{ ...campo, ...numerico }}
            />
            <span style={{ fontSize: FONTE.corpo, color: COR.suave }}>h</span>
          </div>
          <div style={{ fontSize: FONTE.minima, color: COR.suave, marginTop: 6 }}>
            estimado: {tarefa.esforcoEstimadoHoras}h
          </div>
        </div>

        <div>
          <label style={rotuloCampo} htmlFor="prova">
            Prova de execução
          </label>
          <input
            id="prova"
            value={prova}
            onChange={(e) => setProva(e.target.value)}
            placeholder="Onde ficou o resultado: pasta, referência, número do documento"
            style={campo}
          />
          <div style={{ fontSize: FONTE.minima, color: COR.suave, marginTop: 6 }}>
            Opcional, mas é o que permite conferir a entrega mais tarde.
          </div>
        </div>
      </div>

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
            lineHeight: 1.5,
          }}
        >
          {erroServidor}
        </div>
      ) : null}
    </Modal>
  );
}
