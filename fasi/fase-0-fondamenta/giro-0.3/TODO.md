# Fase 0, giro 0.3 — Web
Chiuso il 17/09/2026 · commit 5e97bce..14a066b

## Fatto
- [x] Creato lo scaffold Vite del workspace web, con configurazione TypeScript, proxy di sviluppo, lint sui file `.tsx` e rimozione dei placeholder del giro 0.1.
- [x] Aggiunto il serving degli asset web nel server Fastify, con fallback SPA, esclusione di `/api` e fallback API-only quando la build web non è disponibile o è incompleta.
- [x] Creati entry point, routing a 10 rotte, layout con menu laterale e heartbeat periodico verso `POST /api/heartbeat`, con i relativi test.
- [x] Create le 10 pagine iniziali, ciascuna con il titolo della voce di menu.
- [x] Riverificate le correzioni agli import e alla gestione della build web incompleta con test e build verdi.

## Misurato
- `git diff --shortstat 5e97bce..14a066b` → `27 files changed, 706 insertions(+), 18 deletions(-)`.
- `git diff --shortstat 5e97bce..14a066b -- . ':!package-lock.json'` → `26 files changed, 317 insertions(+), 17 deletions(-)`.
- `npm run build` → verde, nessun errore TypeScript sui 4 pacchetti.
- `npm test` → verde: 13 file di test, 39 test, tutti superati.
- `npm run lint` → verde, nessun problema.
- `npm run format:check` → verde, tutti i file rispettano lo stile Prettier.
- Collaudo in browser → 7/7 scenari passati; console senza errori e nessuna richiesta di rete fallita.

## Scostamenti dal brief
Nessuno scostamento funzionale. Il giro è stato chiuso con due commit invece di uno solo, contro la convenzione del progetto, per evitare `git commit --amend`, vietato dal protocollo della sessione salvo richiesta esplicita. `14a066b` contiene il codice; il registro e l'aggiornamento di `TODO.md` entrano in un secondo commit successivo.

## Resta aperto
Prossimo giro: 1.1 — Fase 1, Dominio puro: Soldi, date, UUIDv5, ricorrenze, come da `fasi/fase-1-dominio/PIANO.md`. Nessun rilievo fondato ma fuori scope, nessuna domanda in attesa e nessun debito accettato.
