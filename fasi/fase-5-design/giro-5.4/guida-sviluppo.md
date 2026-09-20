# Guida di sviluppo — giro 5.4

## Decisioni da conservare

- Spese fisse ora usa un layout a due colonne: elenco a sinistra e form sempre presente a destra dentro `Scheda`. Il bottone separato per aprire “Nuova spesa fissa” non va ripristinato.
- In attesa usa una lista unica di card ordinata per scadenza. Il colore del bordo e dello stato distingue le occorrenze arretrate da quelle di oggi o future.
- `Dialogo` viene usato per la prima volta in modo reale nelle pagine Spese fisse e In attesa. La decisione congelata dal giro 5.1 impone conferme dentro la pagina, mai popup del browser; il prototipo mostra proprio eliminazione e scarto come dialoghi modali.
- Le conferme leggere — attivazione/disattivazione e chiusura di un pannello di modifica — restano senza conferma o con `ConfermaInline`; questo giro non le ha migrate.

## Riuso e convenzioni

- La prossima scadenza di Spese fisse è calcolata lato client con `occorrenzeTra` su un orizzonte di 14 mesi. È riuso di una funzione pura già esistente, usata anche da `catchUp.ts`, non nuova logica di dominio.
- `STILE_GRID_SEZIONI` è il nome da seguire per i layout a due colonne: Spese fisse è la quarta pagina a riusarlo dopo Prospetto, Stipendio e Categorie e regole.
- Modalità e Attiva restano fuori da `Campo`: il primo è un gruppo `ControlloSegmentato` senza un singolo `id` associabile, il secondo segue il pattern condiviso già usato nel progetto.

## Punto delicato per il futuro

- Quando una conferma passa da `ConfermaInline` a `Dialogo`, verificare che la gestione non chiuda stati appartenenti a pannelli diversi. La chiusura del dialogo deve dipendere dal successo dell'operazione, non dal solo click: questa omissione in Salta è stata corretta in questo giro.
- Non confondere il numero misurato dei test con una nuova copertura: il giro non ha modificato hook, API o logica di dominio.

## Limiti verificati

- Il percorso di errore di Salta è stato controllato a livello di codice, ma non indotto nel browser per l'assenza di strumenti di intercettazione della rete nella sessione di collaudo.
- Il messaggio di stato vuoto di In attesa non è stato osservato perché i dati di sviluppo contenevano occorrenze; non alterare i dati reali in `app/dati/` per riprodurlo.
- L'interpretazione del punto nel campo Importo appartiene alla maschera numerica esistente e non è stata cambiata da questo restyling.
