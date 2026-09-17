# Conticini — regole di progetto

App personale di finanza, tutta in locale su Windows. Questo file **aggiunge** al contratto
globale (`~/.claude/CLAUDE.md`), non lo sostituisce. Il piano completo e le decisioni congelate
stanno in `PIANO.md`: non si rimettono in discussione durante un giro. Se il piano è poco chiaro su
un punto, si segue la procedura del contratto globale (`tech-advisor`, poi decisione dell'utente).

## Ripartenza a inizio giro
Leggi, in quest'ordine:
1. `TODO.md`: stato, prossimo giro, pendenze;
2. il `PIANO.md` della fase corrente in `fasi/`;
3. `TODO.md` e `guida-sviluppo.md` dell'ultimo giro chiuso.

Non ricostruire lo stato leggendo il codice.

## Layout
```
Conticini/
  app/          prodotto finale; app/dati/ = database reale e backup dell'utente
  sviluppo/     questo repository (branch main, remote origin su GitHub)
```

## Layer (monorepo npm workspaces)
| Pacchetto | Ruolo | Può importare |
|---|---|---|
| `packages/dominio` | tipi, calcoli puri, interfacce **asincrone** di repository e servizi | solo sé stesso. Vietati Node (`node:*`, `fs`, `path`), `fastify`, `better-sqlite3`, `react`, `zod` |
| `packages/contratti` | schemi zod di richieste e risposte API, con i tipi derivati | `dominio`, `zod` |
| `packages/server` | Fastify 5 + better-sqlite3 (SQL esplicito, niente ORM), migrazioni, catch-up, backup, export, statici web | tutti |
| `packages/web` | React + Vite + react-router + Recharts | `dominio`, `contratti` |

Il confine di `dominio` è imposto da ESLint (`no-restricted-imports`) e non si allenta: è ciò che
permetterà di far girare gli stessi calcoli nel browser nella futura fase mobile.

## Gate (tutti verdi prima di chiudere un giro)
```
npm run build
npm test
npm run lint
npm run format:check
```
Test con Vitest. Le API si testano con `fastify.inject` su un DB temporaneo.
**Playwright è vietato**: l'interfaccia la collauda `live-testing` in Chrome.

## Invarianti di dominio
- Soldi = interi in centesimi, `amount_cents` con segno (+ entrata, − uscita). Parsing dalla stringa (`"12,34"` → 1234), mai `parseFloat * 100`. Tutto in EUR.
- Date = stringhe `YYYY-MM-DD`; "oggi" si calcola nel fuso locale.
- Trasferimento = esattamente 2 movimenti con lo stesso `transfer_group_id`, conti diversi, stessa data, importi opposti, categoria nulla. Si crea, modifica e cancella sempre come gruppo, in un'unica transazione.
- Ciclo = `[stipendio effettivo, stipendio effettivo successivo)`. Un'entrata extra non apre un ciclo.
- Formula del prospetto: `saldo(D) − fisse ancora da pagare − Σ max(0, B_c − S_c(D))`. I casi limite sono in `PIANO.md` («Requisiti congelati») e vanno rispettati tutti.
- Una categoria con previsione non può avere spese fisse attive, e viceversa.
- Occorrenza di una spesa fissa: id = UUIDv5(recurring_id + periodo `YYYY-MM`); movimento automatico: id = UUIDv5(occurrence_id). Il catch-up è idempotente.
- Colonne di sincronizzazione su ogni tabella sincronizzabile: `id` UUID, `created_at`, `updated_at`, `deleted_at`, `revision`, `base_revision`. **Mai DELETE fisico**: si usano tombstone. Ogni scrittura registra in `change_log` nella stessa transazione.
- SQLite: WAL, `foreign_keys=ON`. Il backup si fa solo con l'API di backup di better-sqlite3.

## Dati e ambienti
- La cartella dati la decide `CONTICINI_DATA_DIR`.
- Sviluppo, test e collaudo usano `sviluppo/.dati-dev/` (in gitignore) o DB temporanei.
- **Nessun giro legge o scrive `app/dati/`.** Lo usa solo il launcher del prodotto.
- Server solo su `127.0.0.1`, con controllo dell'header `Host`. Porta di default 47300.

## Collaudo (`live-testing`)
- L'app non ha login: non esiste un account di collaudo, e le condizioni globali sull'account non si applicano.
- L'orchestratore avvia l'istanza di sviluppo con `.dati-dev` (annota porta e PID) e la ferma a fine ciclo.
- URL e porte si ricavano da `packages/web/vite.config.ts` e dalla configurazione del server.

## Git
- Un commit per giro su `main`, dopo il registro.
- Remote `origin` = https://github.com/SteZane24S/Conticini.git: `git push` subito dopo il commit di ogni giro.
