import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { COR, ESPACO, FONTE,
  MARCA, PESO, RAIO, SOMBRA, botaoPrincipal, botaoSecundario } from '../design/tokens';

/**
 * Modal e gaveta assentam nas primitivas do Radix.
 *
 * O Radix entra apenas pelo comportamento - foco preso dentro do dialogo, Esc a fechar, atributos
 * ARIA, deslocamento da pagina travado por baixo. Nao traz um pixel de estilo: a aparencia
 * continua a ser a do design, escrita aqui.
 */

const sobreposicao = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(16, 24, 40, 0.28)',
  animation: 'nx-fade .16s ease',
};

export interface AccaoModal {
  rotulo: string;
  onClick: () => void;
  /** Bloqueia o botao e mostra o rodape a dizer o que falta. */
  desactivada?: boolean;
  aCarregar?: boolean;
}

/**
 * Passos de um formulario longo.
 *
 * Onze campos de uma vez pedem a quem preenche que perceba o formulario todo antes de escrever a
 * primeira letra. Divididos em passos com nome, cada ecra faz uma so pergunta.
 */
export interface PassosModal {
  actual: number;
  rotulos: string[];
}

export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  largura = 640,
  children,
  rodapeNota,
  rodapeErro,
  accao,
  accaoAnterior,
  passos,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  subtitulo?: string;
  largura?: number;
  children: ReactNode;
  /** Nota do rodape: o que vai acontecer, ou o que ainda falta preencher. */
  rodapeNota?: string;
  rodapeErro?: boolean;
  accao?: AccaoModal;
  /** Botao de recuo num formulario por passos. */
  accaoAnterior?: { rotulo: string; onClick: () => void };
  passos?: PassosModal;
}) {
  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay style={sobreposicao} />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: largura,
            maxWidth: 'calc(100vw - 48px)',
            maxHeight: 'calc(100vh - 64px)',
            display: 'flex',
            flexDirection: 'column',
            background: COR.branco,
            borderRadius: RAIO.cartao,
            boxShadow: SOMBRA.modal,
            animation: 'nx-modal .18s ease',
            outline: 'none',
          }}
        >
          <div style={{ padding: `20px ${ESPACO.pagina}px 16px`, borderBottom: `1px solid ${COR.borda}` }}>
            <Dialog.Title
              style={{ fontSize: FONTE.titulo, fontWeight: PESO.forte, letterSpacing: '-0.01em', margin: 0 }}
            >
              {titulo}
            </Dialog.Title>
            {subtitulo ? (
              <Dialog.Description style={{ fontSize: FONTE.pequena, color: COR.textoSuave, marginTop: 4 }}>
                {subtitulo}
              </Dialog.Description>
            ) : null}

            {passos ? (
              <ol
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  listStyle: 'none',
                  margin: '14px 0 0',
                  padding: 0,
                }}
              >
                {passos.rotulos.map((rotulo, i) => {
                  const feito = i < passos.actual;
                  const activo = i === passos.actual;
                  return (
                    <li key={rotulo} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span
                        aria-current={activo ? 'step' : undefined}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          fontSize: FONTE.nota,
                          fontWeight: activo ? PESO.forte : PESO.normal,
                          color: activo ? COR.tinta : feito ? COR.texto : COR.suave,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 10,
                            fontWeight: PESO.forte,
                            color: activo || feito ? COR.branco : COR.textoSuave,
                            background: activo ? MARCA.turquesa : feito ? MARCA.verde : COR.linha,
                          }}
                        >
                          {feito ? '✓' : i + 1}
                        </span>
                        {rotulo}
                      </span>
                      {i < passos.rotulos.length - 1 ? (
                        <span style={{ width: 18, height: 1, background: COR.borda }} />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: `20px ${ESPACO.pagina}px` }}>{children}</div>

          {accao ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: `14px ${ESPACO.pagina}px`,
                borderTop: `1px solid ${COR.borda}`,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: FONTE.nota,
                  color: rodapeErro ? COR.vermelho : COR.suave,
                  lineHeight: 1.5,
                }}
              >
                {rodapeNota}
              </span>
              <button
                type="button"
                style={botaoSecundario}
                onClick={accaoAnterior ? accaoAnterior.onClick : onFechar}
              >
                {accaoAnterior ? accaoAnterior.rotulo : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={accao.onClick}
                disabled={accao.desactivada || accao.aCarregar}
                style={{
                  ...botaoPrincipal,
                  // O botao inactivo fica cinzento em vez de desaparecer: continua a dizer que
                  // existe uma accao, e o rodape explica o que falta para a alcancar.
                  background: accao.desactivada ? COR.bordaForte : COR.tinta,
                  cursor: accao.desactivada ? 'not-allowed' : 'pointer',
                }}
              >
                {accao.aCarregar ? 'A gravar…' : accao.rotulo}
              </button>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Gaveta lateral, usada pelo detalhe do projecto. */
export function Gaveta({
  aberta,
  onFechar,
  children,
  largura = 720,
}: {
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
  largura?: number;
}) {
  return (
    <Dialog.Root open={aberta} onOpenChange={(v) => !v && onFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay style={sobreposicao} />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: largura,
            maxWidth: 'calc(100vw - 80px)',
            background: COR.fundo,
            boxShadow: SOMBRA.gaveta,
            animation: 'nx-drawer .2s ease',
            display: 'flex',
            flexDirection: 'column',
            outline: 'none',
          }}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const TituloGaveta = Dialog.Title;
export const FecharDialogo = Dialog.Close;
