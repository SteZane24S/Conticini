# Conticini — stato del progetto

**Stato:** giro 5.5 chiuso il 20/09/2026 — Previsioni, Grafici, Backup completati: la Fase 5 è chiusa.
**Prossimo giro:** Fase 6 — Mobile e sincronizzazione, richiede una nuova sessione di pianificazione su Opus.
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
- [x] 3.4 Previsioni; prospetto

### Fase 4 — Grafici, backup, rilascio
- [x] 4.1 Grafici
- [x] 4.2 Backup e ripristino, export CSV e JSON
- [x] 4.3 Build in `app/`, launcher, icona, aggiornamento

### Fase 5 — Restyling con Claude Design
- [x] Design prodotto dall'utente su claude.ai/design (brief in `fasi/fase-5-design/PIANO.md`)
- [x] 5.1 Fondamenta: token, design system, componenti condivisi, layout
- [x] 5.2 Prospetto e Movimenti
- [x] 5.3 Stipendio, Conti, Categorie e regole
- [x] 5.4 Spese fisse, In attesa
- [x] 5.5 Previsioni, Grafici, Backup — chiude la Fase 5

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
- Fase 3 — UI provvisoria è chiusa con questo giro: tutti i giri 3.1-3.4 completati.
- Il catch-up delle occorrenze fisse non si attiva alla creazione o modifica runtime di una spesa fissa con date retroattive: parte solo all'avvio del server o al cambio di giorno via heartbeat. Limite noto, riconfermato durante il collaudo del giro 3.4; da valutare in un giro futuro che tocchi di nuovo `packages/server`.
- La pendenza preesistente su `AGENTS.md` (file non tracciato alla radice, decisione dell'utente se tenerlo, cancellarlo o ignorarlo) resta invariata: non è stata generata né modificata in questo giro.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 3.4: entrambi i rilievi fondati sono stati corretti e riverificati.
- Prossimo giro: 4.1 — Grafici, da `fasi/fase-4-grafici-backup-rilascio/PIANO.md`. Apre la Fase 4 — Grafici, backup, rilascio.
- La pendenza preesistente su AGENTS.md (file non tracciato alla radice, decisione dell'utente se tenerlo, cancellarlo o ignorarlo) resta invariata: non è stata generata né modificata nel giro 4.1.
- Nessun rilievo fondato è rimasto fuori scope nel giro 4.1: i due rilievi fondati (validazione zod incompleta in packages/contratti/src/grafici.ts) sono stati corretti e riverificati; i tre rilievi di conformity sull'assenza di `ricarica` negli hook di packages/web/src/pages/grafici/dati.ts sono stati istruiti dal checker e giudicati infondati (pagina di sola lettura, nessuna mutazione).
- Il collaudo del giro 4.1 ha trovato un difetto cosmetico nel tooltip del grafico "Saldo giornaliero" (etichetta del campo grezzo invece di "Saldo"): corretto con una modifica di una riga, verificata con build ma non ricollaudata per intero in Chrome (fix senza impatto logico).
- Prossimo giro: 4.2 — Backup, ripristino, export, da fasi/fase-4-grafici-backup-rilascio/PIANO.md.
- Nessun rilievo fondato è rimasto fuori scope nel giro 4.2: i rilievi delle quattro unità, del bug-hunter finale e del collaudo sono stati corretti e riverificati; il rilievo sul pattern Promise in `useBackup` è stato confermato fondato ma scartato dall'orchestratore, perché il file di riferimento usa già entrambi gli stili.
- Il presunto status 503 sull'export CSV del giro 4.2 è stato verificato come falso positivo dello strumento di automazione browser nella gestione dei download; le richieste dirette e tramite proxy hanno risposto 200.
- Prossimo giro: 4.3 — Rilascio in `app/`, da fasi/fase-4-grafici-backup-rilascio/PIANO.md.
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 4.2.
- L’icona `Conticini.ico` è un segnaposto a colore pieno: il design vero arriverà con la Fase 5 e andrà rigenerato allora.
- Nessun rilievo fondato è rimasto fuori scope nel giro 4.3: l’unico rilievo sull’ordinamento di `package.json` è stato corretto e riverificato.
- La Fase 4 — Grafici, backup, rilascio è chiusa con questo giro: tutti i giri 4.1, 4.2, 4.3 completati.
- Prossimo passo: Fase 5 — Restyling con Claude Design. Richiede che l’utente produca prima il design su claude.ai/design; i giri di quella fase si definiscono solo dopo che il design esiste.
- Il componente `Dialogo` del giro 5.1 è stato creato ma non è ancora usato dalle pagine: verrà integrato nei giri 5.2–5.5 dove il design lo richiede.
- Prossimo giro: 5.2 — Prospetto e Movimenti, da `fasi/fase-5-design/PIANO.md`.
- Prossimo giro: 5.3 — Stipendio, Conti, Categorie e regole, da `fasi/fase-5-design/PIANO.md`. Continua a chiudersi con `live-testing`.
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 5.2.
- Osservazione non bloccante non risolta nel giro 5.2: la card di un conto scompare dal Prospetto se la data di riferimento è anteriore alla creazione del conto, invece di mostrare 0,00€ — comportamento di dominio non toccato, da valutare in un giro futuro che tocchi di nuovo quella logica.
- Nota tecnica sull'ambiente: nel giro 5.2 il server MCP Codex ha mostrato timeout ripetuti (4 tentativi su 4 senza risposta per 30 minuti); un processo Codex orfano di 3 giorni con 534 thread è stato identificato come probabile causa e terminato, ma il server è rimasto disconnesso per il resto del giro. Da monitorare nel prossimo giro.
- Osservazione fuori scope dal giro 5.2, non risolta: sul sistema sono presenti numerosi processi `node.exe` orfani risalenti a più giorni prima del giro; non toccati, segnalati per un'eventuale pulizia futura decisa dall'utente.
- Prossimo giro: 5.4 — Spese fisse, In attesa, da `fasi/fase-5-design/PIANO.md`. Continua a chiudersi con `live-testing`.
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 5.3.
- Osservazione non bloccante emersa nel collaudo del giro 5.3, non risolta: in Categorie e regole il pannello "Anteprima per «pattern»" non si nasconde automaticamente dopo l'eliminazione della regola a cui si riferisce — comportamento della logica di stato esistente, non toccato da questo giro; da valutare in un giro futuro che tocchi di nuovo `useRegole.ts`.
- Non verificato visivamente nel collaudo del giro 5.3 lo stile "saldo rosso se negativo" sulle nuove card di Conti: nessun conto con saldo negativo nei dati di sviluppo attuali; pattern già verificato nel Prospetto nel giro 5.2, rischio considerato basso.
- Dato di prova rimasto in `.dati-dev` dal collaudo del giro 5.3 (non nei dati reali dell'utente in `app/dati/`): uno stipendio di collaudo da 1,00€ sul conto "TEST-live-testing" con ciclo 2026-09-20→2026-11-20; non rimovibile perché l'app non espone un'azione di eliminazione per un ciclo stipendio già registrato — limite noto, non un difetto del giro.
- Nel giro 5.3 l'unità Categorie e regole è girata in parte in ricaduta su Sonnet (review di conformità e correzione del suo rilievo) per esaurimento della quota Codex: da tenere presente nel confronto dei pesi fra giri nel registro dei consumi, perché queste sessioni lasciano traccia nei transcript a differenza di quelle Codex.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 5.3: tutti e tre i rilievi (2 su Stipendio, 1 su Categorie e regole) sono stati corretti e riverificati.
- Prossimo giro: 5.5 — Previsioni, Grafici, Backup, da `fasi/fase-5-design/PIANO.md`. Chiude la Fase 5 con `live-testing` su tutte e tre le pagine, in tema chiaro e scuro.
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 5.4.
- Osservazione non bloccante emersa nel collaudo del giro 5.4, non risolta: nel form "Nuova spesa fissa" il campo Importo interpreta un punto digitato (es. "1.23") come separatore delle migliaia anziché decimale, producendo "1.230,00" — comportamento della maschera numerica esistente (`parseImporto` di dominio, non introdotto da questo giro), da valutare in un giro futuro che tocchi di nuovo la formattazione degli importi.
- Non verificato in browser nel collaudo del giro 5.4 (mancavano strumenti di intercettazione di rete nella sessione): il percorso di fallimento dell'azione "Salta" in In attesa, cioè che il dialogo resti aperto con messaggio d'errore invece di chiudersi quando la chiamata API fallisce; la correzione è stata verificata a livello di codice dal `checker` con citazione testuale, rischio residuo considerato basso.
- Dato di prova rimasto in `.dati-dev` dal collaudo del giro 5.4 (non nei dati reali dell'utente in `app/dati/`): un'occorrenza manuale di "Netflix" (scadenza 2026-09-10) è stata marcata come "saltata" per verificare il percorso di successo dell'azione — non annullabile dall'interfaccia.
- Nell'unità Spese fisse del giro 5.4 la sessione Codex è andata in timeout (nessuna risposta per 1800s) prima di restituire il report finale, ma il lavoro era comunque scritto correttamente su disco: l'orchestratore lo ha verificato indipendentemente con build/test/lint/format, tutti verdi, prima di procedere alla review. Da tenere presente nel confronto dei pesi fra giri nel registro dei consumi.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 5.4: i tre rilievi fondati (1 su Spese fisse, 2 su In attesa) sono stati corretti e riverificati; l'unico rilievo scartato (conformity su Spese fisse, campi Modalità/Attiva fuori dal componente `Campo`) è stato giudicato infondato perché richiesto esplicitamente dal brief e coerente con un pattern già in uso nel progetto (`packages/web/src/pages/movimenti/InserimentoRapido.tsx`).
- La pendenza preesistente su `AGENTS.md` resta invariata: non è stata generata né modificata nel giro 5.5; `npm run format:check` continua a fallire solo per quel file, non per i sei file toccati dal giro.
- Difetto trovato dal collaudo del giro 5.5, non corretto perché preesistente e non introdotto da questo giro: nel form Impostazioni di Backup, un valore non valido (es. "0") nel campo "Ogni quanti backup mantenerne" blocca il salvataggio ma non mostra il messaggio d'errore applicativo, perché la validazione nativa HTML (`type="number" min={1}`) impedisce all'evento submit di React di scattare — limite sistemico presente su tutti i campi numerici min/max del progetto (nessuna pagina usa `noValidate`), da valutare in un giro futuro che tocchi la validazione dei form in generale.
- Nota tecnica sull'ambiente, giro 5.5: rilevata e ripulita un'accumulazione di 23 processi `node.exe` orfani di `npm run dev` mai fermati nei giri precedenti (risalenti fino al 18/09/2026); raccomandazione per i giri futuri: verificare a inizio ciclo se esistono già istanze di sviluppo in ascolto prima di avviarne una nuova.
- Nessun rilievo fondato è rimasto fuori scope non risolto nel giro 5.5: i cinque rilievi fondati (2 costanti di stile morte, 3 di concorrenza/UX sul dialogo di ripristino di Backup) sono stati corretti e riverificati con build/lint/format/test, tutti verdi.
- La Fase 5 — Restyling con Claude Design è chiusa con questo giro: tutti i giri 5.1-5.5 completati.
- Prossimo passo: Fase 6 — Mobile e sincronizzazione. Richiede una nuova sessione di pianificazione su Opus: nessun piano di dettaglio esiste ancora per questa fase.
