# Fase 3, giro 3.2 — perché queste scelte

## Quattro unità con contratti condivisi
Il giro è stato eseguito su Codex (`gpt-5.6-terra`, effort medium) in quattro unità parallele: U1 ha curato dati e stili, U2 l'inserimento rapido, U3 l'elenco e U4 l'assemblaggio della pagina. I contratti di interfaccia sono stati fissati prima del dispatch, così le unità potevano scrivere senza condividere file.

## Hook condiviso e due superfici della pagina
`Movimenti.tsx` crea una sola istanza di `useMovimenti` e la passa a inserimento rapido ed elenco. In questo modo il salvataggio dall'inserimento rapido e le modifiche dall'elenco condividono caricamento, mutazioni e totali, senza duplicare lo stato fra le due superfici.

## Coerenza fra tipo e categoria
Una categoria suggerita o appena creata viene sincronizzata solo se il suo `kind` corrisponde al tipo corrente del movimento. Se il suggerimento è nullo o incoerente, `categoriaId` viene azzerato. La stessa regola vale dopo la creazione dal mini-form: una categoria di tipo diverso non viene riselezionata automaticamente. È una protezione del contratto entrata/uscita, non una perdita di funzionalità.

## Mini-form categoria e settore
La creazione di un settore può riuscire prima che la creazione della categoria fallisca. In quel caso il form passa a “settore esistente” e preseleziona il settore appena creato: il retry non tenta di duplicarlo. Il residuo di race condition se l'utente cambia tipo esattamente durante l'attesa di rete è stato valutato trascurabile per un'app locale mono-utente.

## Stato asincrono dell'inserimento
`contoId` viene risincronizzato quando i conti arrivano dopo il primo render e il select espone un placeholder vuoto. Così il form non fallisce con “Il conto è obbligatorio” quando il menu è stato valorizzato dal fetch ma l'utente non lo ha toccato. Dopo un salvataggio riuscito viene mostrato “Movimento salvato.”, anche quando i filtri attivi tengono il nuovo movimento fuori dall'elenco visibile.

## Filtri e operazioni per riga
Il cambio di settore azzera la categoria selezionata quando non appartiene più al settore scelto, evitando combinazioni impossibili con elenco vuoto e select apparentemente muta. Nell'elenco non è stato mantenuto un lock globale: il salvataggio usa `salvandoModifica` e la cancellazione `eliminandoId`, entrambi scoped all'azione/riga. Questo segue il pattern degli altri componenti e impedisce che una conferma su una riga venga ignorata perché un'altra è occupata.

## Rilievi confermati e corretti
Le review su U1+U2 hanno confermato cinque rilievi del bug-hunter e uno di conformity; quelli relativi a kind della categoria, errore parziale settore/categoria e stile inline sono stati corretti. Le review su U3+U4 hanno confermato due rilievi del bug-hunter e uno di conformity; sono stati corretti il lock globale e i relativi stati. Il bug-hunter finale ha confermato tre problemi di combinazione: conto asincrono, filtro settore/categoria e assenza del messaggio di conferma; tutti corretti.

## Collaudo in Chrome
Il primo collaudo ha trovato un difetto reale: la lista suggerimenti non aveva `top`, `left` e `right` espliciti e si sovrapponeva all'etichetta. Lo stile è stato corretto. La mancata riselezione di una categoria incompatibile è stata chiusa come comportamento voluto dalla regola di coerenza. Il sospetto di doppio click è stato escluso dopo sei ripetizioni: il reflow di circa 215 px causato dall'apertura del mini-form spiegava l'errore di coordinate dello strumento. Anche il sospetto sul tasto Invio è stato trattato come artefatto del retest, perché contraddetto dal primo collaudo e non supportato dal codice.

## Debiti accettati
- Offset pagination instabile se il dataset cambia mentre si scaricano più pagine: trascurabile nel modello locale mono-utente.
- Apertura di un'altra modifica che sovrascrive una modifica non salvata: debito UX minore coerente con la fase provvisoria.
- Race condition UI a bassissima probabilità durante la creazione asincrona di una categoria se cambia contemporaneamente il tipo del movimento.

Questi punti non richiedono un intervento nel giro 3.2 e restano espliciti per evitare correzioni incidentali future.
