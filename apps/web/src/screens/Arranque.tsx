import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TIPO_TAXONOMIA_NOTA,
  VOCABULARIO_SUGERIDO,
  type AcessoEmitido,
  type CriarTaxonomiaInput,
  type TipoTaxonomia,
  chip,
} from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, botaoSecundario, cartao, campo, rotuloCampo } from '../design/tokens';
import { MarcaCompleta } from '../components/base';
import { EditorVocabulario } from '../components/EditorVocabulario';
import { ModalAcessoCriado } from '../components/ModalAcessoCriado';
import { ModalMembro } from '../components/ModalMembro';
import { ModalProjecto } from '../components/ModalProjecto';
import { useSessao } from '../lib/auth';
import {
  useActualizarEmpresa,
  useCriarVocabularioEmLote,
  useEstadoArranque,
  useVocabulario,
} from '../lib/queries';

/**
 * Assistente de arranque.
 *
 * O que uma empresa tem de decidir antes de o portal servir para alguma coisa: como se chama,
 * como nomeia o trabalho que faz, quem trabalha nela, e qual e o primeiro projecto.
 *
 * Os passos 3 e 4 podem ser saltados. O passo 2 nao: sem uma natureza e um estagio nao ha como
 * classificar um projecto, e um portal onde nao se consegue registar um projecto nao esta pronto.
 *
 * O conjunto de partida **preenche** o formulario em vez de o fechar. E a diferenca entre sugerir
 * e impor: a lista aparece escrita, e a pessoa reescreve, apaga ou acrescenta antes de gravar.
 */

const PASSOS = ['A empresa', 'O vocabulário', 'A equipa', 'O primeiro projecto'];

