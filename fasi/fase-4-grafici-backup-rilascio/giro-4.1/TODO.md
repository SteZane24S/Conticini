# Fase 4, giro 4.1 — Grafici

Chiuso il 19/09/2026 · commit successivo a questo registro (precedente: 45d37a5800eb35c8b741abb5507259ed6132cb59)

## Fatto

- Nuovo modulo `packages/dominio/src/aggregazioni.ts` (+ `aggregazioni.test.ts`): funzioni pure `intervalloCiclo`, `speseSettoreCategoria`, `saldoGiornaliero`, `previstoSpesoPerCiclo`, per aggregare movimenti/budget senza toccare il database.
- Nuovo modulo `packages/contratti/src/grafici.ts`: schemi zod di richiesta/risposta per tre endpoint di aggregazione (spese per settore/categoria, saldo giornaliero, previsto/speso per ciclo).
- Nuove rotte `packages/server/src/routes/grafici.ts` (+ test) e wiring in `packages/server/src/app.ts`: `GET /api/grafici/spese-per-settore`, `GET /api/grafici/saldo-giornaliero`, `GET /api/grafici/previsto-speso`.
- Nuova pagina `packages/web/src/pages/Grafici.tsx` (+ `grafici/dati.ts`, `grafici/stili.ts`): selettore ciclo/periodo, torta spese per settore con drill-down alle categorie, linea del saldo giornaliero, barre previsto/speso (solo in modalità ciclo).
- Aggiunta la dipendenza `recharts` (^3.10.1) a `packages/web/package.json`, bundle locale via Vite, nessuna risorsa da CDN.

## Misurato

- `npm run build` → verde (build di tutti i pacchetti; bundle web 845,10 kB, gzip 240,13 kB)
- `npm test` → verde; dominio 121 test su 11 file, server 182 test su 30 file, web 5 test su 2 file (totale 308 test)
- `npm run lint` → verde, nessun errore
- `npm run format:check` → pulito su tutti i file toccati in questo giro; unico avviso residuo su `AGENTS.md` (pendenza preesistente non toccata in questo giro)

## Scostamenti dal brief

- Un refine zod in `richiestaSpesePerSettoreSchema` (validazione "esattamente uno tra cicloId e la coppia dataInizio/dataFine") non copriva le combinazioni parziali (es. cicloId insieme a una sola delle due date) e non validava l'ordine delle date: rilievo fondato di review, corretto riscrivendo la validazione in tre refine separati.
- Il collaudo in Chrome ha trovato un difetto cosmetico: il tooltip del grafico "Saldo giornaliero" mostrava il nome grezzo del campo (`saldoCents`) invece di un'etichetta leggibile, per l'assenza della prop `name` sul componente Line di Recharts. Corretto aggiungendo `name="Saldo"`.

## Resta aperto

- Nessun rilievo fondato rimasto fuori scope: i due rilievi fondati (unità dominio/contratti) sono stati corretti e riverificati; i tre rilievi di conformity sull'assenza di `ricarica` negli hook di `grafici/dati.ts` sono stati istruiti dal checker e giudicati infondati (la pagina Grafici è di sola lettura, senza mutazioni, e il remount di React Router al cambio rotta fornisce già dati freschi); il difetto del collaudo è stato corretto e non ripetuto in un nuovo giro di collaudo completo (fix di una riga, senza impatto logico, verificato con build).
- La pendenza preesistente su `AGENTS.md` (file non tracciato alla radice, decisione dell'utente se tenerlo, cancellarlo o ignorarlo) resta invariata: non è stata generata né modificata in questo giro.
- Prossimo giro: 4.2 — Backup, ripristino, export, da `fasi/fase-4-grafici-backup-rilascio/PIANO.md`.

## Cosa non toccare

- La logica di esclusione dei trasferimenti dalle aggregazioni (`transferGroupId === null`) è un requisito esplicito del piano di progetto, non un dettaglio implementativo: non va rimossa né resa opzionale in un giro futuro senza una decisione esplicita.

