# Guida di sviluppo — giro 7.1

## Decisioni da conservare

- Il totale non dipende più dall'attribuzione corrente ai conti: `totaleA` applica la formula dell'àncora con l'insieme C, mentre `saldiPerConto` conserva il valore storico o l'ultima lettura del conto. Lo scarto è la differenza fra somma dei saldi segnati e totale.
- Un movimento senza conto è valido e partecipa al totale. Le àncore attestano il totale a una data e impediscono che un movimento retrodatato già assorbito lo riduca una seconda volta; un movimento nuovo della stessa giornata resta invece fuori da C e modifica il totale.
- Il prospetto calcola `totaleA` una volta e lo riusa per saldo totale e saldo previsto; le API non sono ancora pronte, quindi la route fornisce liste vuote per letture e àncore.

## Riuso e limiti

- `saldoA` è stata rimossa; le aggregazioni che devono ancora ignorare le àncore usano `totaleSenzaAncore`. Nel giro 7.3 `saldoGiornaliero` dovrà passare alla stessa funzione totale usata dal prospetto.
- La nullable-ness di `contoId` attraversa anche l'export CSV: fino al 7.3 un movimento senza conto produce una cella Conto vuota. Non reintrodurre un conto fittizio; la colonna verrà eliminata secondo il piano.
- `calcolaTotaleNetto` dei debiti non è cambiata: è già agnostica rispetto all'origine dell'importo e riceverà il totale dal server e dalla pagina nei giri successivi.

## Review e verifica

- U1 conformity ha prodotto zero rilievi. Il bug-hunter ha segnalato la modifica all'export come fuori perimetro, ma il rilievo è infondato: l'unità era in BLOCKED e la riga era stata autorizzata esplicitamente. Il bug-hunter ha inoltre ricontrollato formule, confini, àncore, letture a parità di data e i nove test senza trovare difetti; non è stato usato un checker perché il rilievo riguardava un fatto della conversazione.
- U2 conformity e bug-hunter hanno prodotto zero rilievi. L'osservazione su `validaTrasferimento` e due gambe senza conto non è un rilievo: non è raggiungibile oggi e dal 7.2 non si creeranno nuovi trasferimenti.
- I gate sono verdi. Non è stato eseguito live-testing perché il giro non modifica la superficie dell'interfaccia.

## Consumi e ricadute

- Il giro è stato orchestrato con Claude Opus 5.5 per scelta esplicita dell'utente; il confronto fra giri deve tenerne conto.
- Le due unità sono state eseguite in serie da implementer Codex gpt-5.6-terra high. Non ci sono state ricadute su Sonnet.
