# Guida di sviluppo — dominio

## Perché questa strada

I quattro moduli restano indipendenti da Node, dalle API `Date` e dai fusi orari nella costruzione delle date. Una `DataISO` si costruisce sempre da componenti calendariali; `Date` è ammesso soltanto in `ultimoGiornoDelMese` per leggere il numero di giorni del mese, non per costruire una `DataISO`. Questo evita slittamenti legati a timezone e rende il dominio riusabile in futuro su mobile.

SHA-1 e UUIDv5 sono implementati in TypeScript puro perché il confine del pacchetto `dominio` vieta `node:crypto` e `crypto.subtle`; l'assenza di dipendenze dall'ambiente è una condizione del riuso futuro su mobile.

`formatImporto` non usa `Intl.NumberFormat` con `style: 'currency'`: il posizionamento di `€` può variare fra versioni ICU. Si formatta il numero e si aggiunge manualmente ` €`, con `useGrouping: true` esplicito perché il raggruppamento predefinito non è garantito.

## Rilievi e decisioni

La review ha rilevato un loop infinito in `occorrenzeTra` per `every_n_months` con `n` negativo, mai validato prima. `everyNMonths` ora richiede direttamente un intero positivo, così l'errore emerge fail-fast alla creazione della regola e non a ogni query. La stessa validazione copre `n = 0`.

Il ramo `if (idx < minIdx) continue` è stato rimosso: con `n` intero positivo è matematicamente irraggiungibile, come dimostrato in review. L'estrazione di anno/mese e la costruzione di una `DataISO` da anno, mese e giorno erano duplicate fra `date.ts` e `ricorrenze.ts`; sono state consolidate in `date.ts` (`annoDi`, `meseDi`, `costruisciData`) e riusate da `ricorrenze.ts`.

## Cosa non toccare

Non validare `n` dentro `occorrenzeTra` invece che in `everyNMonths`: si perderebbe il fail-fast alla creazione della regola. Non reintrodurre estrazioni o costruzioni di date locali in `ricorrenze.ts`; usare gli helper di `date.ts`. Non passare da `Date` per costruire una `DataISO`: l'unica eccezione interna è `ultimoGiornoDelMese`.
