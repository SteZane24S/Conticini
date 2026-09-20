# Fase 5, giro 5.1 — Fondamenta: token, componenti condivisi, layout

Chiuso il 20/09/2026 · commit successivo a questo registro (precedente: 295fd4a047fa7f095973434b3ef6fe8d2b606a81)

## Fatto

- [x] Portati nel progetto i token Modernist, i token di dominio e il tema scuro; aggiunti i pesi locali di Archivo e la persistenza del tema.
- [x] Creati i componenti React condivisi per bottone, campo, etichetta, scheda, tabella, dialogo e controllo segmentato; aggiornato `ConfermaInline` senza cambiarne l’interfaccia pubblica.
- [x] Rifatto il layout con sidebar, dieci voci di navigazione, indicatore della voce attiva, badge di “In attesa” e selettore del tema.
- [x] Importato il materiale esportato da claude.ai/design come riferimento per i giri successivi.

## Misurato

- `git diff --cached --shortstat -- . ':!fasi/fase-5-design/design' ':!package-lock.json'` → 15 file cambiati, 918 inserimenti, 21 cancellazioni.
- `git diff --cached --shortstat -- fasi/fase-5-design/design` → 9 file cambiati, 3847 inserimenti.
- `npm run build` → verde su dominio, contratti, server e web; font Archivo incluso nel bundle, senza CDN.
- `npm test` → verde, 331 test totali: dominio 121/11 file, server 205/33 file, web 5/2 file.
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → fallisce solo su `AGENTS.md`, pendenza preesistente non toccata.
- Collaudo Chrome → 5/5 scenari verdi; nessun errore di console o richiesta di rete fallita.

## Scostamenti dal brief

- Nessuno strutturale. L’unità 3 è stata dispatchata dopo la review delle unità 1 e 2, come previsto per la dipendenza sui loro output.

## Resta aperto

- Il componente `Dialogo` è creato ma non ancora usato dalle pagine; sarà adottato nei giri 5.2–5.5 dove il design lo richiede.
- La pendenza preesistente su `AGENTS.md` resta invariata.
- Prossimo passo: giro 5.2 — Prospetto e Movimenti, con `live-testing`.

## Intervallo di commit

`295fd4a047fa7f095973434b3ef6fe8d2b606a81..<commit di questo giro>`
