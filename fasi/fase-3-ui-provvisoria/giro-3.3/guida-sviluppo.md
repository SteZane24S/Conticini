# Fase 3, giro 3.3 — perché queste scelte

## Tre unità separate
Il giro è stato diviso per proprietà dei file in tre unità: Stipendio, Spese fisse e In attesa. Le pagine riusano gli hook già presenti per conti e albero categorie e mantengono la logica API nei rispettivi file `dati.ts`.

## Form legati all'entità corrente
I form di previsione dello stipendio e di modifica della spesa fissa ricevono una `key` basata sull'id dell'entità. Se la registrazione o la navigazione cambia il ciclo o la spesa visualizzata, React ricrea il form e non conserva dati stantii dell'entità precedente.

## Stipendio e spese fisse
La pagina Stipendio registra il movimento e conserva lo storico dei cicli, consentendo di modificare la previsione del ciclo aperto. Gli errori di caricamento di conti e categorie vengono mostrati nella sezione di registrazione. La pagina Spese fisse costruisce la regola discriminata mensile, ogni N mesi o annuale coerente con lo schema zod; il vincolo fra categoria con previsione e spesa fissa attiva resta validato dal server e mostrato come errore generale.

## In attesa e collegamento
La pagina separa le occorrenze scadute da quelle prossime e offre Conferma, Salta e collegamento a un movimento esistente. La ricerca client-side è filtrata per conto e finestra di sette giorni, poi ordinata per vicinanza dell'importo. L'arricchimento col nome della spesa fissa resta nell'hook perché l'API delle occorrenze non lo espone.

## Contatore del menu e concorrenza
Il contatore pending è mantenuto in un hook separato. La dipendenza dal pathname aggiorna il valore durante la navigazione; un evento DOM globale lo aggiorna anche dopo una mutazione eseguita nella pagina In attesa, senza introdurre stato condiviso fra gli hook. Le risposte di ricerca e conteggio sono protette contro staleness e arrivo fuori ordine tramite riferimenti e token incrementali.

## Rilievi confermati e corretti
Le review hanno confermato due rilievi nell'Unità 1, uno nell'Unità 2 e quattro nell'Unità 3: form con stato stantio, errori di fetch non esposti, helper `Campo` non conforme al pattern, race/staleness nella ricerca, chiamata API nel componente, contatore non aggiornato durante la sessione ed errore del conteggio indistinguibile da zero. Tutti sono stati corretti. Un bug-hunter mirato ha inoltre rilevato e fatto correggere la mancata deduplicazione delle risposte concorrenti del conteggio.

## Collaudo in Chrome
Il primo collaudo ha verificato Stipendio e Spese fisse e ha confermato il limite noto del catch-up retroattivo, sbloccato per il test con il riavvio del server. Il secondo ha verificato le azioni della pagina In attesa e ha trovato il mancato aggiornamento immediato del contatore. Dopo l'evento di mutazione e la correzione del token di richiesta, il terzo collaudo ha confermato la discesa immediata del contatore dopo Salta e Conferma.

## Debiti accettati
- Il catch-up delle occorrenze retroattive non parte alla creazione o modifica runtime di una spesa fissa: resta una pendenza architetturale fuori scope, da valutare in un giro che tocchi il server.
- I componenti React introdotti in questo giro non hanno test unitari propri; il pacchetto web conserva i 5 test preesistenti. La copertura è coerente con la fase UI provvisoria.
- La pool Codex esaurita ha richiesto ricadute su Sonnet in parte dell'Unità 3 e durante il collaudo; il fatto va considerato nel confronto dei consumi fra giri.
