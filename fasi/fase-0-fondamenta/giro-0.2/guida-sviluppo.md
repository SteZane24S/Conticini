# Guida di sviluppo — giro 0.2

## Perché questa strada

Il server separa configurazione, database, migrazioni e metadati per mantenere l'avvio ripetibile e rendere esplicita la persistenza degli identificativi del dataset e del dispositivo. Le migrazioni sono registrate e applicate in transazione; i nomi devono usare tre cifre, così l'ordinamento lessicografico resta affidabile.

L'app espone solo l'accesso locale previsto: il controllo dell'header `Host` limita le richieste agli host locali e rifiuta gli altri con 421. L'entrypoint riconosce un'istanza Conticini già attiva prima di aprire il database e tratta gli errori di avvio e chiusura in modo esplicito.

## Rilievi e decisioni

`meta.schema_version` viene riallineato al conteggio delle migrazioni applicate, preservando `datasetId` e `deviceId` fra riavvii. La validazione del nome delle migrazioni rende coerente il formato imposto dal piano e l'ordinamento dei file.

Sono stati gestiti anche i rami di avvio concorrente, il confronto case-insensitive dell'entrypoint su Windows, il rigetto di `app.close()` e il `Host` maiuscolo. I test coprono risposta non valida, JSON malformato e versione non stringa nel controllo dell'istanza.

## Cosa non toccare

Non modificare il codice del dominio né il piano di progetto, `CLAUDE.md` o il lockfile per descrivere il giro file per file. Lo script `dev` radice resta incompleto fino al giro 0.3, che deve aggiungere il corrispondente script web.
