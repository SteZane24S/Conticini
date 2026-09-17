# Fase 4 — Grafici, backup, rilascio

## Giro 4.1 — Grafici
- API di aggregazione (i trasferimenti sono esclusi in modo esplicito): spese per settore e per categoria in un ciclo o in un periodo; saldo giornaliero in un periodo; previsto vs speso per ciclo.
- Pagina **Grafici** con Recharts (bundle locale, nessuna risorsa da CDN):
  - torta per settore con drill-down alle categorie;
  - linea del saldo;
  - barre previsto/speso;
  - selettore di ciclo o periodo.

**Accettazione:** `live-testing` verifica che i totali dei grafici coincidano con l'elenco dei movimenti filtrato allo stesso modo.

## Giro 4.2 — Backup, ripristino, export
- **Backup**:
  - `POST /api/backup` usa l'API `db.backup()` di better-sqlite3 verso `<cartella scelta>/conticini-AAAAMMGG-HHMMSS.db`; la cartella di default è `CONTICINI_DATA_DIR/backup`, modificabile e salvata nelle impostazioni;
  - rotazione: ultimi N backup, configurabile;
  - stato dell'ultimo backup riuscito nella pagina e avviso se è più vecchio di 7 giorni;
  - backup automatico all'avvio se l'ultimo ha più di 24 ore.
- **Ripristino**: scelta di un file di backup; verifica (`PRAGMA integrity_check`, `meta` presente, `schema_version` compatibile); backup di sicurezza del DB corrente; sostituzione a DB chiuso; riapertura.
- **Export**:
  - CSV dei movimenti filtrati per Excel italiano (UTF-8 con BOM, separatore `;`, virgola decimale, date `GG/MM/AAAA`);
  - JSON completo di tutte le entità, tombstone compresi, con `formatVersion`, `schemaVersion` e `datasetId`.

**Accettazione:** test automatico backup → modifica → ripristino → dati uguali al backup; `live-testing` sulla pagina Backup.

## Giro 4.3 — Rilascio in `app/`
- Script `npm run release`:
  - bundle del server (esbuild) + `node_modules` minimi per `better-sqlite3` + `packages/web/dist`;
  - destinazione `Conticini/app/programma/`;
  - **non tocca mai `app/dati/`**.
- Launcher `app/Conticini.vbs`, eseguito senza console:
  1. se `/api/salute` risponde, apre la finestra;
  2. altrimenti avvia `node programma/server.js` con `CONTICINI_DATA_DIR=app\dati`, attende la salute (timeout con messaggio);
  3. apre `msedge --app=http://127.0.0.1:47300` (se manca Edge, usa Chrome `--app`).
- Icona `.ico` e collegamento sul desktop creato dallo script (`npm run release -- --collegamento`).
- Procedura di aggiornamento documentata nel `README.md` di `app/`: chiudere l'app, `npm run release`, riaprire. Il backup automatico precede le migrazioni.
- Controllo all'avvio: se Node manca o la versione è troppo vecchia, messaggio chiaro.

**Accettazione:**
- avvio dall'icona con finestra dedicata e DB creato in `app/dati/`;
- secondo click con app già aperta → nessuna seconda istanza;
- dopo la chiusura della finestra il server si spegne entro il timeout.

Questa prova la esegue l'utente, guidato in chat un passo alla volta.
