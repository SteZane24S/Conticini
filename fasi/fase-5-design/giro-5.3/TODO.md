# Fase 5, giro 5.3 — Stipendio, Conti, Categorie e regole

Chiuso il 20/09/2026 · commit successivo a questo registro (precedente: 8d41331a0b872acb14755da306e91b89bdc4e513)

## Fatto

- [x] Stipendio restilizzato: layout a due colonne, form "Registra stipendio" nel componente Scheda a sinistra, tabella "Storico cicli" (Tabella component, stesse 4 colonne: Data inizio/Prossimo previsto/Importo previsto/Azioni) a destra; form Modifica previsione resta inline; nessuna modifica a hook, API o logica di dominio.
- [x] Conti restilizzato: griglia di card di saldo per conto attivo in cima (kicker=nome conto, saldo rosso se negativo, stesso pattern del Prospetto del giro 5.2); tabella di gestione conti preservata; card "Nuovo conto"/"Nuovo trasferimento" e form "Modifica conto"/"Modifica trasferimento" nel componente Scheda; tabella "Trasferimenti" invariata; nessuna modifica a hook, API o logica di dominio.
- [x] Categorie e regole restilizzato: layout a due colonne (Settori e categorie ad albero a sinistra, Regole di categorizzazione a destra); badge entrata/uscita a token `var(--verde)`/`var(--rosso)`; tutte le azioni CRUD su settori/categorie/regole preservate; tabella regole nel componente Tabella condiviso; nessuna modifica a `useAlbero.ts`/`useRegole.ts`.
- [x] Corretti in review: in Stipendio, l'errore per-campo non usava la prop `errore` del componente Campo, corretto passando la prop; `STILE_SUCCESSO` rinominata in `STILE_MESSAGGIO_SUCCESSO` per coerenza con `movimenti/stili.ts`. In Categorie e regole, `STILE_GRID` rinominata in `STILE_GRID_SEZIONI` come nelle pagine omologhe (Prospetto, Stipendio).

## Misurato

- `git diff --stat` sugli 8 file del giro → 8 file cambiati, 881 inserimenti(+), 692 cancellazioni(-).
- `npm run build` (dalla radice) → verde su contratti, dominio, server e web.
- `npm test` (dalla radice) → verde, 338 test totali (contratti 7/1 file, dominio 121/11 file, server 205/33 file, web 5/2 file).
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → fallisce solo su `AGENTS.md`, pendenza preesistente non toccata in questo giro.
- Collaudo Chrome (`live-testing`, web su `http://localhost:5173/`, server su `127.0.0.1:47300`, dati in `.dati-dev`) su Stipendio, Conti e Categorie e regole, in tema chiaro e in tema scuro → verde, nessun difetto bloccante, nessun errore di console, nessuna richiesta di rete fallita.

## Scostamenti dal brief

- Le unità Stipendio e Conti sono state implementate regolarmente da sessioni Codex (`gpt-5.6-terra`), senza timeout né errori.
- L'unità Categorie e regole: la sessione Codex ha esaurito la quota dell'account subito dopo aver completato la scrittura dei quattro file, senza restituire un report finale strutturato; il diff prodotto era comunque completo, verificato indipendentemente dall'orchestratore con build/test/lint/format prima della review — tutti verdi.
- A causa dello stesso esaurimento di quota, la review di conformità e la correzione del suo rilievo (`STILE_GRID`→`STILE_GRID_SEZIONI`) sull'unità Categorie e regole sono girate in ricaduta su Claude Sonnet 5 (agenti `Explore` e `general-purpose` con il contratto di ruolo Codex passato in testa al prompt) invece che su Codex. Da tenere presente nel confronto dei pesi fra giri nel registro dei consumi, perché queste sessioni lasciano traccia nei transcript a differenza di quelle Codex.
- Prima del collaudo, l'orchestratore ha trovato ed eliminato 4 processi di sviluppo orfani (3 istanze Vite sulle porte 5173/5174/5175, 1 server sulla porta 47300), creati durante le sessioni Codex degli implementer di questo giro fra le 15:48 e le 16:24 del 20/09/2026 — probabili tentativi di collaudo autonomo non richiesto. Terminati senza impatto sui dati, poi avviata un'istanza pulita per il collaudo.
- Review: Stipendio → bug-hunter 1 rilievo fondato (spaziatura errore-campo), conformity (Codex) 1 rilievo fondato (`STILE_SUCCESSO` duplicato) — entrambi corretti e riverificati. Conti → bug-hunter 0 rilievi, conformity (Codex) 0 rilievi, nessuna istruttoria necessaria. Categorie e regole → bug-hunter 0 rilievi, conformity (ricaduta Sonnet) 1 rilievo fondato (`STILE_GRID`→`STILE_GRID_SEZIONI`) — corretto e riverificato.

## Resta aperto

- Prossimo giro: 5.4 — Spese fisse, In attesa, da `fasi/fase-5-design/PIANO.md`. Continua a chiudersi con `live-testing`.
- La pendenza preesistente su `AGENTS.md` resta invariata: non generata né modificata in questo giro.
- Osservazione non bloccante emersa nel collaudo, non richiesta dal brief: in Categorie e regole, il pannello "Anteprima per «pattern»" non si nasconde automaticamente dopo l'eliminazione della regola a cui si riferisce — comportamento della logica di stato esistente, non toccato da questo giro di restyling.
- Non verificato visivamente durante il collaudo lo stile "saldo rosso se negativo" sulle nuove card di Conti: nessun conto con saldo negativo nei dati di sviluppo attuali; il pattern è lo stesso già verificato nel Prospetto nel giro 5.2, rischio considerato basso.
- Dato di prova rimasto in `.dati-dev` (non nei dati reali dell'utente in `app/dati/`): uno stipendio di collaudo da 1,00€ sul conto "TEST-live-testing" con ciclo 2026-09-20→2026-11-20; non rimosso perché l'app non espone un'azione di eliminazione per un ciclo stipendio già registrato — limite noto della funzionalità esistente, non un difetto di questo giro.
- Nessun rilievo fondato è rimasto fuori scope non risolto in questo giro: tutti e tre i rilievi emersi dalle review (2 su Stipendio, 1 su Categorie e regole) sono stati corretti e riverificati con build/test/lint/format verdi.

## Intervallo di commit

`8d41331a0b872acb14755da306e91b89bdc4e513..<commit di questo giro>`
