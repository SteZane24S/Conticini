# Guida di sviluppo — giro 5.5

## Decisioni da conservare

- Previsioni calcola le due card riepilogative lato client dai dati già disponibili; non aggiungere chiamate API per questo scopo.
- Grafici conserva i tre grafici Recharts reali e la barra singola “Totale”: il mock SVG e la scomposizione per settore del prototipo non sono implementazioni adottate.
- Backup usa `Dialogo` per Ripristina; il dialogo si chiude solo dopo il successo dell'operazione e resta associato al file per cui è partita la richiesta.

## Riuso e convenzioni

- Le tre pagine usano il design system Modernist e i componenti condivisi già presenti (`Bottone`, `Campo`, `Scheda`, `Tabella`, `Dialogo`, `Etichetta`, `ControlloSegmentato`).
- Le modifiche hanno mantenuto invariati hook e chiamate API delle tre pagine; i riepiloghi di Previsioni riusano `categorieCiclo.previstoCents` e `expectedAmountCents`.
- Gli errori di ripristino sono mostrati anche nel `Dialogo`, mentre il bottone viene disabilitato se una richiesta per lo stesso backup è già in corso.

## Punto delicato per il futuro

- La validazione HTML nativa (`type="number"`, `min`, `required`) può bloccare il submit React prima che il gestore mostri l'errore applicativo; una correzione va valutata a livello sistemico dei form.
- Prima di avviare il collaudo verificare eventuali istanze di sviluppo già in ascolto, per evitare di collegarsi a processi orfani di giri precedenti.

## Limiti verificati

- Il campo Backup con valore non valido mostra il bordo rosso nativo ma non il messaggio applicativo; il limite era preesistente e non è stato corretto in questo giro.
- Il collaudo Chrome ha coperto Previsioni, Grafici e Backup nei temi chiaro e scuro; nessun errore di console o richiesta di rete fallita è stato osservato.
