import type { CSSProperties, ReactNode } from 'react';
import { type Alerta, type NomeChip, chip, iniciais } from '@nexora/shared';
import { COR, FONTE, MARCA, PESO, RAIO, barra, cartao, etiqueta, numerico, ponto, superficie } from '../design/tokens';
import { pt } from '../i18n/pt';

/**
 * O simbolo Voneka.
 *
 * Um galao facetado a apontar para baixo: duas triangulares que se encontram no centro, a um
 * terco da altura, e um losango por baixo. O vazio entre as duas triangulares desenha um V.
 *
 * Os vertices nao foram estimados a olho - sao os do logotipo oficial, medidos pixel a pixel a
 * partir de `public/voneka-logo.png` e normalizados para esta viewBox. Tudo converge em dois
 * pontos exactos: o centro (50, 37.5) e a linha de encontro y = 74.3.
 *
 * `tom` decide como o simbolo se comporta sobre o fundo:
 * - `cor`   as tres cores da marca, para fundos claros
 * - `claro` para a barra lateral escura, onde o verde palido nao teria contraste
 * - `mono`  uma so cor herdada do texto, para favicon e impressao
 */
export function Marca({
  tamanho = 28,
  tom = 'cor',
}: {
  tamanho?: number;
  tom?: 'cor' | 'claro' | 'mono';
}) {
  // O simbolo e mais alto do que largo; `tamanho` fixa a altura para alinhar com o texto ao lado.
  const largura = Math.round(tamanho * (100 / 111.2));

  const cores =
    tom === 'claro'
      ? { turquesa: '#3FD2C0', palido: 'rgba(255,255,255,.34)', verde: MARCA.verde }
      : tom === 'mono'
        ? { turquesa: 'currentColor', palido: 'currentColor', verde: 'currentColor' }
        : { turquesa: MARCA.turquesa, palido: MARCA.verdePalido, verde: MARCA.verde };

  return (
    <svg
      viewBox="0 0 100 111.2"
      style={{ width: largura, height: tamanho, display: 'block', flex: `0 0 ${largura}px` }}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0 L50 37.5 L0 74.3 Z" fill={cores.turquesa} />
      <path d="M100 0 L50 37.5 L100 74.3 Z" fill={cores.palido} opacity={tom === 'mono' ? 0.35 : 1} />
      <path d="M50 37.5 L100 74.3 L50 111.2 L0 74.3 Z" fill={cores.verde} />
    </svg>
  );
}

/**
 * Lock-up da marca: simbolo mais nome. Um so sitio a decidir como o produto se apresenta.
 *
 * O letreiro usa Jost, geometrica e de traco leve, porque e o desenho do logotipo oficial - o `A`
 * sem travessa so existe nesse registo. Instrument Sans, que veste o resto do produto, tem outro
 * temperamento e faria a marca parecer um titulo qualquer.
 */
export function MarcaCompleta({
  tamanho = 28,
  empresa = null,
  tom = 'cor',
}: {
  tamanho?: number;
  empresa?: string | null;
  tom?: 'cor' | 'claro';
}) {
  const escuro = tom === 'claro';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Marca tamanho={tamanho} tom={tom} />
      <div style={{ lineHeight: 1.2, minWidth: 0 }}>
        <div
          className="vn-letreiro"
          style={{
            fontSize: Math.round(tamanho * 0.55),
            color: escuro ? COR.branco : MARCA.verdeTexto,
          }}
        >
          VONEKA
        </div>
        <div
          style={{
            fontSize: FONTE.minima,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: escuro ? 'rgba(255,255,255,.55)' : COR.suave,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}
        >
          {empresa ?? 'Projectos'}
        </div>
      </div>
    </div>
  );
}

export function Etiqueta({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return <span style={etiqueta(fg, bg)}>{children}</span>;
}

/**
 * Etiqueta de uma entrada do vocabulario da empresa.
 *
 * A cor vem do nome de chip guardado na taxonomia. `chip()` degrada para neutro quando o nome nao
 * e conhecido, o que importa aqui: estes valores sao escritos por quem usa o produto.
 */
export function EtiquetaVocabulario({
  valor,
  comPonto = false,
}: {
  valor: { rotulo: string; cor: string } | null | undefined;
  comPonto?: boolean;
}) {
  if (!valor) return <span style={{ color: COR.suave }}>—</span>;
  const c = chip(valor.cor);
  if (comPonto) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <Ponto cor={c.ponto} tamanho={6} />
        <span style={{ fontSize: FONTE.nota, color: c.fg, fontWeight: PESO.medio }}>{valor.rotulo}</span>
      </span>
    );
  }
  return <span style={etiqueta(c.fg, c.bg)}>{valor.rotulo}</span>;
}

export function Ponto({ cor, tamanho = 8 }: { cor: string; tamanho?: number }) {
  return <span style={ponto(cor, tamanho)} />;
}

