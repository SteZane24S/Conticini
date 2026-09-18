import { useState } from 'react';

import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { ElencoMovimenti } from './movimenti/ElencoMovimenti.js';
import { InserimentoRapido } from './movimenti/InserimentoRapido.js';
import { useMovimenti, type FiltriMovimentiUI } from './movimenti/dati.js';
import { STILE_PAGINA } from './movimenti/stili.js';

export function Movimenti() {
  const { conti } = useConti();
  const { settori, categorie, creaSettore, creaCategoria } = useAlbero();
  const [filtri, setFiltri] = useState<FiltriMovimentiUI>({});
  const {
    movimenti,
    totaleEntrateCents,
    totaleUsciteCents,
    caricando,
    errore,
    crea,
    aggiorna,
    elimina,
  } = useMovimenti(filtri);

  return (
    <div style={STILE_PAGINA}>
      <h1>Movimenti</h1>
      <InserimentoRapido
        conti={conti}
        settori={settori}
        categorie={categorie}
        creaMovimento={crea}
        creaSettore={creaSettore}
        creaCategoria={creaCategoria}
      />
      <ElencoMovimenti
        conti={conti}
        settori={settori}
        categorie={categorie}
        filtri={filtri}
        onCambiaFiltri={setFiltri}
        movimenti={movimenti}
        totaleEntrateCents={totaleEntrateCents}
        totaleUsciteCents={totaleUsciteCents}
        caricando={caricando}
        errore={errore}
        aggiorna={aggiorna}
        elimina={elimina}
      />
    </div>
  );
}
