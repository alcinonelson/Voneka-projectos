import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { COR, FONTE, MARCA, PESO } from '../design/tokens';
import { MarcaCompleta } from './base';

/**
 * Casca das paginas de entrada e de criacao de empresa.
 *
 * Duas colunas: a esquerda diz porque e que este produto existe, a direita faz a pergunta. O
 * painel da esquerda cai abaixo dos 900px - quando o espaco e pouco, o formulario e que importa.
 *
 * A citacao muda de pagina para pagina porque o que a pessoa esta a fazer e diferente: uma volta
 * ao trabalho, a outra comeca uma casa.
 */
export function CascaPublica({
  titulo,
  subtitulo,
  citacao,
  atribuicao,
  rodape,
  children,
}: {
  titulo: string;
  subtitulo: string;
  citacao: string;
  atribuicao: string;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="vn-entrada" style={{ background: COR.branco }}>
      <aside
        className="vn-entrada-marca"
        style={{
          background: MARCA.verdeEscuro,
          color: COR.branco,
          padding: '32px 40px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', width: 'fit-content' }} aria-label="Voneka Projectos, página inicial">
          <MarcaCompleta tamanho={30} tom="claro" />
        </Link>

        <div style={{ marginTop: 'auto', maxWidth: '34ch' }}>
          <p
            className="vn-display"
            style={{ margin: 0, fontSize: 27, lineHeight: 1.35, color: COR.branco }}
          >
            {citacao}
          </p>
          <p
            style={{
              margin: '18px 0 0',
              fontSize: FONTE.nota,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.5)',
            }}
          >
            {atribuicao}
          </p>
        </div>
      </aside>

      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 24px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 25,
              fontWeight: PESO.forte,
              letterSpacing: '-0.02em',
              color: COR.tinta,
            }}
          >
            {titulo}
          </h1>
          <p style={{ margin: '8px 0 26px', fontSize: FONTE.base, color: COR.textoSuave, lineHeight: 1.6 }}>
            {subtitulo}
          </p>

          {children}

          {rodape ? (
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: `1px solid ${COR.linha}`,
                fontSize: FONTE.corpo,
                color: COR.textoSuave,
                lineHeight: 1.6,
              }}
            >
              {rodape}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/** Bloco de erro comum aos formularios publicos: diz a causa e o caminho de saida. */
export function ErroFormulario({ mensagem }: { mensagem: string }) {
  return (
    <div
      role="alert"
      style={{
        background: COR.vermelhoFundo,
        border: `1px solid ${COR.vermelhoBorda}`,
        color: COR.vermelho,
        borderRadius: 7,
        padding: '11px 13px',
        fontSize: FONTE.corpo,
        lineHeight: 1.55,
        marginBottom: 16,
      }}
    >
      {mensagem}
    </div>
  );
}
