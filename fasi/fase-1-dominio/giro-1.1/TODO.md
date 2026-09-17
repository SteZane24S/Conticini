# Fase 1, giro 1.1 — Dominio: soldi, date, identità, ricorrenze
Chiuso il 17/09/2026 · commit ca4f4be..cd12f0c

## Fatto
- [x] `soldi.ts`: `parseImporto`/`formatImporto`/`somma` su interi in centesimi con segno; formato it-IT (punto migliaia, virgola decimale) e formato a punto decimale; limite applicativo `LIMITE_IMPORTO_CENTS` e controllo overflow su `Number.isSafeInteger`.
- [x] `date.ts`: tipo brandizzato `DataISO`, validazione calendariale reale (bisestili inclusi), `confrontaDate`, `oggiLocale` con `now` iniettato, `ultimoGiornoDelMese`, `aggiungiMesi` con clamp all'ultimo giorno del mese; helper condivisi `annoDi`/`meseDi`/`costruisciData` aggiunti in review.
- [x] `identita.ts`: SHA-1 e `uuidv5` in TypeScript puro, senza dipendenze da `node:crypto` o `crypto.subtle`, verificati contro vettori RFC 9562/4122 noti e la costante di progetto `NAMESPACE_CONTICINI`.
- [x] `ricorrenze.ts`: regole `monthly`/`everyNMonths`/`yearly` e `occorrenzeTra` per generare le occorrenze in un intervallo, con periodo nominale e filtro sui confini reali delle date.
- [x] Riscritto il barrel `packages/dominio/src/index.ts` per ri-esportare i quattro moduli; rimosso il placeholder del giro 0.1 (`index.test.ts` incluso).
- [x] Corretti in review il loop infinito per `every_n_months` con `n` negativo e il caso `n = 0`, rimosso un cast ridondante in `parseDataISO` e consolidati in `date.ts` gli helper di estrazione/costruzione delle date duplicati in `ricorrenze.ts`.

## Misurato
`git diff --shortstat ca4f4be..cd12f0c` → `10 files changed, 764 insertions(+), 10 deletions(-)`.
`npm run build` (dalla radice) → verde, nessun errore TypeScript sui 4 pacchetti.
`npm run test -w packages/dominio` → verde: 8 file di test, 112 test, tutti superati.
`npm test` (dalla radice, tutti i pacchetti) → verde: dominio 112 test, server 34 test, web 1 test.
`npm run lint` (dalla radice) → verde, nessun problema.
`npm run format:check` (dalla radice) → verde, tutti i file rispettano lo stile Prettier.
Nessun collaudo in browser: il giro non tocca l'interfaccia (dominio puro, nessuna superficie visibile).

## Scostamenti dal brief
Nessuno scostamento funzionale; le uniche differenze rispetto ai brief iniziali sono le correzioni emerse in review, già descritte in “Fatto”. Il giro ha richiesto due commit di codice invece di uno solo: il primo (`47bcc83`) è stato creato senza rifare `git add` dopo il fix di review e non conteneva la correzione; il secondo (`cd12f0c`) applica il fix mancante. Nessun impatto funzionale: il codice finale è quello già descritto in “Fatto”.

## Resta aperto
Niente. Prossimo giro: 1.2 — Fase 1, Saldi/cicli/prospetto, come da `fasi/fase-1-dominio/PIANO.md`. Nessun rilievo fondato ma fuori scope, nessuna domanda in attesa dell'utente, nessun debito accettato.
