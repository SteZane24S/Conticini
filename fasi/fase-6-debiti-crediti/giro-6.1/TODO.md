# Fase 6, giro 6.1 — Modello, dominio e API dei debiti e crediti

Chiuso il 21/09/2026 · commit a2ccba9..<commit di questo giro>

## Fatto

- [x] Introdotto il modello dominio delle posizioni: importo con segno, verso, residuo derivato dai movimenti collegati, saldamento, annullamento e totale netto.
- [x] Esteso `Movimento` con `posizioneId`, esclusi i saldamenti da spese per settore/categoria e da previsto/speso, e aggiunte le interfacce asincrone del repository delle posizioni.
- [x] Aggiunti i contratti Zod per posizioni, creazione, aggiornamento della sola descrizione, saldamento e risposte; estesi i contratti dei movimenti con `posizioneId`.
- [x] Aggiunta la migrazione `002-debiti-crediti.sql` con tabella delle posizioni, collegamento dei movimenti e seed delle due categorie tecniche con id deterministico.
- [x] Implementati repository e API REST delle posizioni, incluso saldamento atomico, annullamento, idempotenza del comando e conflitto sui replay non equivalenti.
- [x] Imposte lato server le guardie sulle categorie tecniche nelle vie ordinarie e sui movimenti di saldamento nelle vie generiche; aggiunto il filtro `posizioneId` alla ricerca movimenti.
- [x] Aggiornati i test preesistenti interessati dalla migrazione 002 e aggiunto il campo `posizioneId` al letterale di `packages/web/src/pages/conti/dati.ts` per mantenere verde il build, senza introdurre comportamento UI.
- [x] Corretti i rilievi fondati delle quattro unità: un rilievo di bug-hunter e quattro di conformity nel dominio, uno di conformity nei contratti, quattro rilievi nel server dell'unità 3 e tre rilievi fondati nell'unità 4. Un rilievo di conformity è stato scartato perché infondato: la differenza era dovuta solo alla lunghezza del contenuto.
- [ ] Il commit include anche l'eliminazione preesistente di una previsione con cascata sulle spese fisse collegate. Era già presente nel working tree, non è stata scritta né rivista dal protocollo di questo giro; l'utente ha scelto esplicitamente di includerla nello stesso commit.

## Misurato

- `git diff --cached --stat` dalla radice, dopo `git add -A -- . ':!AGENTS.md'` → 49 file cambiati, 2379 inserimenti(+), 64 cancellazioni(-).
- `npm run build` dalla radice → verde su tutti i 4 workspace: contratti, dominio, server e web.
- `npm test` dalla radice → verde, 371 test totali su 51 file: contratti 8/1, dominio 133/12, server 225/36, web 5/2.
- `npm run lint` dalla radice → verde, nessun errore.
- `npm run format:check` dalla radice → fallisce solo su `AGENTS.md` non tracciato; la pendenza è preesistente e invariata.

## Scostamenti dal brief

- In `packages/server/src/repositories/trasferimenti.ts` è stato aggiunto `posizioneId: null` anche a `creaMovimentoPerValidazione`, non elencata esplicitamente nel brief ma necessaria per il nuovo campo obbligatorio di `Movimento`; lo scostamento è stato individuato e segnalato dall'implementatore.
- Durante l'istruttoria dell'unità 3 è stata chiesta anche una verifica di completezza su `annullaSaldamento` e sul rifiuto di eliminare una posizione con saldamenti collegati. Entrambe sono risultate implementate correttamente e non hanno richiesto correzioni.
- Non è stato necessario `live-testing`: il giro non cambia l'interfaccia; l'unica modifica in `packages/web` è un adeguamento di tipo.

## Resta aperto

- La pendenza su `AGENTS.md` non tracciato resta invariata; `npm run format:check` continua a fallire solo per quel file.
- La funzionalità preesistente di eliminazione di una previsione con cascata sulle spese fisse non è stata sottoposta a review né a checker in questo giro; se emergono problemi va trattata come un giro a sé.
- Resta come debito la mancata validazione runtime del segno rispetto al `kind` della categoria tecnica nel percorso non-saldamento; il percorso di saldamento la possiede e le mappature pure deterministiche sono verificate dai test di dominio.
- Prossimo giro: 6.2 — Pagina Debiti e crediti, da `fasi/fase-6-debiti-crediti/PIANO.md`; tocca `packages/web` e si chiude con `live-testing`.
