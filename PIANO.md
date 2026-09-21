# Conticini — piano di progetto

## Context
L'utente vuole un'app personale, tutta in locale su PC Windows, per tenere le proprie finanze:
movimenti inseriti a mano con categorie dettagliate che l'app "impara", più conti e trasferimenti,
stipendio a data e importo variabili, spese fisse configurabili, previsioni di spesa per categoria e
un prospetto del **saldo al prossimo stipendio**, anche calcolato a una data scelta. La cartella
`Conticini` è vuota. Questa sessione (Opus 5, pianificazione di apertura) produce piano, TODO e
struttura; poi ci si ferma e ogni giro di esecuzione lo fa Sonnet 5 `high` a contesto pulito,
secondo il contratto globale. In futuro, con una nuova pianificazione, l'app dovrà girare anche su
Android e iOS con sincronizzazione tramite Google Drive: l'architettura di oggi non deve impedirlo.

Decisioni prese con l'utente e con `tech-advisor` (gpt-6-astra high, thread
`01a0aed2-0203-7bc2-9204-fbd42ccdaf4d`) il 17/09/2026 — sono **congelate**.

## Requisiti congelati
- **Movimento**: data, importo, descrizione, conto, categoria. Categorie su 2 livelli (Settore > Categoria), ciascuna di tipo `entrata` o `uscita`.
- **Apprendimento**: (1) autocompletamento delle descrizioni già usate, con categoria e importo abituali; (2) categoria e settore creati al volo dal form; (3) regole esplicite "descrizione contiene X → categoria Y", con priorità deterministica. La scelta manuale vince sempre.
- **Conti/fonti** aggiunti a piacere, ciascuno col proprio saldo iniziale e la data di apertura. Trasferimenti fra conti: non sono né entrate né uscite.
- **Entrate extra** categorizzate: rimborsi, vendite, regali.
- **Stipendio**: data e importo variabili, registrati a mano; alla registrazione si indicano la data prevista del prossimo e, facoltativamente, l'importo previsto. **Periodo = ciclo** `[stipendio effettivo, stipendio effettivo successivo)`.
- **Spese fisse**: ricorrenza mensile (giorno N), ogni N mesi, annuale; data di inizio e data di fine facoltativa; flag **automatica/manuale** per ogni spesa. Il giorno 31 nei mesi corti diventa l'ultimo giorno del mese, e l'ancora resta 31. Il 29/2 nelle annuali segue la stessa regola. Nessuno slittamento per weekend.
- **Previsioni di spesa** per categoria: un valore predefinito che vale per ogni ciclo, con la possibilità di sovrascriverlo nel singolo ciclo. **Vincolo**: una categoria con previsione non può avere spese fisse attive, e viceversa.
- **Formula** (D = data di riferimento, E = data prevista del prossimo stipendio):
  `saldo_previsto(E⁻) = saldo(D) − Σ fisse ancora da pagare − Σ_c max(0, B_c − S_c(D))`
  - `saldo(D)` = Σ saldi iniziali dei conti aperti entro D + Σ movimenti con `data ≤ D` (i trasferimenti si annullano).
  - Fisse ancora da pagare = occorrenze con scadenza in `(D, E)` **più** le occorrenze con scadenza ≤ D non pagate entro D (le manuali scadute restano impegni finché non vengono confermate o saltate). "Pagata entro D" significa movimento collegato con data ≤ D, non `status = confirmed`. Per le occorrenze non pagate si usa l'importo previsto.
  - `S_c(D)` = spese della categoria c nel ciclo che contiene D, con data ≤ D. Se c sfora, il residuo è 0 e l'eccedenza è già nel saldo.
  - Lo stipendio futuro è escluso. Si mostra a parte, ben distinto, "dopo l'accredito previsto" quando esiste l'importo previsto.
  - Se manca E, oppure E ≤ D senza un nuovo stipendio: saldo e arretrati sì, ma **nessun numero "al prossimo stipendio"**; si chiede di aggiornare la data prevista. Il ciclo resta aperto e il budget non si azzera.
  - Prima del primo stipendio registrato: saldo disponibile, previsioni non definite.
  - Con D futura, il saldo dei soli movimenti registrati va etichettato come tale; non si materializzano pagamenti futuri.
