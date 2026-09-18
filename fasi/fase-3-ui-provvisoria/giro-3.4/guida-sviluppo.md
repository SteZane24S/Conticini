# Fase 3, giro 3.4 — perché queste scelte

## Previsioni e prospetto
Le due pagine separano la gestione dei budget dalla lettura del prospetto. Riutilizzano gli hook esistenti e mantengono la logica di accesso ai dati nei rispettivi `dati.ts`, così la UI resta coerente con i giri precedenti.

## Arricchimento delle spese fisse
Il prospetto può includere occorrenze già pagate dopo la data selezionata. Per questo il client richiede esplicitamente tutte le occorrenze; la richiesta predefinita continua a restituire solo quelle pending, preservando il comportamento precedente.

## Rilievi e collaudo
Il bottone Annulla dei form inline è disabilitato durante il salvataggio per evitare un’azione concorrente ambigua. Il collaudo completo in Chrome ha verificato la formula del saldo previsto, i casi senza saldo calcolabile e l’invarianza dopo la conferma di un arretrato; non sono rimasti difetti.

## Cosa non toccare
Il comportamento di `saldiPerConto` che esclude i conti aperti dopo la data selezionata è una regola di dominio preesistente e verificata durante il collaudo. Il catch-up delle occorrenze retroattive resta un limite noto del server: non va modificato in questo giro UI.
