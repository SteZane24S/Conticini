import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { App } from './App.js';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/800.css';
import './styles/design-system.css';
import { applicaTemaSalvato } from './tema.js';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root non trovato');
}

applicaTemaSalvato();

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
