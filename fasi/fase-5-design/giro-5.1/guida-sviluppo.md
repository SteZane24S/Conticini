# Guida di sviluppo

## Fondamenta del design system

Il giro porta nel progetto il design system Modernist esportato da claude.ai/design: token di colore, tipografia, spaziatura, raggio, ombre, tema scuro e token di dominio. Archivo è self-hosted nel bundle, perché il piano vieta risorse da CDN.

La libreria condivisa ricalca i componenti previsti dal design system e concentra il riuso nei giri successivi. `Dialogo` implementa il pattern modale con backdrop e chiusura da tastiera o dal backdrop; `ConfermaInline` resta il pattern leggero per conferme inline e usa ora `Bottone` senza modificare il contratto pubblico.

Il layout adotta la sidebar del prototipo con le dieci voci esistenti, indicatore della voce attiva, badge per “In attesa” e selettore persistente del tema. Le pagine non sono state ancora migrate: il piano assegna il loro restyling ai giri 5.2–5.5.

## Review e decisioni

Il bug-hunter non ha prodotto rilievi. Il rilievo sulla mancata sostituzione di `ConfermaInline` con `Dialogo` è stato giudicato infondato: sono pattern distinti; il componente inline è stato comunque aggiornato al nuovo `Bottone`.

Il rilievo sulla mancata adozione dei componenti nelle pagine è fondato ma fuori scope, perché il piano la assegna ai giri successivi. Il rilievo sull’assenza di sidebar e tema riguardava l’unità 3 non ancora dispatchata ed è stato superato completando quell’unità; per l’unità 3 entrambi i reviewer hanno prodotto zero rilievi.

## Collaudo

L’app è stata provata in Chrome con server su `127.0.0.1:47300`, web su `http://localhost:5173/` e dati in `.dati-dev`. Dopo un primo blocco dovuto all’estensione non connessa, il ricollaudo ha verificato sidebar, navigazione, tema persistente, badge e conferma inline in chiaro e scuro.

Il movimento di prova è stato creato e rimosso durante il collaudo; nessun dato reale è stato toccato. Il click errato su un link della sidebar è stato attribuito al tool di automazione durante uno spostamento di layout, non all’applicazione.

## Da preservare

I font devono restare inclusi nel bundle e il tema deve continuare a essere persistito senza dipendenze CDN. I componenti condivisi vanno riusati nei giri successivi, senza duplicare i pattern nelle pagine.

Il `Dialogo` non va considerato completato finché non sarà integrato nelle pagine che richiedono conferme con contenuti o campi modificabili. Il materiale in `fasi/fase-5-design/design/` resta riferimento visivo e di interazione, non codice React da importare.