/**
 * Etiqueta de prazo.
 *
 * O alerta chega calculado do servidor com o texto e as cores ja resolvidos, para que a mesma
 * deadline nunca apareca em dois tons diferentes em dois ecras.
 */
export function PastilhaAlerta({ alerta, pequena = false }: { alerta: Alerta; pequena?: boolean }) {
  return (
    <span
      style={{
        fontSize: pequena ? FONTE.minima : FONTE.nota,
        fontWeight: PESO.forte,
        padding: pequena ? '3px 8px' : '4px 9px',
        borderRadius: RAIO.botao,
        whiteSpace: 'nowrap',
        color: alerta.fg,
        background: alerta.bg,
        ...numerico,
      }}
    >
      {alerta.texto}
    </span>
  );
}

/** Tracinho de semaforo que abre uma linha de decisao. */
export function Semaforo({ cor }: { cor: string }) {
  return <span style={{ width: 3, height: 34, borderRadius: 2, flex: '0 0 3px', background: cor }} />;
}

export function Avatar({
  nome,
  tamanho = 26,
  esbatido = false,
}: {
  nome: string;
  tamanho?: number;
  esbatido?: boolean;
}) {
  return (
    <span
      style={{
        width: tamanho,
        height: tamanho,
        flex: `0 0 ${tamanho}px`,
        borderRadius: '50%',
        background: esbatido ? COR.linha : COR.tinta,
        color: esbatido ? COR.suave : COR.branco,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: tamanho <= 24 ? 10 : 11,
        fontWeight: PESO.forte,
        letterSpacing: '0.01em',
      }}
    >
      {iniciais(nome)}
    </span>
  );
}

export function BarraAvanco({
  pct,
  cor,
  largura = 132,
}: {
  pct: number;
  cor: string;
  largura?: number;
}) {
  // A classe deixa o CSS alargar a barra no telemovel, onde ela ocupa uma linha propria.
  return (
    <span className="vn-barra-avanco" style={barra(largura)}>
      <span
        style={{
          display: 'block',
          height: '100%',
          borderRadius: 3,
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: cor,
        }}
      />
    </span>
  );
}

/** Numero grande da faixa de foco. */
/**
 * Numero em cartao tingido.
 *
 * A cor do fundo nao e decorativa: cada quadro do painel tem um tom proprio para se distinguir
 * a relance, e o quadro que conta o atraso muda de tom quando ha atraso. Um painel todo branco
 * obriga a ler os rotulos para saber o que se esta a ver; a cor faz metade desse trabalho antes
 * de a leitura comecar.
 */
export function CartaoNumero({
  rotulo,
  valor,
  nota,
  tom = 'neutro',
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  tom?: NomeChip;
  /** Segunda leitura, com a sua propria cor: o desvio face ao plano, por exemplo. */
  destaque?: { texto: string; cor: string };
}) {
  const c = chip(tom);
  return (
    <div style={{ ...superficie(tom), padding: '16px 18px', minWidth: 0 }}>
      <div style={{ fontSize: FONTE.nota, color: c.fg, fontWeight: PESO.medio }}>{rotulo}</div>
      <div
        style={{
          fontSize: FONTE.destaque,
          fontWeight: PESO.forte,
          letterSpacing: '-0.025em',
          marginTop: 6,
          color: c.fg,
          ...numerico,
        }}
      >
        {valor}
      </div>
      <div style={{ fontSize: FONTE.nota, color: COR.textoSuave, marginTop: 4 }}>{nota}</div>
      {destaque ? (
        <div style={{ fontSize: FONTE.nota, color: destaque.cor, fontWeight: PESO.medio, marginTop: 6 }}>
          {destaque.texto}
        </div>
      ) : null}
    </div>
  );
}

export function NumeroDestaque({
  rotulo,
  valor,
  nota,
  cor = COR.tinta,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  cor?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: FONTE.nota, color: COR.suave }}>{rotulo}</div>
      <div
        style={{
          fontSize: FONTE.destaque,
          fontWeight: PESO.forte,
          letterSpacing: '-0.025em',
          marginTop: 8,
          color: cor,
          ...numerico,
        }}
      >
        {valor}
      </div>
      <div style={{ fontSize: FONTE.nota, color: COR.suave, marginTop: 5 }}>{nota}</div>
    </div>
  );
}

/** Estado vazio: diz o que falta, nunca apenas "sem dados". */
export function Vazio({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: '32px 20px',
        textAlign: 'center',
        fontSize: FONTE.base,
        color: COR.suave,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Carregando({ children = 'A carregar…' }: { children?: ReactNode }) {
  return <Vazio>{children}</Vazio>;
}

/** Falha de consulta: diz o que nao veio, nunca finge uma lista vazia. */
export function FalhaCarregar({ de }: { de: string }) {
  return <Vazio style={{ ...cartao, padding: 40 }}>{pt.erros.consultaDe(de)}</Vazio>;
}
