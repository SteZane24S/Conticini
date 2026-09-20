# Guida di sviluppo

## Rilascio

Il rilascio separa il programma dai dati: tutto ciò che serve all’applicazione viene prodotto in `Conticini/app/programma/`, mentre `Conticini/app/dati/` non viene mai toccato. Il server viene bundlato in ESM con esbuild; `better-sqlite3` resta l’unico pacchetto nativo e le migrazioni vengono copiate separatamente.

Il launcher usa il database reale solo tramite `CONTICINI_DATA_DIR=app\\dati`, controlla Node ≥24, attende la risposta del server e apre Edge o Chrome in modalità app. Se l’istanza è già attiva, evita una seconda finestra e tenta di riportare in primo piano quella esistente.

Il collegamento Desktop è opzionale (`npm run release -- --collegamento`) e viene creato sul Desktop reale dell’utente con `TargetPath`, `IconLocation` e `WorkingDirectory` coerenti con il programma rilasciato.

## Correzioni emerse dal collaudo

Il bundle ESM richiede un `require` reale per la dipendenza CommonJS `@fastify/static`; il banner esbuild con `createRequire(import.meta.url)` evita il crash su `node:path` all’avvio.

Il controllo di salute usa `WinHttp.WinHttpRequest.5.1`, verificato ripetutamente sia con porta libera sia con server attivo. In VBScript lo stato viene letto solo dentro un `If` successivo alla verifica dell’esito di `Send()`, perché `And` non è short-circuit.

## Review e collaudo

Il bug-hunter ha prodotto zero rilievi e ha verificato bundle, percorsi runtime, sicurezza della pulizia, packaging nativo e template VBScript. Il rilievo di conformity sull’ordine alfabetico di `esbuild` in `package.json` è stato confermato dal checker, corretto e riverificato; non sono stati scartati rilievi né lasciati rilievi fondati fuori scope.

Il collaudo reale ha verificato apertura dall’icona, database in `app/dati/conticini.db`, assenza di una seconda finestra, spegnimento dopo circa 9,5 minuti di inattività e collegamento Desktop corretto. Il giro non tocca `packages/web`, quindi non è stato usato `live-testing`.

## Da preservare

Il rilascio deve restare confinato a `app/programma/` e non deve leggere o scrivere `app/dati/` durante la preparazione dei file. L’icona attuale è intenzionalmente un segnaposto: va sostituita quando sarà disponibile il design della Fase 5.
