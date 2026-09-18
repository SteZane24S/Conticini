# Fase 2 — Persistenza e API, giro 2.3 — Stipendi/cicli, spese fisse, catch-up, occorrenze
Chiuso il 18/09/2026 · Intervallo di commit: non ancora disponibile, il commit segue questo registro (HEAD di partenza: 98abd0b)

## Fatto
- [x] U1: implementate le API per la creazione atomica di stipendio e ciclo e per l'aggiornamento dei cicli, con i relativi contratti.
- [x] U2: implementato il CRUD delle spese fisse, con vincolo sulle categorie con previsione e propagazione alle sole occorrenze pending.
- [x] U3: implementato il catch-up atomico e idempotente delle spese fisse fino a 400 giorni, con creazione dei movimenti automatici scaduti.
- [x] U4: implementate le API per elenco, conferma, salto e collegamento delle occorrenze già materializzate.
- [x] U5: completato il wiring dei contratti, delle rotte e del catch-up all'avvio e al cambio di giorno rilevato dall'heartbeat.

## Misurato
- `git diff --cached --shortstat` (contro HEAD 98abd0b, prima del commit di questo giro): 26 file cambiati, 2763 inserimenti, 1 rimozione.
- `npm run build --workspaces --if-present`: superato (tutti e quattro i pacchetti: contratti, dominio, server, web).
- `npm test --workspaces --if-present`: 7/7 contratti, 116/116 dominio, 155/155 server su 25 file, 1/1 web.
- `npm run lint`: superato.
- `npm run format:check`: fallisce solo su `AGENTS.md`, pendenza preesistente invariata (non introdotta da questo giro).
- Nessun collaudo in Chrome: il giro non tocca l'interfaccia web (`packages/web`), solo `packages/server`, `packages/contratti` e `packages/dominio`.

## Scostamenti dal brief
- U5: il tipo della variabile che traccia l'ultimo giorno di catch-up è `DataISO | undefined` invece di `string | undefined`, perché `eseguiCatchUp` richiede il tipo branded `DataISO`; la correzione è necessaria per la compilazione e non cambia il comportamento.
- Nessun altro scostamento nelle unità U1-U4: implementate esattamente come da brief.

## Resta aperto
- Debito accettato: nella cascata di aggiornamento delle spese fisse (U2), i test verificano la propagazione di `amountCents` alle occorrenze pending ma non esplicitamente di `contoId`/`categoriaId`/`mode` (verificati manualmente come corretti dal bug-hunter, ma senza asserzione automatica).
- Il file `AGENTS.md` non tracciato resta una pendenza preesistente invariata (comparsa in un giro precedente, non richiesta da alcun brief).
- Il prossimo giro è il 2.4 — API previsioni, prospetto, regole e suggerimenti; riparte da `fasi/fase-2-persistenza-api/PIANO.md`.
