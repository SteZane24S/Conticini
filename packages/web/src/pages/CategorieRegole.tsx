import type { CSSProperties } from 'react';

import { AlberoSettori } from './categorie-regole/AlberoSettori.js';
import { TabellaRegole } from './categorie-regole/TabellaRegole.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useRegole } from './categorie-regole/useRegole.js';

const STILE_PAGINA: CSSProperties = { padding: '1.5rem' };

export function CategorieRegole() {
  const albero = useAlbero();
  const regole = useRegole();

  return (
    <div style={STILE_PAGINA}>
      <h1>Categorie e regole</h1>
      <AlberoSettori {...albero} />
      <TabellaRegole
        {...regole}
        categorie={albero.categorie}
        settori={albero.settori}
      />
    </div>
  );
}
