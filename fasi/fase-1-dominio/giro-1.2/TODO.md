# Giro 1.2 — Dominio puro

## Fatto

Implementate in `packages/dominio` le funzioni per:

- il saldo a una data;
- il ciclo stipendio→stipendio;
- il prospetto di previsione.

Il lavoro segue il piano congelato del giro 1.2 e i relativi requisiti congelati.

## File toccati

Diff completo: 7 file, 768 righe inserite e 0 rimosse; nessuna riga esistente modificata, salvo 3 righe di export aggiunte a `index.ts`.

- `packages/dominio/src/saldi.ts` — nuovo, 52 righe.
- `packages/dominio/src/saldi.test.ts` — nuovo, 36 righe.
- `packages/dominio/src/cicli.ts` — nuovo, 24 righe.
- `packages/dominio/src/cicli.test.ts` — nuovo, 33 righe.
- `packages/dominio/src/prospetto.ts` — nuovo, 177 righe.
- `packages/dominio/src/prospetto.test.ts` — nuovo, 443 righe.
- `packages/dominio/src/index.ts` — export aggiunti, +3 righe.

## Verifiche

- Test obbligatori del giro — comando: `npm.cmd test --workspace @conticini/dominio -- src/saldi.test.ts src/cicli.test.ts src/prospetto.test.ts` — 15 test superati.
- Build — comando: `npm.cmd run build` — superata.
- Suite completa del monorepo — comando: `npm.cmd test` — 179 test superati.
- Lint — comando: `npm.cmd run lint` — superato.
- Formattazione — comando: `npm.cmd run format:check` — superata.

Su questa macchina i comandi npm vanno eseguiti con `npm.cmd`, perché PowerShell blocca `npm.ps1` per la execution policy.

## Review

- `bug-hunter`: RILIEVI: 0.
- `conformity`: RILIEVI: 0.

Poiché entrambi i revisori hanno restituito zero rilievi, l'istruttoria del `checker` è stata saltata secondo il protocollo. Non sono state necessarie correzioni dopo la prima implementazione.

Non è stato eseguito `live-testing`: il diff riguarda esclusivamente calcoli puri in `packages/dominio` e non tocca l'interfaccia.

## Stato e prossimo giro

Nessuna pendenza aperta, nessun rilievo fondato fuori scope, nessuna domanda in attesa e nessun debito accettato.

Prossimo giro: 1.3 — Normalizzazione, regole di categoria, ranking autocompletamento, validazioni.

Non esiste ancora un intervallo di commit: il commit di questo giro segue il registro.
