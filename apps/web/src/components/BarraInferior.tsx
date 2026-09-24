import { NavLink } from 'react-router-dom';
import { COR, FONTE, MARCA, PESO, numerico } from '../design/tokens';
import { useDestinos } from '../lib/navegacao';
import { Icone } from './icones';
import { ALTURA_BARRA_INFERIOR, useNavegacao } from './Layout';

/**
 * Navegacao do telemovel.
 *
 * Os quatro destinos que se abrem todos os dias ficam onde o polegar chega, a um toque. O resto
 * do menu - roteiro, empresa, perfil, sair - esta em "Mais", que abre a gaveta completa. Com o
 * botao de menu no topo cada troca de ecra custava dois toques e uma viagem ate ao canto oposto.
 *
 * Mesmo fundo escuro da barra lateral: e a mesma navegacao noutra posicao, e deve parecer-se.
 */
export function BarraInferior() {
  const { barra } = useDestinos();
  const { abrirGaveta, gavetaAberta } = useNavegacao();

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 25,
        background: MARCA.verdeEscuro,
        borderTop: '1px solid rgba(255,255,255,.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${barra.length + 1}, minmax(0, 1fr))`,
          height: ALTURA_BARRA_INFERIOR,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {barra.map((destino) => (
          <li key={destino.para} style={{ display: 'flex' }}>
            <NavLink
              to={destino.para}
              className="vn-barra-item"
              aria-label={destino.distintivo ? `${destino.rotulo}, ${destino.distintivo} por tratar` : destino.rotulo}
              style={({ isActive }) => ({
                color: isActive ? COR.branco : 'rgba(255,255,255,.62)',
                fontWeight: isActive ? PESO.forte : PESO.medio,
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                      width: 44,
                      height: 26,
                      borderRadius: 13,
                      background: isActive ? 'rgba(101,190,112,.22)' : 'transparent',
                      color: isActive ? MARCA.verde : 'inherit',
                      transition: 'background .15s ease',
                    }}
                  >
                    <Icone nome={destino.icone} tamanho={20} />
                    {destino.distintivo ? (
                      <span
                        style={{
                          position: 'absolute',
                          top: -3,
                          right: 3,
                          minWidth: 16,
                          height: 16,
                          padding: '0 4px',
                          borderRadius: 8,
                          background: destino.alarme ? COR.vermelhoVivo : COR.ambarVivo,
                          color: COR.branco,
                          fontSize: 9.5,
                          fontWeight: PESO.forte,
                          lineHeight: '16px',
                          textAlign: 'center',
                          border: `1.5px solid ${MARCA.verdeEscuro}`,
                          ...numerico,
                        }}
                      >
                        {destino.distintivo > 99 ? '99+' : destino.distintivo}
                      </span>
                    ) : null}
                  </span>
                  <span style={{ fontSize: FONTE.micro, letterSpacing: '0.01em' }}>{destino.curto ?? destino.rotulo}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li style={{ display: 'flex' }}>
          <button
            type="button"
            onClick={abrirGaveta}
            aria-expanded={gavetaAberta}
            className="vn-barra-item"
            style={{
              color: gavetaAberta ? COR.branco : 'rgba(255,255,255,.62)',
              fontWeight: PESO.medio,
            }}
          >
            <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 44, height: 26 }}>
              <Icone nome="mais" tamanho={20} />
            </span>
            <span style={{ fontSize: FONTE.micro }}>Mais</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
