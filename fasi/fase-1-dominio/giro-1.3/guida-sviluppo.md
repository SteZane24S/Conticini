# Guida di sviluppo — giro 1.3

## Decisioni
- La normalizzazione comune rende confrontabili descrizioni e pattern indipendentemente da maiuscole, diacritici e spaziature.
- Le regole attive precedono lo storico; tra le regole prevalgono priorità, lunghezza del pattern e recenza, nell'ordine definito dal brief.
- I repository espongono solo contratti asincroni e `ServizioApprendimento` incapsula le funzioni pure già definite nel dominio.

## Correzioni da review
- Il limite non positivo dei suggerimenti è gestito esplicitamente; aggiunti i casi `0` e `-1` nei test.
- Gli import di `repository.ts` usano la forma inline coerente con il resto del pacchetto; la formattazione è stata rieseguita.
- Non sono emersi rilievi infondati o fuori scope.

## Da non toccare
- Il confine del pacchetto dominio e le interfacce asincrone vanno preservati: il dominio non importa infrastruttura o concetti HTTP.
- La progettazione di catch-up, backup ed export non va anticipata in questo giro: motivazione desumibile dalla decisione di scope fornita; è rimandata alla fase 2.

## Dove è facile sbagliare
- Un limite negativo passato a `slice` non produce una lista vuota; la guardia esplicita è parte del comportamento atteso.
- Le regole devono ignorare elementi inattivi o cancellati e il suggerimento di categoria deve consultare prima le regole, poi lo storico.

