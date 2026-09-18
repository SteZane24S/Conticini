import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router';

import { avviaHeartbeat } from '../heartbeat.js';
import { useConteggioOccorrenzePending } from '../pages/in-attesa/dati.js';

const VOCI_MENU = [
  { percorso: '/', etichetta: 'Prospetto' },
  { percorso: '/movimenti', etichetta: 'Movimenti' },
  { percorso: '/stipendio', etichetta: 'Stipendio' },
  { percorso: '/conti', etichetta: 'Conti' },
  { percorso: '/categorie-e-regole', etichetta: 'Categorie e regole' },
  { percorso: '/spese-fisse', etichetta: 'Spese fisse' },
  { percorso: '/in-attesa', etichetta: 'In attesa' },
  { percorso: '/previsioni', etichetta: 'Previsioni' },
  { percorso: '/grafici', etichetta: 'Grafici' },
  { percorso: '/backup', etichetta: 'Backup' },
];

export function Layout() {
  useEffect(() => avviaHeartbeat(), []);
  const conteggioOccorrenzePending = useConteggioOccorrenzePending();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav>
        <ul>
          {VOCI_MENU.map((voce) => (
            <li key={voce.percorso}>
              <NavLink to={voce.percorso} end={voce.percorso === '/'}>
                {voce.percorso === '/in-attesa' &&
                conteggioOccorrenzePending !== null &&
                conteggioOccorrenzePending > 0
                  ? `${voce.etichetta} (${conteggioOccorrenzePending})`
                  : voce.etichetta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