export function Arranque() {
  const { empresa } = useSessao();
  const navegar = useNavigate();
  const { data: estado } = useEstadoArranque();
  const { data: naturezas } = useVocabulario('natureza');
  const { data: estagios } = useVocabulario('estagio');
  const { data: departamentos } = useVocabulario('departamento');
  const actualizarEmpresa = useActualizarEmpresa();
  const criarEmLote = useCriarVocabularioEmLote();

  const [passo, setPasso] = useState(0);
  const [nomeEmpresa, setNomeEmpresa] = useState(empresa?.nome ?? '');
  const [moeda, setMoeda] = useState(empresa?.moeda ?? 'MZN');
  const [corMarca, setCorMarca] = useState(empresa?.corMarca ?? 'azul');
  const [membroAberto, setMembroAberto] = useState(false);
  const [emitido, setEmitido] = useState<{ acesso: AcessoEmitido; nome: string } | null>(null);
  const [projectoAberto, setProjectoAberto] = useState(false);

  const vocabularioPronto = Boolean(naturezas?.length && estagios?.length);

  async function gravarEmpresa() {
    await actualizarEmpresa.mutateAsync({
      nome: nomeEmpresa.trim(),
      moeda: moeda.trim().toUpperCase(),
      corMarca: corMarca as 'azul',
    });
    setPasso(1);
  }

  async function usarConjuntoDePartida(tipo: TipoTaxonomia) {
    const entradas: CriarTaxonomiaInput[] = VOCABULARIO_SUGERIDO[tipo].map((v) => ({
      tipo,
      rotulo: v.rotulo,
      cor: v.cor as 'azul',
      ...(v.prefixo ? { prefixo: v.prefixo } : {}),
      fasesModelo: v.fasesModelo ?? [],
    }));
    await criarEmLote.mutateAsync(entradas);
  }

  return (
    <div style={{ background: COR.fundo, minHeight: '100vh' }}>
      <header style={{ background: COR.branco, borderBottom: `1px solid ${COR.borda}` }}>
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <MarcaCompleta empresa={empresa?.nome ?? null} />
          <button
            type="button"
            onClick={() => navegar('/painel')}
            style={{ ...botaoSecundario, marginLeft: 'auto' }}
            disabled={!vocabularioPronto}
            title={
              vocabularioPronto
                ? 'Ir para o portal'
                : 'Crie pelo menos uma natureza e um estágio antes de entrar no portal.'
            }
          >
            {vocabularioPronto ? 'Ir para o portal' : 'Portal ainda não disponível'}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px 64px' }}>
        <ol
          style={{
            display: 'flex',
            gap: 6,
            listStyle: 'none',
            padding: 0,
            margin: '0 0 26px',
            flexWrap: 'wrap',
          }}
        >
          {PASSOS.map((rotulo, i) => {
            const activo = i === passo;
            const feito = i < passo;
            return (
              <li key={rotulo}>
                <button
                  type="button"
                  onClick={() => setPasso(i)}
                  aria-current={activo ? 'step' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 32,
                    padding: '0 12px',
                    border: `1px solid ${activo ? COR.tinta : COR.borda}`,
                    background: activo ? COR.tinta : COR.branco,
                    color: activo ? COR.branco : feito ? COR.texto : COR.textoSuave,
                    borderRadius: RAIO.botao,
                    fontSize: FONTE.corpo,
                    fontWeight: activo ? PESO.forte : PESO.normal,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span aria-hidden="true">{feito ? '✓' : i + 1}</span>
                  {rotulo}
                </button>
              </li>
            );
          })}
        </ol>

        {passo === 0 ? (
          <section style={{ ...cartao, padding: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em' }}>
              Comecemos pela empresa
            </h1>
            <p style={{ margin: '8px 0 24px', fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
              Isto é o que vai aparecer no menu, nos emails de aviso e no cabeçalho dos relatórios.
            </p>

            <div className="vn-campos vn-campos-empresa" style={{ marginBottom: 20 }}>
              <div>
                <label style={rotuloCampo} htmlFor="ar-nome">
                  Nome da empresa
                </label>
                <input
                  id="ar-nome"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  style={campo}
                />
              </div>
              <div>
                <label style={rotuloCampo} htmlFor="ar-moeda">
                  Moeda
                </label>
                <input
                  id="ar-moeda"
                  value={moeda}
                  maxLength={3}
                  onChange={(e) => setMoeda(e.target.value.toUpperCase())}
                  style={campo}
                />
              </div>
            </div>

            <div style={{ marginBottom: 26 }}>
              <span style={rotuloCampo}>Cor da marca</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['azul', 'violeta', 'turquesa', 'verde', 'ambar', 'rosa', 'tinta'] as const).map((c) => {
                  const activo = corMarca === c;
                  const cores = chip(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCorMarca(c)}
                      aria-label={`Cor ${c}`}
                      aria-pressed={activo}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: RAIO.campo,
                        border: `2px solid ${activo ? COR.tinta : COR.borda}`,
                        background: cores.bg,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{ width: 12, height: 12, borderRadius: 6, background: cores.ponto }}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void gravarEmpresa()}
              disabled={nomeEmpresa.trim().length < 2 || actualizarEmpresa.isPending}
              style={{
                ...botaoPrincipal,
                background: nomeEmpresa.trim().length < 2 ? COR.bordaForte : COR.tinta,
              }}
            >
              {actualizarEmpresa.isPending ? 'A gravar…' : 'Continuar'}
            </button>
          </section>
        ) : null}

        {passo === 1 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ ...cartao, padding: 28 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em' }}>
                Como é que a sua empresa fala do trabalho que faz
              </h1>
              <p style={{ margin: '8px 0 0', fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
                Nada disto vem preenchido: são as suas palavras, não as nossas. Se quiser começar
                por um conjunto comum, o botão preenche a lista — e a lista continua a ser sua para
                reescrever antes de gravar.
              </p>
            </div>

            {(['natureza', 'estagio', 'departamento'] as TipoTaxonomia[]).map((tipo) => (
              <EditorVocabulario
                key={tipo}
                tipo={tipo}
                nota={TIPO_TAXONOMIA_NOTA[tipo]}
                entradas={
                  tipo === 'natureza' ? naturezas : tipo === 'estagio' ? estagios : departamentos
                }
                onUsarSugestao={() => void usarConjuntoDePartida(tipo)}
                aGravarSugestao={criarEmLote.isPending}
              />
            ))}

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPasso(2)}
                disabled={!vocabularioPronto}
                style={{ ...botaoPrincipal, background: vocabularioPronto ? COR.tinta : COR.bordaForte }}
              >
                Continuar
              </button>
              <span style={{ fontSize: FONTE.nota, color: vocabularioPronto ? COR.suave : COR.ambar }}>
                {vocabularioPronto
                  ? 'Pode acrescentar mais tarde, em Empresa → Vocabulário.'
                  : 'Precisa de pelo menos uma natureza e um estágio para registar projectos.'}
              </span>
            </div>
          </section>
        ) : null}

        {passo === 2 ? (
          <section style={{ ...cartao, padding: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em' }}>
              Quem trabalha consigo
            </h1>
            <p style={{ margin: '8px 0 20px', fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
              Registar uma pessoa cria a conta dela e envia o convite por email. Pode fazer isto
              agora ou mais tarde, em Equipa e acessos.
            </p>

            <div
              style={{
                border: `1px solid ${COR.borda}`,
                borderRadius: RAIO.campo,
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: FONTE.base,
                color: COR.texto,
              }}
            >
              {estado?.membros
                ? `${estado.membros} pessoa${estado.membros === 1 ? '' : 's'} já registada${estado.membros === 1 ? '' : 's'} além de si.`
                : 'Ainda não registou ninguém além de si.'}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setMembroAberto(true)} style={botaoPrincipal}>
                Registar uma pessoa
              </button>
              <button type="button" onClick={() => setPasso(3)} style={botaoSecundario}>
                Fazer isto mais tarde
              </button>
            </div>
          </section>
        ) : null}

        {passo === 3 ? (
          <section style={{ ...cartao, padding: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: PESO.forte, letterSpacing: '-0.02em' }}>
              O primeiro projecto
            </h1>
            <p style={{ margin: '8px 0 20px', fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
              Registe um projecto que já tenha em mãos. Fica com o roteiro em fases e passa a
              aparecer no painel.
            </p>

            <div
              style={{
                border: `1px solid ${COR.borda}`,
                borderRadius: RAIO.campo,
                padding: '14px 16px',
                marginBottom: 20,
                fontSize: FONTE.base,
                color: COR.texto,
              }}
            >
              {estado?.projectos
                ? `${estado.projectos} projecto${estado.projectos === 1 ? '' : 's'} registado${estado.projectos === 1 ? '' : 's'}.`
                : 'A carteira está vazia.'}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setProjectoAberto(true)} style={botaoPrincipal}>
                Registar projecto
              </button>
              <button type="button" onClick={() => navegar('/painel')} style={botaoSecundario}>
                Ir para o portal
              </button>
            </div>
          </section>
        ) : null}
      </main>

      <ModalMembro
        aberto={membroAberto}
        onFechar={() => setMembroAberto(false)}
        onAcesso={(acesso, nome) => setEmitido({ acesso, nome })}
      />
      <ModalAcessoCriado
        acesso={emitido?.acesso ?? null}
        nome={emitido?.nome ?? ''}
        onFechar={() => setEmitido(null)}
      />
      <ModalProjecto aberto={projectoAberto} onFechar={() => setProjectoAberto(false)} />
    </div>
  );
}