- **Extra**: grafici; backup del DB con ripristino; export CSV per Excel italiano (separatore `;`, virgola decimale); export JSON completo con versione del formato.
- **UI provvisoria** ora; restyling con Claude Design in una fase dedicata.
- **Avvio**: icona → server locale → finestra Edge `--app`, senza barra degli indirizzi.
- Tutti i conti sono in EUR.

## Architettura (scelta A del tech-advisor)
TypeScript ovunque, monorepo con npm workspaces in `Conticini/sviluppo`:

| Pacchetto | Contenuto | Può importare |
|---|---|---|
| `packages/dominio` | tipi, calcoli puri (soldi, date, ricorrenze, saldi, cicli, previsione, regole) e **interfacce asincrone** dei repository e dei servizi applicativi | niente di Node, Fastify, SQLite, React |
| `packages/contratti` | schemi **zod** delle richieste e risposte API, con i tipi derivati | `dominio`, `zod` |
| `packages/server` | Fastify 5, adattatore **better-sqlite3** (SQL esplicito, niente ORM), migrazioni numerate, catch-up delle ricorrenze, backup, export, statici della build web | tutti |
| `packages/web` | React + Vite + TS, react-router, grafici con **Recharts** (bundle locale), fetch tipizzato sui `contratti` | `dominio`, `contratti` |

- La regola del confine è imposta da ESLint `no-restricted-imports` su `dominio`. È la condizione del riuso sul mobile futuro: lì i servizi gireranno nel browser con un adattatore di persistenza diverso.
- **Soldi**: interi in centesimi (`INTEGER`), `amount_cents` **con segno** (+ entrata, − uscita). Il parsing avviene sulla stringa (`"12,34"` → 1234), mai con `parseFloat*100`. Limite applicativo sugli importi e controllo di overflow sugli aggregati.
- **Date**: stringhe `YYYY-MM-DD`; il "giorno corrente" si calcola nel fuso locale.
- **Server** in ascolto solo su `127.0.0.1`, porta fissa configurabile (default 47300), con controllo dell'header `Host` contro il DNS rebinding. Istanza singola. Il frontend manda un heartbeat e il server si spegne dopo alcuni minuti senza heartbeat.
- **Dati**: `CONTICINI_DATA_DIR`. In sviluppo vale `sviluppo/.dati-dev/` (in gitignore); nel prodotto `app/dati/`. **Collaudo e test non toccano mai `app/dati/`.** SQLite in modalità WAL, `foreign_keys=ON`.
- **Test**: Vitest. Dominio con unit test fitti; API con `fastify.inject` su un DB temporaneo. **Niente Playwright**: il collaudo dell'interfaccia lo fa `live-testing` in Chrome.
- Il supporto di better-sqlite3 su Node 24 / win-x64 (ABI 137) è verificato dal consulente sulla release 12.10.0. Al giro 0.1 si blocca la versione e si verifica che l'installazione **non** compili in locale; se compila, il giro si ferma e lo riporta.

