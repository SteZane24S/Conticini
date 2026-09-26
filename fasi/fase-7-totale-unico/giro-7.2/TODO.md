# Fase 7, giro 7.2 — Migrazione 003 e API senza conto

Chiuso il 26/09/2026 · commit 7b03286..<commit di questo giro>

## Fatto

- [x] Aggiunta la migrazione 003 con `account_id` nullable, le tabelle per letture e àncore e il backup obbligatorio prima delle migrazioni pendenti.
- [x] Resi movimenti, spese fisse, occorrenze, stipendi e saldamenti indipendenti dal conto per i nuovi dati, preservando i dati storici.
- [x] Resi i trasferimenti di sola lettura e adattato in modo minimo il web alle risposte con conto nullo.

## Misurato

- `git diff --cached --shortstat` → 37 file cambiati, 752 inserimenti(+), 881 cancellazioni(-).
- `npm run build` → exit 0 (server e web).
- `npm test` → exit 0: contratti 1 file/8 test, dominio 12 file/151 test, server 36 file/224 test, web 2 file/5 test; 51 file e 388 test in totale.
- `npm run lint` → exit 0.
- `npx prettier --check` sui 36 file non-SQL toccati dal giro → All matched files use Prettier code style!
- `format:check` → fallisce solo su `AGENTS.md` alla radice, file non tracciato preesistente e non toccato dal giro.

## Scostamenti dal brief

- Il backup pre-migrazione ora interrompe l'avvio se fallisce; `migrazioniPendenti` riusa la funzione condivisa e i test della migrazione di ricostruzione usano una cartella temporanea isolata.
- Corretto anche il repository delle occorrenze, che scriveva ancora `account_id` dal chiamante; rimosso il tipo non aggiornato di `RigaSpesaFissa`. La duplicazione delle quattro funzioni `nomeConto` è stata accettata come debito preesistente.
- Nessun rilievo fondato è rimasto fuori scope non risolto. Non è stato eseguito live-testing: il diff tocca il web, ma il ramo con conto nullo non è raggiungibile dai flussi UI attuali.

## Resta aperto

- Per il 7.3: repository e route di letture e àncore, schema zod del prospetto, `saldoGiornaliero` a `totaleA`, export JSON con `debt_credit_positions` e rimozione della colonna Conto dall'export CSV.
- Per il 7.4 resta la pulizia visiva dei selettori di conto e delle funzioni `nomeConto` duplicate.
- Restano la pendenza preesistente su `AGENTS.md` e il debito accettato sulla duplicazione di `nomeConto`.
