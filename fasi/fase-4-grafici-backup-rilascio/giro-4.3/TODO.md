# Fase 4, giro 4.3 — Rilascio in `app/`

Chiuso il 20/09/2026 · commit successivo a questo registro (precedente: 2a9138bf779bb79cc12ffcb5c5b5d293e254a68b)

## Fatto

- [x] Creato lo script `npm run release`, con build dei workspace, bundle ESM del server, migrazioni, dipendenze native minime, web dist, icona segnaposto e launcher in `Conticini/app/programma/`.
- [x] Creato il launcher Windows senza console, con controllo del server già attivo, verifica di Node ≥24, avvio con `CONTICINI_DATA_DIR=app\\dati`, attesa della salute e apertura in modalità app.
- [x] Aggiunto il flag `--collegamento` per creare il collegamento sul Desktop reale dell’utente con percorso, icona e directory di lavoro corretti.
- [x] Corretto il bundle ESM con un banner `createRequire`, sostituito il controllo di salute del launcher con `WinHttp.WinHttpRequest.5.1` e corretto il controllo VBScript senza short-circuit.
- [x] Verificato il rilascio dall’icona, il riuso dell’istanza già aperta, lo spegnimento per inattività e la creazione del collegamento sul Desktop.

## Misurato

- `git diff --cached --shortstat` → 4 file cambiati, 342 inserimenti, 1 cancellazione.
- `npm run build` → verde su tutti e quattro i pacchetti (dominio, contratti, server, web).
- `npm test` → verde; 338 test su 47 file: contratti 7/1, dominio 121/11, server 205/33, web 5/2.
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → pulito sui file toccati; unico avviso residuo su `AGENTS.md`, pendenza preesistente non toccata.
- Icona generata → 4286 byte esatti; formato ICO 32×32 32bpp, calcolato e verificato byte per byte.

## Scostamenti dal brief

Nessuno strutturale. Le tre correzioni emerse durante il collaudo reale riguardavano difetti specifici dell’ambiente Windows e non erano prevedibili dal brief iniziale.

## Resta aperto

- L’icona `Conticini.ico` è un segnaposto a colore pieno: il design vero arriverà con la Fase 5 e andrà rigenerato allora.
- La pendenza preesistente su `AGENTS.md` resta invariata.
- Nessun rilievo fondato è rimasto fuori scope; l’unico rilievo sull’ordinamento di `package.json` è stato corretto e riverificato.
- La Fase 4 è chiusa con questo giro. Prossimo passo: Fase 5 — Restyling con Claude Design, dopo il design prodotto dall’utente secondo `fasi/fase-5-design/PIANO.md`.
