# Fase 3, giro 3.3 — Stipendio, spese fisse, in attesa
Chiuso il 18/09/2026 · commit successivo a questo registro (precedente: e6092f0)

## Fatto
- [x] Nuova pagina `packages/web/src/pages/Stipendio.tsx` con registrazione dello stipendio, storico dei cicli e modifica della previsione del ciclo aperto
- [x] Nuovi hook e stili in `packages/web/src/pages/stipendio/{dati.ts,stili.ts}` con riuso di `useConti` e `useAlbero`
- [x] Nuova pagina `packages/web/src/pages/SpeseFisse.tsx` con elenco, creazione, modifica, attivazione/disattivazione ed eliminazione delle spese fisse
- [x] Nuovi hook e stili in `packages/web/src/pages/spese-fisse/{dati.ts,stili.ts}` con regole di ricorrenza coerenti con lo schema zod
- [x] Nuova pagina `packages/web/src/pages/InAttesa.tsx` con sezioni Scadute/Prossime, conferma, salto e collegamento a un movimento esistente
- [x] Nuovi hook e stili in `packages/web/src/pages/in-attesa/{dati.ts,stili.ts}` con ricerca dei candidati, arricchimento delle occorrenze e contatore pending
- [x] Aggiunto il contatore delle occorrenze pending in `packages/web/src/layout/Layout.tsx`
- [x] Corretti gli stati stantii nei form di Stipendio e Spese fisse con `key` legate all'entità modificata e propagati gli errori di caricamento di conti e categorie
- [x] Spostata la ricerca dei candidati di collegamento da `InAttesa.tsx` a `in-attesa/dati.ts`; aggiunte guardie di staleness e deduplicazione delle risposte concorrenti
- [x] Aggiornato immediatamente il contatore del menu dopo conferma, salto o collegamento riusciti tramite evento DOM globale

## Misurato
- File toccati (elenco fornito dall'orchestratore): `packages/web/src/pages/Stipendio.tsx`, `packages/web/src/pages/stipendio/{dati.ts,stili.ts}`, `packages/web/src/pages/SpeseFisse.tsx`, `packages/web/src/pages/spese-fisse/{dati.ts,stili.ts}`, `packages/web/src/pages/InAttesa.tsx`, `packages/web/src/pages/in-attesa/{dati.ts,stili.ts}`, `packages/web/src/layout/Layout.tsx`
- `npm run build` → verde, 244 moduli trasformati
- `npm test` → 303 test passati su 42 file: 7 contratti, 116 dominio, 175 server, 5 web
- `npm run lint` → verde, nessun errore
- `npm run format:check` → pulito sui file toccati dal giro; unico avviso residuo su `AGENTS.md`, pendenza preesistente non tracciata e non toccata
- `live-testing` in Chrome → prima passata verde per Stipendio e Spese fisse; seconda passata verde per Scadute/Prossime, Salta, Conferma e Collegamento; terza passata verde per l'aggiornamento immediato del contatore dopo Salta e Conferma

## Scostamenti dal brief
- Nessuno scostamento strutturale.
- Il collaudo della pagina In attesa ha richiesto il riavvio del solo processo server per attivare il catch-up delle occorrenze retroattive: il catch-up preesistente non parte alla creazione runtime di una spesa fissa. Nessun file server è stato modificato.
- Tutti gli otto rilievi di review e il difetto trovato dal collaudo sono stati corretti e riverificati.
- La conformity dell'Unità 3 e la correzione dell'Unità 3 dopo l'esaurimento della quota Codex sono passate in ricaduta su Sonnet (`Explore`/`general-purpose`).

## Resta aperto
- Il catch-up delle occorrenze fisse non si attiva alla creazione o modifica runtime di una spesa fissa con date retroattive: parte solo all'avvio del server o al cambio di giorno via heartbeat. Da valutare in un giro futuro che tocchi di nuovo `packages/server`.
- La pool Codex si è esaurita due volte durante il giro; le ricadute su Sonnet vanno tenute presenti nel confronto dei pesi fra giri nel registro dei consumi.
- La pendenza preesistente su `AGENTS.md` resta invariata: file non tracciato alla radice, decisione dell'utente se tenerlo, cancellarlo o ignorarlo.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 3.3.
- Prossimo giro: 3.4 — Previsioni; prospetto, da `fasi/fase-3-ui-provvisoria/PIANO.md`, con lo scenario di accettazione completo e `live-testing`.
