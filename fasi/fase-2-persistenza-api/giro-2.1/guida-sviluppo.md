# Guida di sviluppo — giro 2.1

La migrazione 001 è la base persistente del modello dati: vincoli, relazioni, indici e metadati di sincronizzazione devono restare coerenti con il contratto del dominio. Le scritture passano dal modulo centrale, che mantiene nella stessa transazione la riga dati e il relativo `change_log`; le cancellazioni sono tombstone e le letture li escludono per default.

`id`, i timestamp e le revisioni sono colonne riservate: `inserisci` e `aggiorna` le rifiutano esplicitamente per evitare che i dati forniti dal chiamante disallineino la riga dal log. `aggiorna` e `cancella` rifiutano anche identificativi inesistenti prima di registrare il log; il rollback della transazione mantiene entrambe le parti coerenti.

I tre `tsconfig.json` escludono i test perché la compilazione dei test in `dist/` lasciava artefatti stantii in conflitto con i sorgenti. I file di test del server sono serializzati perché condividono la cartella reale delle migrazioni; è una protezione dell’isolamento dei test, non una modifica al comportamento di produzione.

Non introdurre DELETE fisici né scritture dirette che bypassino il modulo centrale: si perderebbero tombstone, revisioni e log. Non rimuovere la serializzazione finché i test non useranno una cartella migrazioni isolata per processo. Il controllo ottimistico su `base_revision` non appartiene a questo giro: è rimandato al livello di sincronizzazione della fase 6.

