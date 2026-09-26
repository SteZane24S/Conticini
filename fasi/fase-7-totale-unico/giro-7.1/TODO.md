# Fase 7, giro 7.1 — Dominio: saldo segnato, totale con àncore, scarto

Chiuso il 26/09/2026 · commit 30645da..<commit di questo giro>

## Fatto

- [x] Reso `Movimento.contoId` nullable e introdotti i tipi e i calcoli per saldi segnati, totale con àncore e scarto, inclusa la gestione dell'insieme C.
- [x] Aggiunte le validazioni per aperture successive all'ultima àncora, archiviazione a saldo segnato zero e date delle letture.
- [x] Aggiornato il prospetto per usare `totaleA` e restituire saldi segnati, origine, data della lettura, somma e scarto; aggiunte le interfacce repository per letture e àncore.
- [x] Aggiornati aggregazioni, export CSV e route del prospetto per il nuovo contratto; estesi i test con gli esempi del piano e il caso della fissa pagata in ritardo già assorbita da un'àncora.

## Misurato

- `git diff --shortstat` → 11 file cambiati, 952 inserimenti(+), 36 cancellazioni(-).
- `npm run build` → exit 0.
- `npm test` → exit 0: contratti 1/8, dominio 12/151, server 36/225, web 2/5; 51 file e 389 test.
- `npm run lint` → exit 0.
- `npx prettier --check` sugli 11 file cambiati → All matched files use Prettier code style!

## Scostamenti dal brief

- `packages/server/src/routes/export.ts:60` accetta `contoId` nullo ed esporta vuota la colonna Conto; modifica autorizzata dopo il BLOCKED dell'implementer, in attesa della rimozione prevista nel 7.3.
- Sostituito `saldoA` con `totaleSenzaAncore` in `packages/dominio/src/aggregazioni.ts` e nel relativo test, mantenendo invariata la firma di `saldoGiornaliero`.
- Estese le attese esatte dei test esistenti con i soli campi nuovi; la route del prospetto passa temporaneamente `letture: []` e `ancore: []`.
- `speseCents` normalizza `-0` a `0`; deviazione dell'implementer verificata innocua dai reviewer.

## Resta aperto

- Per il 7.3 restano il collegamento dei repository di letture e àncore nella route del prospetto, l'estensione dello schema zod del prospetto, il passaggio di `saldoGiornaliero` a `totaleA` e la rimozione della colonna Conto dall'export CSV.
- Nessuna ricaduta su Sonnet; nessun live-testing, perché il giro non tocca l'interfaccia.
