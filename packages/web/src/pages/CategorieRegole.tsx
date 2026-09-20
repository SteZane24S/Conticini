import { AlberoSettori } from './categorie-regole/AlberoSettori.js';
import { TabellaRegole } from './categorie-regole/TabellaRegole.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useRegole } from './categorie-regole/useRegole.js';
import {
  STILE_GRID_SEZIONI,
  STILE_INTESTAZIONE,
  STILE_PAGINA,
} from './categorie-regole/stili.js';

export function CategorieRegole() {
  const albero = useAlbero();
  const regole = useRegole();

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Categorie e regole</h1>
      </div>
      <div style={STILE_GRID_SEZIONI}>
        <AlberoSettori {...albero} />
        <TabellaRegole
          {...regole}
          categorie={albero.categorie}
          settori={albero.settori}
        />
      </div>
    </div>
  );
}