## Modello dati (pronto per la sincronizzazione futura)
Colonne comuni a ogni tabella sincronizzabile: `id TEXT` (UUID v4; **v5 deterministico** dove indicato), `created_at`, `updated_at`, `deleted_at` (tombstone, mai DELETE fisico), `revision` (UUID della revisione) e `base_revision`.
- `meta`: `dataset_id`, `device_id`, `schema_version`.
- `change_log`: `op_id`, `device_id`, entità, id, `base_revision`, `revision`, `payload`, timestamp. Si scrive **nella stessa transazione** della modifica, centralizzato nell'adattatore; oggi non lo consuma nessuno.
- `accounts` (nome, saldo iniziale, data di apertura, archiviato). Vietati movimenti anteriori all'apertura.
- `sectors`; `categories` (sector_id, nome, kind `entrata|uscita`); unicità del nome dentro il settore.
- `transactions` (date, amount_cents, account_id, category_id NULL solo nei trasferimenti, description, description_norm, transfer_group_id NULL). **Trasferimento** = esattamente 2 righe, conti diversi, stessa data, importi opposti, categoria nulla. Creazione, modifica e cancellazione si fanno sul gruppo, in un'unica transazione SQLite. I report entrate/uscite escludono i trasferimenti in modo esplicito.
- `salary_cycles` (salary_transaction_id UNIQUE, start_date, expected_next_date NULL, expected_amount_cents NULL). Un'entrata extra non apre un ciclo.
- `recurring_expenses` (nome, rule_type `monthly|every_n_months|yearly`, interval, anchor_day, anchor_month, start_date, end_date NULL, amount_cents, account_id, category_id, mode `auto|manual`, active). Le modifiche non riscrivono le occorrenze già avvenute.
- `recurring_occurrences`: id = UUIDv5(recurring_id + periodo nominale `YYYY-MM`), UNIQUE(recurring_id, period). Contiene una copia di scadenza, importo, conto, categoria e modalità, più `status pending|paid|skipped` e `transaction_id` UNIQUE NULL. Il movimento automatico ha id UUIDv5(occurrence_id). Alla conferma si possono correggere importo e **data**; in alternativa si collega un movimento già inserito.
- **Catch-up** atomico e idempotente, come comando esplicito all'avvio e al cambio di giorno (non dentro ogni GET). Materializza le occorrenze fino a un orizzonte e, per le automatiche con scadenza ≤ oggi, crea il movimento datato alla scadenza.
- `budget_defaults` (category_id UNIQUE, amount_cents); `budget_overrides` (cycle_id, category_id, amount_cents, UNIQUE(cycle_id, category_id)). Il budget effettivo è l'override se c'è, altrimenti il default.
- `category_rules` (pattern normalizzato, category_id, priority, active). Normalizzazione: minuscole, senza accenti, spazi compressi. Precedenza: priorità più alta, poi pattern più lungo, poi il più recente.
- Autocompletamento derivato dai movimenti (`description_norm`, con frequenza e recenza): nessuna tabella dedicata.

## Struttura delle cartelle
```
Conticini/
  app/                      prodotto finale (vuoto fino alla fase 4)
    dati/                   database e backup — mai toccato dalle build
  sviluppo/                 repository git (branch main, remote origin https://github.com/SteZane24S/Conticini.git)
    CLAUDE.md               regole di progetto (layer, comandi, invarianti, ambiente di collaudo)
    PIANO.md                questo piano
    TODO.md                 documento di stato: riga di stato, checklist dei giri, pendenze
    fasi/
      README.md             convenzione del registro dei giri
      fase-0-fondamenta/PIANO.md
      fase-1-dominio/PIANO.md
      fase-2-persistenza-api/PIANO.md
      fase-3-ui-provvisoria/PIANO.md
      fase-4-grafici-backup-rilascio/PIANO.md
      fase-5-design/PIANO.md          (contiene il brief per Claude Design)
      fase-6-debiti-crediti/PIANO.md
      fase-7-mobile-sync/PIANO.md
    storico/                (vuoto; regola globale sui documenti superati)
```
Ogni giro crea `fasi/fase-N-…/giro-N.M/` con `TODO.md` e `guida-sviluppo.md`, scritti da
`documentalista-agent`, che aggiorna anche `sviluppo/TODO.md` a ogni fine giro.

