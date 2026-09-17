# Guida di sviluppo — giro 0.3

## Perché questa strada

Il workspace web usa Vite come scaffold e mantiene il server come punto di accesso unico: in sviluppo il proxy inoltra `/api` al server locale, mentre in esecuzione il server serve `packages/web/dist`. Il fallback SPA consente la navigazione diretta alle rotte dell'interfaccia senza intercettare gli endpoint API.

La disponibilità della build web è verificata anche tramite `index.html`: se la directory non esiste o è incompleta, il server resta utilizzabile in modalità API-only; nel caso incompleto registra un avviso esplicito. Questa condizione non va rimossa, perché evita un errore di serving anonimo dopo una build interrotta.

Il guscio web separa entry point, routing, layout, heartbeat e pagine. Le dieci pagine sono volutamente solo segnaposto con titolo: il giro stabilisce la struttura e la navigazione, non la logica funzionale delle singole aree.

## Rilievi e decisioni

Gli import del server sono stati riallineati all'ordine convenzionale del progetto, con i moduli Node prima delle dipendenze esterne. La verifica della presenza di `index.html` è stata aggiunta in seguito alla review, insieme al log di avviso per una directory `dist` esistente ma incompleta.

Il heartbeat usa `POST /api/heartbeat` a intervalli di due minuti e viene eseguito dal guscio web. Il routing mantiene le dieci rotte nell'ordine delle voci di menu; il fallback SPA è necessario per supportare l'accesso diretto, ad esempio a `/movimenti`.

## Cosa non toccare

Non trasformare le pagine segnaposto in funzionalità di dominio in questo giro: il prossimo lavoro dichiarato è la Fase 1 sul dominio puro. Non rimuovere il ramo API-only, l'esclusione di `/api` dal fallback o il controllo di `index.html`, perché sono protezioni del confine fra asset web e API.

Non modificare il piano di progetto, `CLAUDE.md` o il lockfile per descrivere il giro. La convenzione di un commit per giro è stata disattesa solo proceduralmente in questo giro; non usare `git commit --amend` per ricomporre la storia senza una richiesta esplicita.
