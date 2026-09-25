import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';

import { Bottone } from '../components/Bottone.js';
import { Etichetta } from '../components/Etichetta.js';
import { avviaHeartbeat } from '../heartbeat.js';
import { useConteggioOccorrenzePending } from '../pages/in-attesa/dati.js';
import { impostaTema, leggiTema } from '../tema.js';

const STILE_RADICE: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
};

const STILE_SIDEBAR: CSSProperties = {
  width: '244px',
  flex: '0 0 244px',
  borderRight: '2px solid var(--color-divider)',
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  position: 'sticky',
  top: 0,
};

const STILE_INTESTAZIONE: CSSProperties = {
  padding: 'var(--space-4)',
  borderBottom: '2px solid var(--color-divider)',
  display: 'flex',
  alignItems: 'baseline',
  gap: 'var(--space-2)',
};

const STILE_NOME: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '22px',
  letterSpacing: '-0.02em',
};

const STILE_NAV: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'auto',
};

const STILE_VOCE_MENU: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: '10px var(--space-4)',
  borderBottom: '1px solid var(--color-divider)',
  borderLeft: '3px solid transparent',
  cursor: 'pointer',
  fontSize: '14px',
  textAlign: 'left',
  width: '100%',
  textDecoration: 'none',
  color: 'var(--color-text)',
};

const STILE_TESTO_VOCE: CSSProperties = {
  flex: 1,
};

const STILE_CAMBIO_TEMA: CSSProperties = {
  borderTop: '2px solid var(--color-divider)',
  padding: 'var(--space-3) var(--space-4)',
};

const STILE_CONTENUTO: CSSProperties = {
  flex: 1,
  padding: 'var(--space-6) var(--space-8)',
};

const VOCI_MENU = [
  { percorso: '/', etichetta: 'Prospetto' },
  { percorso: '/movimenti', etichetta: 'Movimenti' },
  { percorso: '/stipendio', etichetta: 'Stipendio' },
  { percorso: '/conti', etichetta: 'Conti' },
  { percorso: '/categorie-e-regole', etichetta: 'Categorie e regole' },
  { percorso: '/spese-fisse', etichetta: 'Spese fisse' },
  { percorso: '/in-attesa', etichetta: 'In attesa' },
  { percorso: '/debiti-e-crediti', etichetta: 'Debiti e crediti' },
  { percorso: '/previsioni', etichetta: 'Previsioni' },
  { percorso: '/grafici', etichetta: 'Grafici' },
  { percorso: '/backup', etichetta: 'Backup' },
];

export function Layout() {
  useEffect(() => avviaHeartbeat(), []);
  const conteggioOccorrenzePending = useConteggioOccorrenzePending();
  const [tema, setTema] = useState(leggiTema);

  function cambiaTema() {
    const nuovoTema = tema === 'chiaro' ? 'scuro' : 'chiaro';

    impostaTema(nuovoTema);
    setTema(nuovoTema);
  }

  return (
    <div style={STILE_RADICE}>
      <aside style={STILE_SIDEBAR}>
        <div style={STILE_INTESTAZIONE}>
          <span style={STILE_NOME}>Conticini</span>
          <Etichetta variante="neutral">locale</Etichetta>
        </div>
        <nav style={STILE_NAV}>
          {VOCI_MENU.map((voce) => (
            <NavLink
              key={voce.percorso}
              to={voce.percorso}
              end={voce.percorso === '/'}
              style={({ isActive }) => ({
                ...STILE_VOCE_MENU,
                borderLeftColor: isActive
                  ? 'var(--color-accent)'
                  : 'transparent',
                background: isActive
                  ? 'color-mix(in srgb, var(--color-text) 7%, transparent)'
                  : 'transparent',
                fontWeight: isActive ? 800 : 400,
              })}
            >
              <span style={STILE_TESTO_VOCE}>{voce.etichetta}</span>
              {voce.percorso === '/in-attesa' &&
              conteggioOccorrenzePending !== null &&
              conteggioOccorrenzePending > 0 ? (
                <Etichetta variante="accent">
                  {conteggioOccorrenzePending}
                </Etichetta>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div style={STILE_CAMBIO_TEMA}>
          <Bottone variante="secondaria" blocco onClick={cambiaTema}>
            Tema {tema}
          </Bottone>
        </div>
      </aside>
      <main style={STILE_CONTENUTO}>
        <Outlet />
      </main>
    </div>
  );
}
