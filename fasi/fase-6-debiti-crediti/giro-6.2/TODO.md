# Fase 6, giro 6.2 — Pagina Debiti e crediti

Chiuso il 25/09/2026 · commit d5ca33c..<commit di questo giro>

## Fatto

- [x] Aggiunta la pagina Debiti e crediti con rotta e voce di menu, totale netto, creazione e suddivisione di debiti e crediti.
- [x] Aggiunti saldamenti parziali o completi con conto, data, idempotenza, annullamento e gestione delle posizioni saldate.
- [x] Aggiunte eliminazione delle posizioni senza saldamenti, conferme disabilitate durante l'invio e protezione dalle risposte fuori ordine.
- [x] Corretti i rilievi fondati di conformity e bug-hunter; nessun rilievo è rimasto scartato o fuori scope.

## Misurato

- `git diff --shortstat` con i file nuovi registrati via `git add -N` → 5 file cambiati, 978 inserimenti(+).
- `npm run build` → exit 0.
- `npm test` → exit 0: contratti 1/8, dominio 12/133, server 36/225, web 2/5; 51 file e 371 test.
- `npm run lint` → exit 0.
- `npx prettier --check` sui 5 file toccati → All matched files use Prettier code style!
- Collaudo Chrome live-testing → 9 scenari su 9, nessun errore di console e nessuna richiesta fallita.

## Scostamenti dal brief

- Aggiunta l'azione Elimina, perché l'API 6.1 esisteva già e senza di essa una posizione errata non era rimovibile; il server rifiuta comunque posizioni con saldamenti.
- `npm run format:check` non è stato eseguito: il comando fallisce per il solo `AGENTS.md` non tracciato, pendenza preesistente.

## Resta aperto

- Il rilascio in `app/programma` va rifatto alla chiusura della fase 6; non è stato eseguito in questo giro, in attesa della decisione dell'utente.
- Il selettore del conto nei saldamenti è temporaneo e sarà rimosso dalla fase 7 (giri 7.2 e 7.4).
