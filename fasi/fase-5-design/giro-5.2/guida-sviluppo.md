# Guida di sviluppo

## Restyling di Prospetto e Movimenti

Il giro applica il design system Modernist alle due pagine più dense di dati dell'app, riusando i componenti condivisi creati nel giro 5.1 (`Bottone`, `Campo`, `ControlloSegmentato`, `Etichetta`, `Tabella`). Restyling puro: nessuna modifica a hook, chiamate API o logica di dominio.

Il Prospetto adotta l'intestazione con selettore data, il riquadro del saldo previsto al prossimo stipendio (con avviso quando la data non è nota), le card di saldo totale e per conto, l'elenco delle spese fisse con badge "arretrata" e la tabella previsioni con barra di avanzamento.

Movimenti adotta la barra di inserimento rapido con `ControlloSegmentato` per Entrata/Uscita, l'autocompletamento della descrizione e il form "+ nuova categoria"; la riga filtri, la riga totali, la modifica inline e l'eliminazione con conferma inline restano quelle esistenti. Il filtro "Periodo" mostrato nel prototipo di design non è stato introdotto: richiede una logica non prevista dal brief di questo giro.

## Ricaduta su Sonnet e incidente Codex

I due implementer su Codex sono andati in timeout due volte ciascuno, senza produrre codice; le due unità sono state implementate direttamente dall'orchestratore nel contesto principale, seguendo gli stessi brief già scritti per Codex.

La review `conformity` è andata in timeout per due tentativi consecutivi. L'indagine dell'orchestratore ha trovato un processo `codex` orfano vivo da 3 giorni, con 534 thread e 2,67 GB di working set: probabile causa del degrado. I processi orfani sono stati terminati su conferma dell'utente, ma il server MCP Codex è rimasto disconnesso per il resto della sessione. La review di conformità è stata quindi svolta manualmente dall'orchestratore, verificando assenza di colori/dimensioni hard-coded, coerenza d'uso dei componenti condivisi e preservazione degli id dei campi: nessun rilievo.

## Review e decisioni

Il `bug-hunter` (Claude Sonnet, sola lettura) è girato regolarmente e non ha prodotto rilievi.

## Collaudo

L'app è stata provata in Chrome, in due passate, con server su `127.0.0.1:47300`, web su `http://localhost:5173/` e dati in `.dati-dev`, in tema chiaro e scuro.

La prima passata ha trovato un difetto fondato: nelle card dei conti del Prospetto un saldo negativo non era colorato di rosso. Corretto applicando `var(--rosso)` all'importo negativo, sia sulla card "Saldo totale" sia sulle card dei singoli conti. La seconda passata, mirata, ha confermato la correzione in chiaro e scuro senza regressioni sui valori positivi né errori di console.

Un secondo difetto osservato — nel campo Importo dell'inserimento rapido, digitando l'intera stringa "1,50" in un colpo solo lo strumento ha letto "1,500,00" — è stato giudicato un falso positivo dello strumento di automazione: il campo è un input controllato puro, non toccato nella sua logica da questo giro, e digitando un carattere alla volta il comportamento è corretto. Coerente con un caso analogo già annotato nel registro del giro 4.2.

Un'osservazione non bloccante e non richiesta dal brief: impostando la data di riferimento del Prospetto prima della creazione di un conto, la card di quel conto scompare invece di mostrare 0,00€. Non toccata; potrebbe essere comportamento voluto del dominio, da valutare in un giro futuro che tocchi di nuovo quella logica.

## Da preservare

Il restyling di Prospetto e Movimenti non tocca hook, chiamate API né logica di dominio: qualunque modifica successiva a quelle pagine deve mantenere questa separazione. La colorazione rossa dei saldi negativi nelle card conti va mantenuta nei prossimi giri che tocchino il Prospetto.

Il filtro "Periodo" resta un'estensione non fatta: se un giro futuro lo introduce, serve prima definirne la logica (non è nel dominio attuale). Il comportamento delle card conto rispetto a date anteriori alla creazione del conto va chiarito prima di essere considerato un difetto.
