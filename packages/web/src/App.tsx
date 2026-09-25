import { Route, Routes } from 'react-router';

import { Layout } from './layout/Layout.js';
import { Backup } from './pages/Backup.js';
import { CategorieRegole } from './pages/CategorieRegole.js';
import { Conti } from './pages/Conti.js';
import { DebitiCrediti } from './pages/DebitiCrediti.js';
import { Grafici } from './pages/Grafici.js';
import { InAttesa } from './pages/InAttesa.js';
import { Movimenti } from './pages/Movimenti.js';
import { Previsioni } from './pages/Previsioni.js';
import { Prospetto } from './pages/Prospetto.js';
import { SpeseFisse } from './pages/SpeseFisse.js';
import { Stipendio } from './pages/Stipendio.js';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Prospetto />} />
        <Route path="movimenti" element={<Movimenti />} />
        <Route path="stipendio" element={<Stipendio />} />
        <Route path="conti" element={<Conti />} />
        <Route path="categorie-e-regole" element={<CategorieRegole />} />
        <Route path="spese-fisse" element={<SpeseFisse />} />
        <Route path="in-attesa" element={<InAttesa />} />
        <Route path="debiti-e-crediti" element={<DebitiCrediti />} />
        <Route path="previsioni" element={<Previsioni />} />
        <Route path="grafici" element={<Grafici />} />
        <Route path="backup" element={<Backup />} />
      </Route>
    </Routes>
  );
}