## Fasi e giri
Ogni giro segue il protocollo globale: brief → implementer → review → checker → adjudica →
(live-testing se tocca la UI) → registro → commit → `/usage` → `/clear`.
Gate di progetto: `npm run build`, `npm test`, `npm run lint`, `npm run format:check`.

**Fase 0 — Fondamenta**
- 0.1 `git init`; workspaces; TS strict; ESLint (con il confine di `dominio`); Prettier; Vitest; script dei gate; installazione di better-sqlite3 verificata.
- 0.2 Server: Fastify, `CONTICINI_DATA_DIR`, apertura DB, runner delle migrazioni, tabella `meta`, `/api/salute`, bind su localhost e controllo `Host`, istanza singola, heartbeat.
- 0.3 Web: Vite con proxy in sviluppo, layout provvisorio con navigazione alle pagine vuote; build servita da Fastify.

**Fase 1 — Dominio puro** (solo `packages/dominio`, test fitti)
- 1.1 Soldi (parse/format it-IT), date (fuso locale, somma di mesi con clamp), UUIDv5, ricorrenze (generazione delle occorrenze in un intervallo, periodo nominale).
- 1.2 Saldo a D, ciclo che contiene D, formula di previsione con tutti i casi del requisito. **Test di accettazione obbligatori**:
  - un trasferimento non cambia il totale;
  - pagare una fissa all'importo e alla data previsti non cambia la proiezione;
  - una fissa pagata dopo D resta un impegno ricostruito a D;
  - una manuale scaduta e non confermata conta;
  - uno sforamento di budget dà residuo 0;
  - con E mancante o superata non c'è alcun numero;
  - una D prima del primo stipendio non ha previsioni.
- 1.3 Normalizzazione del testo, motore delle regole con precedenza, ranking dell'autocompletamento, validazioni (trasferimento, vincolo previsione/fissa, tipo della categoria rispetto al segno).

**Fase 2 — Persistenza e API**
- 2.1 Schema completo con migrazione 001, colonne di sincronizzazione, `change_log` transazionale, adattatori dei repository, test su DB temporaneo.
- 2.2 API di conti, settori e categorie (con creazione al volo), movimenti, trasferimenti atomici.
- 2.3 API di stipendi e cicli, spese fisse, occorrenze (conferma, salto, collegamento), catch-up idempotente all'avvio e al cambio di giorno.
- 2.4 Previsioni (default e override), `GET /api/prospetto?data=D`, API di regole e suggerimenti (autocompletamento + categoria proposta).

**Fase 3 — UI provvisoria funzionale** (ogni giro si chiude con `live-testing`)
- 3.1 Conti e trasferimenti; Settori, categorie e regole.
- 3.2 Movimenti: inserimento rapido (autocompletamento, categoria proposta, categoria al volo), elenco filtrabile, modifica e cancellazione.
- 3.3 Stipendio (registrazione, data e importo previsti); Spese fisse (configurazione auto/manuale); In attesa (conferma con correzione, salto, collegamento).
- 3.4 Previsioni per ciclo; **Prospetto** con selettore di data, saldi per conto, fisse rimanenti, tabella previsto/speso/residuo/sforamento, saldo previsto e "dopo l'accredito".

