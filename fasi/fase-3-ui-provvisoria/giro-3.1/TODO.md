# Fase 3, giro 3.1 — UI provvisoria: conti e trasferimenti, categorie e regole
Chiuso il 18/09/2026 · commit d516688..154febe

## Fatto
- [x] Aggiunto `GET /api/trasferimenti` (elenco di tutti i trasferimenti) in `packages/contratti/src/trasferimenti.ts`, `packages/server/src/repositories/trasferimenti.ts`, `packages/server/src/routes/trasferimenti.ts`
- [x] Nuovo client HTTP condiviso `packages/web/src/api.ts` (`apiGet`, `apiInvia`, `ErroreApi`), usato da tutte le pagine del giro
- [x] Pagina Conti (`packages/web/src/pages/Conti.tsx` + `pages/conti/`): elenco con saldo attuale calcolato lato client, creazione/modifica/archiviazione conti, form e gestione trasferimenti
- [x] Pagina Categorie e regole (`packages/web/src/pages/CategorieRegole.tsx` + `pages/categorie-regole/`): albero settore/categoria con creazione/rinomina/cancellazione logica, regole di categorizzazione con priorità, attiva/disattiva e anteprima
- [x] Vincolo di dominio lato server: un settore con categorie attive non può essere eliminato (`RepositorioSettori.elimina`, nuovo errore `erroreSettoreConCategorie` in `packages/server/src/errori.ts`, 409)
- [x] Fix `ErroreApi`: `richiedi()` non lancia più `SyntaxError` grezza su corpo vuoto (legge con `text()` e fa `JSON.parse` in try/catch)
- [x] Fix bug trovato solo dal collaudo in browser: ogni `DELETE` rispondeva 500 perché il client mandava `Content-Type: application/json` anche senza corpo; ora l'header parte solo se `opzioni?.body !== undefined`
- [x] `useTrasferimenti` accetta un callback `onMutato`, collegato al `ricarica` di `useConti`, per aggiornare il saldo dopo ogni mutazione di trasferimento
- [x] Estratti componenti/costanti condivisi fra le due pagine: `rispostaOkSchema` in `api.ts`, `ConfermaInline.tsx`, `STILE_*` in `pages/categorie-regole/stili.ts`
- [x] Rinominati i gestori di evento di U3 da `handleX` a `gestisciX`, per coerenza con la nomenclatura italiana del resto del progetto

## Misurato
- `npm run build` (radice) → verde, nessun errore, eseguito due volte
- `npm test` (radice) → 303 test passati (7 contratti, 116 dominio, 175 server, 5 web), 0 falliti, eseguito due volte
- `npm run lint` (radice) → pulito, nessun errore né warning
- `npm run format:check` (radice) → pulito sui file del giro (un warning residuo su `AGENTS.md`, file non tracciato preesistente non toccato da questo giro)
- `git diff --cached --shortstat` (prima del commit) → 19 file, 2578 inserzioni, 3 cancellazioni
- `live-testing`, primo giro → 20/22 scenari eseguiti, 6 difetti ricondotti a 2 cause reali
- `live-testing`, secondo giro (dopo il fix del `Content-Type`) → 9/9 scenari verdi, nessun difetto bloccante

## Scostamenti dal brief
- Il controllo "settore con categorie attive" è stato implementato lato server (repository + nuovo errore di dominio, 409) invece che solo lato UI come proposto dal `bug-hunter`: decisione dell'orchestratore per garantire l'integrità dei dati anche fuori dalla UI.
- Tutte le unità sono girate in ricaduta su Sonnet (general-purpose per l'implementazione, Explore per la conformità) perché la pool Codex non era disponibile in questo giro; `bug-hunter`, `checker` e `live-testing` sono girati su Sonnet come da protocollo.

## Resta aperto
- Query N+1 in `elencaTrasferimenti` (`packages/server/src/repositories/trasferimenti.ts`): debito accettato, trascurabile per il volume dati di un'app personale.
- UUID tecnico in coda al messaggio del vincolo "settore con categorie attive" (`packages/server/src/errori.ts`, `erroreSettoreConCategorie`): cosmetico.
- Messaggio d'errore del form trasferimento non si pulisce automaticamente correggendo un campo prima di ri-sottomettere (`packages/web/src/pages/Conti.tsx`, `TrasferimentoForm`): debito di UX minore.
- Cast `as DataISO` sulle date dell'API in `conti/dati.ts`: rilievo di conformity scartato dopo verifica diretta, perché lo stesso pattern è usato in 42 punti di `packages/server/src` — è la convenzione del progetto, non una violazione.
