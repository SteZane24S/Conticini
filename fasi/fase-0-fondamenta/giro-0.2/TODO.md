# Fase 0, giro 0.2 — Server
Chiuso il 17/09/2026 · commit 31402fe..aefed53

## Fatto
- [x] Implementato il livello dati: configurazione dell'ambiente, apertura SQLite, migrazioni, tabella `meta` e aggiornamento della versione dello schema.
- [x] Implementata l'app Fastify e l'entrypoint: salute, heartbeat, controllo dell'header `Host`, istanza singola, ascolto su localhost e spegnimento per inattività.
- [x] Aggiunti i test del server e lo script `dev` del workspace `packages/server`.

## Misurato
- `git diff --shortstat 31402fe..b28d4e9` → `12 files changed, 1062 insertions(+), 8 deletions(-)`.
- `git diff --shortstat 31402fe..b28d4e9 -- . ':!package-lock.json'` → `11 files changed, 531 insertions(+), 7 deletions(-)`.
- `npm test` → 4 workspace con test, 14 file di test, 36 test, tutti superati.
- `npm run build` → verde sui 4 pacchetti.
- `npm run lint` → verde.
- `npm run format:check` → verde.
- Verifica manuale → `/api/salute` 200, `/api/heartbeat` 200, `Host` estraneo 421, `Host` maiuscolo 200, seconda istanza rilevata e nessun processo residuo dopo l'arresto.

## Scostamenti dal brief
L'installazione delle dipendenze non è stata eseguita nel sandbox dell'implementer per `EACCES` verso il registry npm; è stata completata dall'orchestratore. Il test del JSON malformato usa il cast `as unknown as Response` richiesto da TypeScript strict. Nessun altro scostamento.

## Resta aperto
Solo la pendenza già nota: `npm run dev` dalla radice richiede ancora lo script `dev` di `packages/web`, previsto dal giro 0.3. Prossimo giro: 0.3 — Web.
