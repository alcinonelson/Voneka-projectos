import { useState } from 'react';
import { COR, FONTE, PESO, RAIO, SOMBRA, botaoSecundario, numerico } from '../design/tokens';
import { pt } from '../i18n/pt';
import { useMarcarNotificacaoLida, useMarcarTodasNotificacoesLidas, useNotificacoes } from '../lib/queries';

/**
 * Lista dos avisos no rodape do menu.
 *
 * O numero no perfil diz quantos ha; este painel diz quais sao e deixa marca-los como lidos.
 */
export function InboxAvisos({ recolhido }: { recolhido: boolean }) {
  const { data } = useNotificacoes();
  const marcar = useMarcarNotificacaoLida();
  const marcarTodas = useMarcarTodasNotificacoesLidas();
  const [aberto, setAberto] = useState(false);

  const avisos = data?.avisos ?? [];
  const porLer = data?.porLer ?? 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={pt.avisos.abrir}
        title={pt.avisos.titulo}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: recolhido ? 'center' : 'flex-start',
          gap: 8,
          width: '100%',
          height: 32,
          padding: recolhido ? 0 : '0 10px',
          border: 'none',
          background: aberto ? 'rgba(255,255,255,.09)' : 'transparent',
          borderRadius: RAIO.campo,
          color: 'rgba(255,255,255,.72)',
          fontSize: FONTE.corpo,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 14 }}>
          ◍
        </span>
        {recolhido ? (
          porLer ? (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 4,
                background: COR.ambarVivo,
              }}
            />
          ) : null
        ) : (
          <>
            <span style={{ flex: 1, textAlign: 'left' }}>{pt.avisos.titulo}</span>
            {porLer ? (
              <span style={{ ...numerico, fontSize: FONTE.micro, fontWeight: PESO.forte }}>{porLer}</span>
            ) : null}
          </>
        )}
      </button>

      {aberto ? (
        <div
          role="dialog"
          aria-label={pt.avisos.titulo}
          style={{
            position: 'absolute',
            left: recolhido ? 48 : 0,
            bottom: 40,
            width: 320,
            maxHeight: 360,
            overflowY: 'auto',
            background: COR.branco,
            color: COR.tinta,
            border: `1px solid ${COR.borda}`,
            borderRadius: RAIO.medio,
            boxShadow: SOMBRA.modal,
            zIndex: 40,
            padding: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
            <strong style={{ fontSize: FONTE.corpo, fontWeight: PESO.forte }}>{pt.avisos.titulo}</strong>
            {porLer ? (
              <button
                type="button"
                onClick={() => void marcarTodas.mutateAsync()}
                style={{ ...botaoSecundario, height: 26, marginLeft: 'auto', padding: '0 8px' }}
              >
                {pt.avisos.marcarLido}
              </button>
            ) : null}
          </div>

          {avisos.length === 0 ? (
            <p style={{ margin: 0, padding: 12, fontSize: FONTE.corpo, color: COR.suave }}>{pt.avisos.vazio}</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {avisos.map((aviso) => (
                <li key={aviso.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!aviso.lida) void marcar.mutateAsync(aviso.id);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: aviso.lida ? 'transparent' : COR.fundoHover,
                      borderRadius: RAIO.campo,
                      padding: '10px 10px',
                      cursor: aviso.lida ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: FONTE.corpo,
                        fontWeight: aviso.lida ? PESO.normal : PESO.medio,
                        lineHeight: 1.4,
                      }}
                    >
                      {aviso.titulo}
                    </span>
                    {aviso.detalhe ? (
                      <span style={{ display: 'block', fontSize: FONTE.nota, color: COR.suave, marginTop: 3 }}>
                        {aviso.detalhe}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
