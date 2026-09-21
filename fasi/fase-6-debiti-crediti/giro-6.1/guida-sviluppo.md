# Guida di sviluppo — giro 6.1

## Decisioni da conservare

- Il residuo di una posizione non è una colonna: è `importo iniziale con segno − somma degli importi dei movimenti collegati`.
- Il saldamento crea il movimento reale sul conto scelto e aggiorna la posizione nella stessa transazione; l'annullamento usa tombstone sul movimento e riapre il residuo nella stessa transazione.
- L'idempotenza si basa sull'identificatore deterministico del movimento di saldamento. Dopo aver verificato l'esistenza, un replay con gli stessi dati è accettato; dati diversi producono `saldamento_in_conflitto`.
- Le due categorie tecniche sono riconosciute dal loro id deterministico, non dal nome. Restano riservate alle vie di saldamento e non entrano nelle aggregazioni di spesa perché il movimento è collegato a una posizione.
- Il totale netto vive nella futura pagina Debiti e crediti. Il Prospetto e la formula del saldo previsto non sono stati modificati.

## Riuso e convenzioni

- Il dominio conserva gli importi in centesimi con segno e usa le funzioni di somma esistenti, inclusa la protezione dall'overflow in `calcolaTotaleNetto`.
- Il server mantiene il write-path centralizzato dei movimenti e il modello transazionale già usato da `confermaOccorrenza`; le posizioni hanno repository dedicato e API REST dedicate.
- Le guardie sulle categorie tecniche sono applicate lato server a movimenti, stipendi, regole, spese fisse, previsioni e categorie; i movimenti di saldamento non passano dalle vie generiche di modifica o cancellazione.
- La migrazione 002 pre-inserisce un settore tecnico e due categorie tecniche in ogni database, compresi quelli di test; per questo sono stati aggiornati i test preesistenti che assumevano database vuoti.

## Punto delicato per il futuro

- La validazione runtime del segno rispetto al `kind` della categoria tecnica resta assente nel percorso non-saldamento. È un debito a basso rischio: le due mappature sono pure e deterministiche sullo stesso `verso`, e i test di dominio le verificano.
- La funzionalità di eliminazione di una previsione con cascata sulle spese fisse era già presente nel working tree e inclusa per decisione esplicita dell'utente nello stesso commit; non va attribuita al protocollo di questo giro né considerata revisionata.
- Il prossimo giro implementerà la pagina web e dovrà verificare in Chrome il saldo del conto dopo un saldamento parziale, la stabilità del totale netto e l'esclusione del saldamento dalle spese per categoria, nei temi chiaro e scuro.

## Limiti verificati

- `npm run format:check` non è completamente verde perché segnala solo `AGENTS.md`, file non tracciato e pendenza preesistente; i numeri del giro non includono una misura separata di formattazione sui file toccati.
- Non è stato eseguito `live-testing`: il giro non modifica comportamento visibile dell'interfaccia.
