import { Component, type ErrorInfo, type ReactNode } from 'react';
import { COR, FONTE, PESO, botaoPrincipal } from '../design/tokens';
import { pt } from '../i18n/pt';

/**
 * Ultima rede: um erro de renderizacao nao deixa a pagina em branco.
 * O detalhe tecnico fica no log do navegador; quem usa ve o que fazer a seguir.
 */
export class FronteiraErro extends Component<{ children: ReactNode }, { falhou: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { falhou: false };
  }

  static getDerivedStateFromError(): { falhou: boolean } {
    return { falhou: true };
  }

  override componentDidCatch(erro: Error, info: ErrorInfo): void {
    console.error('[UI] Renderizacao falhou', erro.message, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.falhou) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 32,
          background: COR.fundo,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: FONTE.media, fontWeight: PESO.medio, lineHeight: 1.5 }}>
            {pt.erros.inesperado}
          </p>
          <button type="button" style={botaoPrincipal} onClick={() => window.location.reload()}>
            {pt.erros.recarregar}
          </button>
        </div>
      </div>
    );
  }
}
