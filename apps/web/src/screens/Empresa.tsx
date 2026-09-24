import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { chip } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoPrincipal, campo, cartao, numerico, rotuloCampo } from '../design/tokens';
import { Carregando } from '../components/base';
import { Pagina } from '../components/Layout';
import { useToast } from '../components/Toast';
import { ErroApi } from '../lib/api';
import { useActualizarEmpresa, useEmpresa, useEstadoArranque } from '../lib/queries';

/** As cores de marca oferecidas. Um subconjunto dos chips: os que funcionam como identidade. */
const CORES_MARCA = ['azul', 'violeta', 'turquesa', 'verde', 'ambar', 'rosa', 'tinta'] as const;

/**
 * Dados da empresa.
 *
 * So o Administrador chega aqui. E tambem daqui que se ve o que falta ao arranque, para quem
 * saltou passos ter onde os retomar em vez de os perder.
 */
export function Empresa() {
  const { data: empresa, isLoading } = useEmpresa();
  const { data: estado } = useEstadoArranque();
  const actualizar = useActualizarEmpresa();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [moeda, setMoeda] = useState('MZN');
  const [inicial, setInicial] = useState('');
  const [corMarca, setCorMarca] = useState<string>('azul');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresa) return;
    setNome(empresa.nome);
    setMoeda(empresa.moeda);
    setInicial(empresa.inicialLogotipo ?? '');
    setCorMarca(empresa.corMarca);
  }, [empresa]);

  async function gravar() {
    setErro(null);
    try {
      await actualizar.mutateAsync({
        nome: nome.trim(),
        moeda: moeda.trim().toUpperCase(),
        inicialLogotipo: inicial.trim() || null,
        corMarca: corMarca as 'azul',
      });
      toast.mostrar('Dados da empresa actualizados');
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível gravar.');
    }
  }

  if (isLoading || !empresa) {
    return (
      <Pagina
      acento={'#C3B5FD'} titulo="Dados da empresa" subtitulo="A carregar" larguraMaxima={720}>
        <Carregando />
      </Pagina>
    );
  }

  const porFazer = [
    !estado?.naturezas && { texto: 'Definir pelo menos uma natureza de projecto', para: '/vocabulario' },
    !estado?.estagios && { texto: 'Definir pelo menos um estágio', para: '/vocabulario' },
    !estado?.membros && { texto: 'Registar as pessoas da equipa', para: '/equipa' },
    !estado?.projectos && { texto: 'Registar o primeiro projecto', para: '/projectos' },
  ].filter(Boolean) as { texto: string; para: string }[];

  return (
    <Pagina
      titulo="Dados da empresa"
      subtitulo="O nome, a moeda e a marca com que a empresa aparece"
      larguraMaxima={720}
    >
      {porFazer.length ? (
        <div
          style={{
            ...cartao,
            padding: '18px 20px',
            marginBottom: 20,
            borderLeft: `3px solid ${COR.ambarVivo}`,
          }}
        >
          <div style={{ fontSize: FONTE.base, fontWeight: PESO.forte, marginBottom: 10 }}>
            Ainda falta arrancar
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {porFazer.map((item) => (
              <li key={item.texto} style={{ fontSize: FONTE.corpo, color: COR.texto }}>
                <Link to={item.para}>{item.texto}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section style={{ ...cartao, padding: 24 }}>
        <div className="vn-campos vn-campos-empresa" style={{ marginBottom: 20 }}>
          <div>
            <label style={rotuloCampo} htmlFor="emp-nome">
              Nome da empresa
            </label>
            <input id="emp-nome" value={nome} onChange={(e) => setNome(e.target.value)} style={campo} />
          </div>
          <div>
            <label style={rotuloCampo} htmlFor="emp-moeda">
              Moeda
            </label>
            <input
              id="emp-moeda"
              value={moeda}
              maxLength={3}
              onChange={(e) => setMoeda(e.target.value.toUpperCase())}
              style={{ ...campo, ...numerico }}
            />
          </div>
          <div>
            <label style={rotuloCampo} htmlFor="emp-inicial">
              Iniciais
            </label>
            <input
              id="emp-inicial"
              value={inicial}
              maxLength={2}
              onChange={(e) => setInicial(e.target.value.toUpperCase())}
              style={campo}
            />
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <span style={rotuloCampo}>Cor da marca</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CORES_MARCA.map((c) => {
              const cores = chip(c);
              const activo = corMarca === c;
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

        {erro ? (
          <div
            role="alert"
            style={{
              background: COR.vermelhoFundo,
              border: `1px solid ${COR.vermelhoBorda}`,
              color: COR.vermelho,
              borderRadius: RAIO.campo,
              padding: '10px 12px',
              fontSize: FONTE.corpo,
              marginBottom: 14,
            }}
          >
            {erro}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void gravar()}
          disabled={nome.trim().length < 2 || actualizar.isPending}
          style={{ ...botaoPrincipal, background: nome.trim().length < 2 ? COR.bordaForte : COR.tinta }}
        >
          {actualizar.isPending ? 'A gravar…' : 'Gravar alterações'}
        </button>
      </section>

      <p style={{ margin: '16px 0 0', fontSize: FONTE.nota, color: COR.suave, lineHeight: 1.6 }}>
        As palavras com que classifica projectos e pessoas estão em{' '}
        <Link to="/vocabulario">Vocabulário</Link>.
      </p>
    </Pagina>
  );
}
