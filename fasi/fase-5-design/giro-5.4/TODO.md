# Fase 5, giro 5.4 — Spese fisse, In attesa

Chiuso il 20/09/2026 · commit 93b1438c03a750409fea2d4f1e3a7b0ce610a692..<commit di questo giro>

## Fatto

- [x] Restilizzata la pagina Spese fisse con elenco a righe, layout a due colonne e form sempre visibile in una `Scheda`.
- [x] Integrati `Dialogo`, `ControlloSegmentato`, badge di modalità e calcolo client-side della prossima scadenza tramite `occorrenzeTra`, senza modifiche a hook, API o dominio.
- [x] Unificate in una lista ordinata le sezioni Scadute e Prossime di In attesa, con card e stato cromatico in base allo scarto dalla data odierna.
- [x] Sostituita la conferma inline di Salta con `Dialogo`, mantenendo inline i pannelli Conferma e Collega a un movimento esistente.
- [x] Corretti i tre rilievi fondati di review: errore `regola` duplicato nei campi di Spese fisse; chiusura del dialogo Salta solo dopo successo; rimozione della chiusura indebita del pannello Collega.

## Misurato

- `git diff --stat` sui 4 file del giro → 4 file cambiati, 595 inserimenti(+), 411 cancellazioni(-).
- `npm run build` (dalla radice) → verde su contratti, dominio, server e web.
- `npm test` (dalla radice) → verde, 338 test totali su 47 file di test: contratti 7/1, dominio 121/11, server 205/33, web 5/2.
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → fallisce solo su `AGENTS.md`, pendenza preesistente non toccata in questo giro.
- Collaudo Chrome su `http://localhost:5173/`, server `127.0.0.1:47300`, dati `.dati-dev`, in tema chiaro e scuro → verde; 11 scenari su 12 verificati, nessun difetto bloccante, errore di console o richiesta di rete fallita.

## Scostamenti dal brief

- L'unità Spese fisse è andata in timeout dopo 1800s senza report strutturato, ma aveva scritto correttamente su disco; l'orchestratore ha verificato i file e rilanciato i gate prima della review.
- L'unità In attesa è terminata regolarmente; una build intermedia è fallita per la scrittura concorrente dell'altra unità nella working directory condivisa, poi la verifica finale è risultata verde.
- Prima del collaudo sono stati eliminati 3 `node.exe` orfani sulle porte 47300, 5173 e 5174; l'istanza pulita è stata poi avviata e fermata a fine ciclo.
- Il rilievo di conformity su Modalità e Attiva fuori da `Campo` è stato scartato come infondato: la scelta era esplicita nel brief e coerente con il pattern esistente.

## Resta aperto

- Prossimo giro: 5.5 — Previsioni, Grafici, Backup, da `fasi/fase-5-design/PIANO.md`; chiusura della Fase 5 con `live-testing` sulle tre pagine in tema chiaro e scuro.
- La pendenza preesistente su `AGENTS.md` (file non tracciato alla radice) resta invariata.
- Da valutare in un giro futuro: il punto nel campo Importo interpretato come separatore delle migliaia; comportamento preesistente di `parseImporto`, non introdotto qui.
- Il fallimento di rete di Salta non è stato indotto in browser per mancanza di intercettazione; la correzione è stata verificata dal checker a livello di codice.
- Non è stato osservato lo stato vuoto di In attesa; `.dati-dev` contiene inoltre la modifica permanente dell'occorrenza Netflix del 10/09/2026, marcata come saltata durante il collaudo.
- Nessun rilievo fondato resta fuori scope: i tre rilievi fondati sono stati corretti e riverificati.

