# Guida di sviluppo

## Backup e ripristino

La configurazione del backup vive in `backup-config.json`, separata dal database sincronizzabile: è configurazione locale del dispositivo e il ripristino sostituisce l'intero database. Il ripristino valida il nome e l'integrità del file, crea una copia di sicurezza, sostituisce il database con rename atomico e riapplica le migrazioni necessarie.

La rotazione della copia di sicurezza è rinviata alla fine del ripristino riuscito, così non può cancellare il backup appena validato. Le esecuzioni sono serializzate e il riferimento al database viene risolto al momento dell'esecuzione, per preservare la correttezza anche durante una sostituzione concorrente.

## Export

Il CSV segue il formato Excel italiano: BOM UTF-8, separatore `;`, importi con virgola decimale e date `GG/MM/AAAA`. I nomi storici di categoria e settore si risolvono includendo anche le righe cancellate. Il JSON esporta tutte le tabelle di dominio, tombstone compresi, insieme ai metadati di formato, schema e dataset.

## Avvio e interfaccia

Il backup automatico precede le migrazioni: l'ordine è un requisito del piano perché conserva lo stato precedente a una possibile migrazione difettosa. La pagina Backup disabilita i controlli durante ripristino e salvataggio e mostra messaggi espliciti di esito.

## Review e collaudo

I rilievi su rotazione, riapertura del database, serializzazione, DTO duplicati, scansione migrazioni, export storico, ordine di avvio, stato del ripristino, input modificabili e schema dopo migrazione sono stati corretti e riverificati. Il rilievo sullo stile Promise è stato scartato: il file di riferimento usa già entrambi gli stili.

Il 503 dell'export CSV osservato dal collaudo è un falso positivo dello strumento sui download, non un errore dell'applicazione: le richieste verificate hanno restituito 200.

## Da preservare

Il backup automatico deve restare prima delle migrazioni. Il ripristino deve riaprire il database anche in errore, aggiornare `schema_version` dopo le migrazioni e mantenere la serializzazione delle operazioni di backup.
