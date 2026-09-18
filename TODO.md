# Conticini — stato del progetto

**Stato:** giro 3.3 chiuso il 18/09/2026.
**Prossimo giro:** 3.4 — Previsioni; prospetto, vedi fasi/fase-3-ui-provvisoria/PIANO.md.
**Orchestratore dei giri:** Claude Sonnet 5 `high`, contesto pulito a ogni giro.

## Checklist dei giri

### Fase 0 — Fondamenta
- [x] 0.1 Monorepo, TypeScript, ESLint (confine di `dominio`), Prettier, Vitest, gate, better-sqlite3 verificato
- [x] 0.2 Server Fastify: cartella dati, DB, migrazioni, `meta`, `/api/salute`, localhost + `Host`, istanza singola, heartbeat
- [x] 0.3 Web: Vite + proxy, layout provvisorio con navigazione, build servita da Fastify

### Fase 1 — Dominio puro
- [x] 1.1 Soldi, date, UUIDv5, ricorrenze
- [x] 1.2 Saldo a D, cicli, formula di previsione + test di accettazione
- [x] 1.3 Normalizzazione, regole di categoria, ranking autocompletamento, validazioni

### Fase 2 — Persistenza e API
- [x] 2.1 Schema 001, colonne di sincronizzazione, `change_log`, repository
- [x] 2.2 API conti, settori/categorie, movimenti, trasferimenti
- [x] 2.3 API stipendi/cicli, spese fisse, occorrenze, catch-up
- [x] 2.4 API previsioni, prospetto, regole e suggerimenti

### Fase 3 — UI provvisoria
- [x] 3.1 Conti e trasferimenti; settori, categorie e regole
- [x] 3.2 Movimenti (inserimento rapido, elenco, modifica)
- [x] 3.3 Stipendio; spese fisse; in attesa
- [ ] 3.4 Previsioni; prospetto

### Fase 4 — Grafici, backup, rilascio
- [ ] 4.1 Grafici
- [ ] 4.2 Backup e ripristino, export CSV e JSON
- [ ] 4.3 Build in `app/`, launcher, icona, aggiornamento

### Fase 5 — Restyling con Claude Design
- [ ] Design prodotto dall'utente su claude.ai/design (brief in `fasi/fase-5-design/PIANO.md`)
- [ ] Giri da definire quando il design esiste

### Fase 6 — Mobile e sincronizzazione
- [ ] Richiede una nuova sessione di pianificazione su Opus

## Pendenze aperte
- Il file `AGENTS.md` non tracciato alla radice resta una pendenza preesistente invariata: è comparso durante sessioni Codex di un giro precedente, non è richiesto dai brief e non è incluso in alcun commit; la decisione se tenerlo, cancellarlo o ignorarlo è dell’utente.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 2.2, tranne la nota su `PUT` invece di `PATCH` per i trasferimenti: è deliberata da `PIANO.md`, non una pendenza.
- Test di rollback non aggiunto in categorie per il secondo insert di `creaCategoriaConSettoreEventuale`: debito accettato consapevolmente, per non introdurre un test fragile basato su mock.
- Debito di copertura test nella cascata delle spese fisse: le asserzioni verificano `amountCents`, ma non esplicitamente `contoId`/`categoriaId`/`mode`; la correttezza è stata verificata manualmente e il debito è accettato.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 2.4, tranne il debito di copertura test sul leak tra override di cicli diversi nel prospetto multi-ciclo (comportamento verificato manualmente come corretto, asserzione automatica assente).
- Durante il giro 2.4 la pool Codex si è esaurita per quota; le correzioni di U3, il wiring U4 e il fix di formattazione sono girati in ricaduta su Sonnet — da tenere presente nel confronto dei pesi fra giri nel registro dei consumi, perché queste sessioni lasciano traccia nei transcript a differenza di quelle Codex.
- Il prossimo giro è il 3.3 — Stipendio; spese fisse; in attesa, da `fasi/fase-3-ui-provvisoria/PIANO.md`. Da qui in avanti ogni giro si chiude con `live-testing` (il giro 2.4 non lo richiedeva, perché non tocca `packages/web`).
- Query N+1 in `elencaTrasferimenti` (`packages/server/src/repositories/trasferimenti.ts`): debito accettato, trascurabile per il volume dati di un'app personale.
- Messaggio del vincolo "settore con categorie attive" include l'UUID tecnico in coda al testo (`packages/server/src/errori.ts`, `erroreSettoreConCategorie`): cosmetico, da pulire in un giro futuro se si tocca di nuovo quel file.
- Messaggio d'errore del form trasferimento non si pulisce automaticamente quando l'utente corregge un campo prima di ri-sottomettere (`packages/web/src/pages/Conti.tsx`, `TrasferimentoForm`): debito di UX minore, accettato per la fase "UI provvisoria".
- Il giro 3.1 è girato interamente in ricaduta su Sonnet (Codex non disponibile): da tenere presente nel confronto dei pesi fra giri nel registro dei consumi, perché queste sessioni lasciano traccia nei transcript a differenza di quelle Codex.
- Il prossimo giro è il 3.3 — Stipendio; spese fisse; in attesa, da `fasi/fase-3-ui-provvisoria/PIANO.md`. Da qui in avanti ogni giro continua a chiudersi con `live-testing`, come già stabilito.
- La pendenza preesistente su `AGENTS.md` (file non tracciato alla radice, comparso in un giro precedente, decisione dell’utente se tenerlo/cancellarlo) resta invariata: non è stata generata né modificata nel giro 3.1.
- Paginazione a offset instabile in `useMovimenti` se il dataset cambia durante lo scaricamento di più pagine: debito accettato, trascurabile per il volume di un’app personale locale mono-utente.
- Aprire “Modifica” su una riga dell’elenco movimenti sovrascrive senza avviso un form di modifica non salvato su un’altra riga: debito minore di UX per la fase “UI provvisoria”.
- Rischio trascurabile di race condition UI se l'utente cambia il tipo del movimento esattamente durante la creazione asincrona di una categoria al volo.
- Limite noto: il catch-up delle occorrenze fisse non si attiva alla creazione o modifica di una spesa fissa a runtime, solo all'avvio del server o al cambio di giorno via heartbeat (`packages/server/src/app.ts`, `packages/server/src/catchUp.ts`, codice del giro 2.3). Da valutare in un giro futuro che tocchi di nuovo `packages/server`.
- La pool Codex si è esaurita due volte durante il giro 3.3; le unità 2 e 3 sono girate in parte in ricaduta su Sonnet (`Explore`/`general-purpose`). Da tenere presente nel confronto dei pesi fra giri nel registro dei consumi.
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 3.3.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 3.3: tutti gli otto rilievi di review e il difetto trovato dal collaudo sono stati corretti e riverificati.
- Il prossimo giro è il 3.4 — Previsioni; prospetto, da `fasi/fase-3-ui-provvisoria/PIANO.md`. Chiude la fase 3 e include lo scenario di accettazione completo descritto in fondo al piano. Continua a chiudersi con `live-testing`.
