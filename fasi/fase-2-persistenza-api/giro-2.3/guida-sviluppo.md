# Guida di sviluppo — giro 2.3

Le occorrenze delle spese fisse non espongono un metodo `crea` in `RepositorioOccorrenzeFisse`: vengono materializzate esclusivamente dal catch-up, in modo atomico e idempotente. L'API delle occorrenze legge e modifica quindi solo righe già esistenti.

La conferma manuale usa un id di movimento casuale (`randomUUID`), mentre il catch-up usa `uuidv5(occorrenzaId, NAMESPACE_CONTICINI)`. L'id deterministico è necessario per l'idempotenza della sola materializzazione automatica; imporlo alla conferma manuale aggiungerebbe un vincolo senza funzione.

Le modifiche a importo, conto, categoria e modalità di una spesa fissa si propagano soltanto alle occorrenze `pending`, mai a quelle `paid` o `skipped`, perché il piano vieta di riscrivere le occorrenze già avvenute. La propagazione avviene riga per riga nella stessa transazione dell'aggiornamento della spesa fissa, attraverso il modulo centrale di scrittura.

Il catch-up gira all'avvio del server e al cambio di giorno solare rilevato dall'heartbeat, mai dentro una GET e non più di una volta al giorno. In questo modo una richiesta di sola lettura non produce effetti collaterali di scrittura.

Le scritture composite di stipendio e ciclo, conferma di un'occorrenza e movimento, e catch-up seguono il pattern del giro 2.2 per i trasferimenti: una funzione sincrona avvolge le chiamate a `inserisci`/`aggiorna` in un'unica `ctx.db.transaction()`. Le transazioni annidate sono gestite da better-sqlite3 tramite SAVEPOINT.

La firma di `RepositorioOccorrenzeFisse` e l'assenza di `creaCicloSchema`/`elencoCicliRispostaSchema` sono scelte deliberate di scope per il giro 2.3, non omissioni. Non vanno modificate senza motivo; il giro 2.4 le completerà quando serviranno per `GET /api/cicli` e `GET /api/prospetto`.
