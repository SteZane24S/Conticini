# Fase 2 — Persistenza e API, giro 2.2 — API conti, settori/categorie, movimenti, trasferimenti
Chiuso il 18/09/2026 · Intervallo di commit: non ancora disponibile, il commit segue questo registro (HEAD di partenza: ed1e88b)

## Fatto
- [x] U0: aggiunto il modulo unico di formattazione degli errori API, con `ErroreApi`, factory e gestore Fastify.
- [x] U1: aggiunti gli schemi Zod per errori, conti, settori, categorie, movimenti, trasferimenti e helper comuni.
- [x] U2: implementati repository e rotte API per i conti, con validazioni, aggiornamenti e tombstone verificati dai test.
- [x] U3: implementati repository e rotte API per i settori, inclusa la gestione dei duplicati e dei tombstone.
- [x] U4: implementati repository e rotte API per le categorie, inclusa la creazione al volo del settore e la transazione associata.
- [x] U5: implementati repository e rotte API per i movimenti, con validazioni di dominio, filtri e paginazione.
- [x] U6: implementati repository e rotte API per i trasferimenti, con due gambe atomiche e aggiornamento per gruppo.
- [x] U7: completato il wiring delle rotte nel server e uniformato il fallback 404 delle API.

## Misurato
- `npm run build --workspaces --if-present`: superato (tutti e quattro i pacchetti).
- `npm test --workspaces --if-present`: 7/7 contratti, 113/113 dominio, 125/125 server su 16 file, 1/1 web.
- `npm run lint`: superato.
- `npm run format:check`: fallisce solo su `AGENTS.md`, pendenza preesistente invariata.
- `git diff --cached --shortstat` (contro HEAD ed1e88b, prima del commit di questo giro): 38 file cambiati, 4588 inserimenti, 16 rimozioni.
- Nessun collaudo in Chrome: il giro non tocca l’interfaccia web (`packages/web`), solo `packages/server` e `packages/contratti`.

## Scostamenti dal brief
Sono state necessarie tre correzioni infrastrutturali: metadati `main`/`types`/`exports` per i pacchetti `dominio` e `contratti`, emissione delle dichiarazioni TypeScript e pattern globali corretti per ignorare `dist` in ESLint; il problema era latente perché nessun pacchetto aveva mai importato prima tipi da un altro con uno specificatore di pacchetto.
Durante le review sono stati trovati e corretti bug reali in aggiornamento settori, categorie, movimenti, trasferimenti e wiring 404, oltre alle lacune di test rilevate; movimenti e trasferimenti hanno richiesto una seconda correzione dopo che il primo fix aveva fatto emergere un problema diverso alla rilettura del codice.
L’aggiornamento dei trasferimenti resta `PUT` invece di `PATCH`: è deliberato e prescritto esplicitamente da `PIANO.md`.

## Resta aperto
Non è stato aggiunto il test di rollback del secondo insert in `creaCategoriaConSettoreEventuale`: limite noto, accettato consapevolmente per non introdurre un test fragile basato su mock.
Il file `AGENTS.md` non tracciato resta una pendenza preesistente invariata. Il prossimo giro riparte da `fasi/fase-2-persistenza-api/PIANO.md`, giro 2.3.
