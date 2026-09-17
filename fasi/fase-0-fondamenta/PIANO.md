# Fase 0 — Fondamenta

Obiettivo: un monorepo che builda, testa e formatta, un server che si avvia in sicurezza su
localhost, e una web app vuota servita dal server. Nessuna logica di dominio.

## Giro 0.1 — Monorepo e tooling
- `package.json` radice con npm workspaces `packages/*`, `"private": true`, `engines.node >= 24`.
- Pacchetti vuoti `dominio`, `contratti`, `server`, `web`, ciascuno col suo `package.json` e `tsconfig.json` che estende un `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, ESM).
- ESLint flat config con typescript-eslint; su `packages/dominio/**` `no-restricted-imports` vieta `node:*`, `fs`, `path`, `fastify`, `better-sqlite3`, `react`, `zod`.
- Prettier con `format` e `format:check`; Vitest nei workspace.
- Script radice: `build`, `test`, `lint`, `format:check`, `dev`.
- Installazione di `better-sqlite3` con versione **bloccata** (esatta, senza `^`). Criterio: `npm install` non invoca `node-gyp`/compilazione locale (controllare l'output), e uno smoke test apre un DB in memoria. Se compila, il giro si ferma e lo riporta all'utente.
- Test segnaposto in ogni pacchetto.

**Accettazione:** i quattro gate sono verdi; un import di `fastify` dentro `dominio` fa fallire `npm run lint` (provato e poi rimosso).

## Giro 0.2 — Server
- `packages/server`: Fastify 5; `CONTICINI_DATA_DIR` obbligatoria; in sviluppo lo script `dev` la imposta a `sviluppo/.dati-dev`. Creazione della cartella se manca.
- Apertura del DB better-sqlite3 con `journal_mode=WAL` e `foreign_keys=ON`.
- Runner delle migrazioni numerate (`migrations/NNN-nome.sql`), con tabella delle migrazioni applicate, eseguite in transazione. Migrazione `000` = tabella `meta` (`dataset_id`, `device_id`, `schema_version`), valorizzata al primo avvio con UUID v4.
- `GET /api/salute` → `{ ok, versione, datasetId }`.
- Bind solo su `127.0.0.1`, porta da `CONTICINI_PORT` (default 47300). Hook che rifiuta con 421 le richieste con header `Host` diverso da `127.0.0.1:<porta>` o `localhost:<porta>`.
- Istanza singola: se la porta è occupata da un'istanza Conticini (risponde a `/api/salute`), il processo esce con codice 0; se è occupata da altro, esce con errore chiaro.
- Heartbeat: `POST /api/heartbeat`; spegnimento pulito dopo `CONTICINI_IDLE_MINUTES` (default 10) senza heartbeat, **disattivato in sviluppo**.

**Accettazione:** test con `fastify.inject` su salute, rifiuto del `Host` estraneo, migrazioni idempotenti (doppio avvio sullo stesso DB), `meta` stabile fra riavvii.

## Giro 0.3 — Web
- `packages/web`: Vite + React + TS + react-router. Proxy `/api` verso il server in sviluppo.
- Layout provvisorio: menu laterale con le voci Prospetto, Movimenti, Stipendio, Conti, Categorie e regole, Spese fisse, In attesa, Previsioni, Grafici, Backup. Pagine vuote con titolo.
- Heartbeat periodico dal client.
- Il server serve `packages/web/dist` con fallback SPA su `index.html` (esclusa `/api`).
- Script `dev` radice che avvia insieme server e Vite.

**Accettazione:** gate verdi; `live-testing` apre l'app, naviga tutte le voci senza errori in console, e verifica che l'app servita dal server (dopo il build) risponda sulla porta del server.
