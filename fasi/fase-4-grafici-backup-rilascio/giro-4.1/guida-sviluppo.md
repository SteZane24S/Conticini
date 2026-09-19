# Guida di sviluppo

## Aggregazioni nel dominio

I repository esistenti espongono solo `elenca()`, senza filtri lato database. Per questo le aggregazioni per settore e categoria, per giorno e per ciclo sono funzioni pure in `packages/dominio/src/aggregazioni.ts`: ricevono gli array completi e calcolano in memoria. La scelta segue lo stesso pattern già usato da `prospetto.ts`, mantiene il confine per cui il dominio non tocca mai il database e rende i calcoli riusabili in futuro nel browser, nella fase mobile.

## Intervalli e periodi

L'intervallo di un ciclo usa una `dataFineEsclusiva`. Le richieste HTTP che rappresentano un periodo usano invece una `dataFine` inclusiva; la rotta server la converte aggiungendo un giorno prima di chiamare il dominio. Così la funzione di dominio resta simmetrica con l'intervallo esclusivo che deriva naturalmente dal confronto fra due cicli consecutivi.

## Previsto e speso

Il grafico previsto/speso esiste solo in modalità «ciclo». Un budget, cioè una previsione di spesa, è definito per ciclo di stipendio e non ha un significato per un intervallo di date arbitrario.

## Review

Un refine doveva validare che fosse presente esattamente uno tra `cicloId` e la coppia `dataInizio`/`dataFine`. La validazione lasciava però passare combinazioni parziali, come `cicloId` insieme a una sola data, e non controllava l'ordine delle date. Il rilievo è stato corretto riscrivendo la validazione in tre controlli distinti e più leggibili.

Durante la review è stato proposto di aggiungere `ricarica()` a ciascun hook della pagina Grafici, per coerenza con gli altri hook dati del progetto, che la espongono per consentire un refetch manuale dopo un salvataggio. Il rilievo è stato scartato: la pagina Grafici non contiene azioni di scrittura, è un cruscotto di sola lettura, e React Router la smonta e rimonta a ogni cambio di rotta, fornendo dati freschi ogni volta che vi si torna.

## Da preservare

La logica di esclusione dei trasferimenti dalle aggregazioni (`transferGroupId === null`) è un requisito esplicito del piano di progetto, non un dettaglio implementativo. Non va rimossa né resa opzionale in un giro futuro senza una decisione esplicita.
