# Guida di sviluppo

## Restyling di Stipendio, Conti, Categorie e regole

Il giro applica il design system Modernist a tre pagine, riusando i componenti condivisi (`Bottone`, `Campo`, `Tabella`, `Scheda`, `Etichetta`) e il pattern di card di saldo introdotto nel Prospetto del giro 5.2. Restyling puro: nessuna modifica a hook, chiamate API o logica di dominio in nessuna delle tre unità.

Stipendio adotta il layout a due colonne: form "Registra stipendio" nella Scheda a sinistra, tabella "Storico cicli" a destra con le stesse 4 colonne di prima. Il form "Modifica previsione" resta inline, non è stato spostato in Scheda.

Conti aggiunge in cima la griglia di card di saldo per conto attivo (stesso pattern del Prospetto, saldo rosso se negativo) sopra la tabella di gestione conti esistente; le card e i form di creazione/modifica di conti e trasferimenti sono nel componente Scheda.

Categorie e regole adotta il layout a due colonne: albero di settori e categorie a sinistra, regole di categorizzazione a destra, con badge entrata/uscita sui token `var(--verde)`/`var(--rosso)`. Tutte le azioni CRUD (creazione, rinomina, eliminazione con conferma inline, attiva/disattiva, anteprima) sono preservate.

In nessuna delle tre pagine sono state aggiunte funzionalità assenti dal dominio attuale — conteggio movimenti/regole attive, campo "tipo conto", colonne Accredito/Speso/Residuo nello storico cicli, riordino priorità delle regole, componente Dialogo — perché avrebbero richiesto nuova logica fuori scope per un giro di restyling puro. Stessa scelta già fatta nel giro 5.2.

## Esaurimento quota Codex sull'unità Categorie e regole

A differenza di Stipendio e Conti, che sono girate regolarmente su Codex (`gpt-5.6-terra`), la sessione Codex dell'unità Categorie e regole ha esaurito la quota dell'account subito dopo aver scritto i quattro file, senza restituire un report strutturato. Il diff era comunque completo: l'orchestratore lo ha verificato indipendentemente con build/test/lint/format prima di procedere, tutti verdi.

Per lo stesso motivo la review di conformità di quell'unità e la correzione del suo rilievo sono girate in ricaduta su Claude Sonnet 5 (`Explore` per la review, `general-purpose` per la correzione, con il contratto di ruolo Codex passato in testa al prompt) invece che su Codex.

## Review e decisioni

Bug-hunter: 1 rilievo fondato su Stipendio (l'errore per-campo non usava la prop `errore` del componente Campo), 0 su Conti, 0 su Categorie e regole.

Conformity: 1 rilievo fondato su Stipendio (`STILE_SUCCESSO` da rinominare in `STILE_MESSAGGIO_SUCCESSO` per coerenza con `movimenti/stili.ts`), 0 su Conti, 1 rilievo fondato su Categorie e regole (`STILE_GRID` da rinominare in `STILE_GRID_SEZIONI` come nelle pagine omologhe). Tutti e tre corretti e riverificati.

## Collaudo

Prima di avviare il collaudo, l'orchestratore ha trovato ed eliminato 4 processi di sviluppo orfani (3 istanze Vite sulle porte 5173/5174/5175, 1 server sulla porta 47300), creati dalle sessioni Codex degli implementer di questo giro fra le 15:48 e le 16:24 — probabili tentativi di collaudo autonomo non richiesto. Nessun impatto sui dati; avviata poi un'istanza pulita.

L'app è stata provata in Chrome su Stipendio, Conti e Categorie e regole, con server su `127.0.0.1:47300`, web su `http://localhost:5173/` e dati in `.dati-dev`, in tema chiaro e scuro: verde, nessun difetto bloccante, nessun errore di console, nessuna richiesta di rete fallita.

Due osservazioni non bloccanti, non richieste dal brief: in Categorie e regole il pannello "Anteprima per «pattern»" non si nasconde automaticamente dopo l'eliminazione della regola a cui si riferisce (logica di stato esistente, non toccata); in Conti lo stile "saldo rosso se negativo" delle nuove card non è stato verificato visivamente perché nessun conto ha saldo negativo nei dati di sviluppo — pattern già verificato nel Prospetto del giro 5.2, rischio considerato basso.

Un dato di prova è rimasto in `.dati-dev`: uno stipendio di collaudo da 1,00€ sul conto "TEST-live-testing", non rimovibile perché l'app non espone un'azione di eliminazione per un ciclo stipendio già registrato.

## Da preservare

Il restyling di Stipendio, Conti e Categorie e regole non tocca hook, chiamate API né logica di dominio: qualunque modifica successiva a queste pagine deve mantenere questa separazione, in particolare `useAlbero.ts` e `useRegole.ts` per Categorie e regole.

Il naming delle costanti di stile per i layout a due colonne è ora coerente su Prospetto, Stipendio e Categorie e regole (`STILE_GRID_SEZIONI`): un giro futuro che introduca un layout simile deve seguire lo stesso nome, non `STILE_GRID`.

L'osservazione sul pannello "Anteprima per «pattern»" in Categorie e regole va risolta solo in un giro che tocchi di nuovo `useRegole.ts` o la logica di anteprima, non in un restyling.