**Fase 4 — Grafici, backup, rilascio**
- 4.1 Grafici: torta per settore nel ciclo, andamento del saldo, previsto vs speso.
- 4.2 Backup con l'API di backup di better-sqlite3 (mai copia del `.db` aperto) nella cartella scelta, stato dell'ultimo backup, **ripristino provato**; export CSV ed export JSON completo.
- 4.3 Build di rilascio in `app/` (bundle del server + dipendenza nativa + statici web); launcher `Conticini.vbs` (senza console: riusa l'istanza o avvia il server, attende `/api/salute`, apre `msedge --app`); collegamento sul desktop con icona; procedura di aggiornamento che non tocca `app/dati/`.

**Fase 5 — Restyling con Claude Design**
Il `PIANO.md` della fase contiene il brief delle schermate (quelle della fase 3 con i loro contenuti)
da usare su claude.ai/design. L'utente disegna ed esporta; i giri si definiscono quando il design
esiste, adattando solo `packages/web`.

**Fase 6 — Debiti e crediti** (pianificata il 20/09/2026, dettaglio in `fasi/fase-6-debiti-crediti/PIANO.md`)
Pagina per i soldi prestati e presi in prestito, volutamente minima. Il residuo si deriva dai
movimenti collegati e non è un campo; saldare crea il movimento sul conto scelto nella stessa
transazione; due categorie tecniche riservate tengono i saldamenti dentro i saldi e fuori dai
consumi. Il Prospetto e la formula di previsione **non si toccano**: il totale netto vive solo
nella pagina nuova.
- 6.1 Modello, dominio e API.
- 6.2 Pagina Debiti e crediti.

**Fase 7 — Mobile e sincronizzazione** (pianificata il 20/09/2026, dettaglio in `fasi/fase-7-mobile-sync/PIANO.md`)
Web app distribuita da un'origine statica (Cloudflare Pages, repository privato), senza backend;
sul telefono si inserisce e si consulta, senza uso offline e senza database nel browser; stato
ricostruito in memoria da uno snapshot e da pacchetti immutabili su Google Drive
(`appDataFolder`, scope `drive.appdata`); PC archivio autorevole; conflitti espliciti.
- 7.1 Protocollo, snapshot, applicazione dei pacchetti (senza rete).
- 7.2 Trasporto Google Drive sul PC.
- 7.3 App mobile in lettura.
- 7.4 App mobile in scrittura.
- 7.5 In attesa, conflitti, chiusura.

## CLAUDE.md di progetto (contenuti)
- layer e confini (tabella sopra);
- comandi dei gate;
- invarianti di dominio (centesimi con segno, trasferimenti a 2 gambe, formula, UUIDv5 delle occorrenze, tombstone e `change_log`, nessun DELETE fisico);
- `CONTICINI_DATA_DIR` e divieto di toccare `app/dati/` fuori dal launcher;
- commit su `main`, uno per giro, seguito da push su origin;
- per il collaudo: l'app non ha login, quindi nessun account di collaudo. `live-testing` usa l'istanza di sviluppo avviata dall'orchestratore con `.dati-dev`, e gli URL si ricavano dalla configurazione di Vite e del server;
- rimando ai documenti di ripartenza: `TODO.md`, poi l'ultimo giro chiuso.

## Cosa faccio dopo l'approvazione (ancora in questa sessione, poi mi fermo)
1. Creo le cartelle e faccio `git init` in `sviluppo/` (branch `main`); `.gitignore` con `node_modules`, `dist`, `.dati-dev`.
2. Scrivo io, come parte del piano di progetto (eccezione 4 del contratto e richiesta esplicita dell'utente): `PIANO.md`, `CLAUDE.md`, `TODO.md`, `fasi/README.md` e i `PIANO.md` di ogni fase, con i criteri di accettazione dei giri.
3. Primo commit. Nessun `/usage`: la pianificazione non è un giro.
4. Mi fermo. L'utente esegue `/clear`, passa a **Sonnet 5 `high`** e apre il giro 0.1 dicendo "leggi `sviluppo/TODO.md` ed esegui il prossimo giro".

## Verifica
- A fine pianificazione: `git -C sviluppo log --oneline` mostra 1 commit; l'albero corrisponde alla struttura sopra.
- Nei giri: gate verdi; test di accettazione della 1.2; `live-testing` su ogni pagina della fase 3 (inserire uno stipendio, due fisse di cui una manuale, una previsione, alcune spese, un trasferimento; controllare il prospetto a oggi e a una data passata contro un calcolo fatto a mano); alla 4.2 prova di ripristino del backup; alla 4.3 avvio dall'icona con finestra dedicata e dati in `app/dati/`.
