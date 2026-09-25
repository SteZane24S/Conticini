# Fase 6 — Debiti e crediti

Obiettivo: una pagina per tenere il conto dei soldi prestati e dei soldi presi in prestito, con la
possibilità di saldarli in tutto o in parte. Funzione volutamente minima: niente interessi, niente
rate programmate, niente promemoria, niente scadenze.

Pianificata il 20/09/2026 (Opus 5, apertura di fase) con l'utente e con `tech-advisor`
(`gpt-6-astra` `high`, thread `01a0c0be-b7cd-7871-a0dc-c118d5463142`). Le decisioni qui sotto sono
**congelate**: non si rimettono in discussione durante i giri.

## Requisiti congelati

- Una **posizione** ha: descrizione libera (contiene il nome della persona), importo iniziale,
  verso (`debito` = devo dei soldi a qualcuno, `credito` = qualcuno deve dei soldi a me) e data di
  apertura, assegnata automaticamente alla creazione. Nient'altro: nessuna scadenza, nessuna nota.
- **Saldare muove davvero il denaro.** L'utente sceglie il conto e l'importo (tutto il residuo o
  una parte) e il movimento nasce insieme all'aggiornamento della posizione, in un'unica
  transazione.
- **Il totale netto vive solo nella pagina Debiti e crediti.** Il Prospetto resta esattamente
  com'è, e in particolare la formula del saldo previsto al prossimo stipendio **non si tocca**.
- **Creare una posizione non genera nessun movimento.** Dichiara un'obbligazione; se il denaro si è
  già mosso, quel movimento è stato registrato per conto suo come movimento ordinario.

## Modello dati

### Posizioni

Nuova tabella con le stesse sei colonne di sincronizzazione di tutte le altre (`id`, `created_at`,
`updated_at`, `deleted_at`, `revision`, `base_revision`), più: descrizione, verso, importo iniziale
in centesimi, data di apertura `YYYY-MM-DD`.

L'importo iniziale si conserva **con segno**, coerente con la convenzione di tutto il progetto:
negativo per un debito, positivo per un credito. Il verso resta comunque una colonna esplicita,
perché è ciò che l'utente sceglie e vedere il segno derivarne rende il codice verificabile a
occhio.

### Collegamento con i movimenti

Nuova colonna nullable su `transactions` che punta alla posizione. È nulla per tutti i movimenti
ordinari; valorizzata solo sui **saldamenti**.

**Il residuo non è una colonna.** Si deriva:

```
residuo_con_segno = importo_iniziale_con_segno − Σ importi dei movimenti collegati
```

I pagamenti di un debito sono importi negativi, gli incassi di un credito positivi. Lo stato
"saldata" e l'importo residuo sono quindi **calcolati**, mai scritti: è questa la ragione per cui
non possono divergere dal denaro realmente mosso. Un campo `stato` aggiornato a mano sarebbe
esattamente il difetto che questo modello esiste per evitare.

### Le due categorie tecniche

Un movimento deve avere una categoria coerente col proprio segno, e la categoria nulla è riservata
alle due gambe di un trasferimento: allargare quell'eccezione toccherebbe un'invariante congelata
in `PIANO.md`. Si introducono quindi due categorie riservate al sistema:

- **Pagamento debiti**, tipo `uscita`;
- **Incasso crediti**, tipo `entrata`.

Vincoli su di esse:

- si riconoscono da un **identificatore strutturale stabile** (id deterministico), mai
  confrontando il nome;
- non sono selezionabili dall'utente nei movimenti ordinari, nelle regole di categoria, nelle spese
  fisse e nelle previsioni, e il divieto è imposto **anche dal server**, non solo nascondendole
  nell'interfaccia;
- non si eliminano e non si rinominano dalla pagina Categorie e regole.

### Cosa entra e cosa non entra nei numeri esistenti

I saldamenti sono denaro uscito o entrato davvero, quindi:

| Grandezza | I saldamenti… |
|---|---|
| Saldo dei conti, saldo a `D`, saldo per conto | **entrano**, come qualsiasi movimento |
| Grafico del saldo giornaliero | **entra** |
| Spese per settore e categoria | **esclusi** |
| Previsto vs speso | **esclusi** |
| Report e totali entrate/uscite | **esclusi** |
| Formula del saldo previsto al prossimo stipendio | non cambia: le posizioni aperte non vi compaiono, e il saldamento vi entra solo attraverso il movimento, per la via che esiste già |

L'esclusione dai consumi si fa **sul collegamento alla posizione**, che è un criterio strutturale,
non sulla categoria: la categoria tecnica da sola non basterebbe, perché le aggregazioni odierne
escludono i trasferimenti ma conterebbero questi movimenti.

Restituire un prestito non è una spesa di consumo: se finisse nella spesa per categoria e nel
previsto/speso, falserebbe numeri di cui l'utente si fida.

### Perché i debiti aperti restano fuori dalla previsione

Una posizione non ha scadenza. Sottrarre un debito aperto al saldo previsto al prossimo stipendio
significherebbe dare per scontato che venga pagato entro quella data, e aggiungere un credito
significherebbe presumere di incassarlo: entrambe sono ipotesi temporali che i dati non
contengono. Quando il saldamento avviene, il movimento entra nel saldo e quindi nella previsione
attraverso il percorso esistente, senza nessuna regola nuova.

## Protezioni

- I movimenti di saldamento **non si modificano e non si cancellano** dalle vie generiche dei
  movimenti: si rifiutano con un errore dedicato, esattamente come già accade per i movimenti che
  appartengono a un trasferimento (`packages/server/src/repositories/movimenti.ts:310-316` e
  `:388-394`).
- L'annullamento di un saldamento si fa dalla pagina Debiti e crediti: cancella il movimento con
  tombstone e riapre il residuo, nella stessa transazione.
- Una posizione con saldamenti collegati non si elimina lasciandoli orfani.
- Dopo il primo saldamento, verso e importo iniziale non si modificano più; la descrizione sì.
- L'importo di un saldamento è positivo e non può superare il residuo, verificato **dentro la
  transazione** e non solo nell'interfaccia.
- Il comando di saldamento è **idempotente**: un doppio invio non produce due pagamenti parziali.

## Giri

### 6.1 — Modello, dominio e API

- Migrazione `002`: tabella delle posizioni, colonna di collegamento su `transactions`, inserimento
  delle due categorie tecniche con id deterministico.
- `packages/dominio`: tipi della posizione, calcolo del residuo e del totale netto, interfaccia
  asincrona del repository accanto alle altre in `repository.ts`.
- `packages/dominio/src/aggregazioni.ts`: esclusione dei saldamenti da spese per settore e da
  previsto/speso, con i test che lo dimostrano.
- `packages/contratti`: schemi zod di richieste e risposte.
- `packages/server`: repository e API. Il saldamento si modella su `confermaOccorrenza`
  (`packages/server/src/repositories/occorrenze.ts:160-248`), che già crea un movimento e aggiorna
  un'altra entità in un'unica transazione passando dal write-path centralizzato.
- Divieto lato server sull'uso delle categorie tecniche nelle vie ordinarie.

**Accettazione.** Oltre ai gate di progetto:

- conti 1.000 €, debito 200 € → totale netto 800 €; pagamento di 50 € → conti 950 €, residuo
  150 €, **totale netto ancora 800 €**, spesa per categoria invariata;
- lo stesso per un credito, con i segni scambiati;
- un saldamento superiore al residuo viene rifiutato;
- lo stesso comando di saldamento inviato due volte produce un solo movimento;
- annullare un saldamento riporta conto e residuo ai valori precedenti;
- un movimento di saldamento non si modifica né si cancella dall'API dei movimenti;
- una categoria tecnica non è assegnabile a un movimento ordinario, a una regola, a una spesa fissa
  o a una previsione.

### 6.2 — Pagina Debiti e crediti

- Voce di menu e pagina, nel linguaggio visivo della fase 5 (componenti condivisi in
  `packages/web/src/components/`, token e stili già esistenti).
- Elenco delle posizioni con importo iniziale, residuo e stato; distinzione visibile fra debiti e
  crediti; le posizioni saldate non spariscono ma si distinguono.
- Form di creazione: descrizione, importo, selettore debito/credito.
- Azione «salda»: scelta del conto, importo preimpostato al residuo e modificabile, data.
  **Nota del 25/09/2026:** il selettore del conto è temporaneo. La fase 7 elimina il conto dai
  saldamenti (giro 7.2 per l'API, 7.4 per l'interfaccia); qui si costruisce comunque, perché l'API
  del 6.1 lo richiede e la fase 6 si chiude nell'ordine previsto.
- Annullamento di un saldamento.
- In cima alla pagina il **totale netto** con le tre componenti leggibili: soldi sui conti, crediti
  da incassare, debiti da pagare. Etichettato come riferito a oggi.

**Accettazione.** Gate verdi e `live-testing`: creare un debito, saldarlo in parte, verificare a
occhio che il saldo del conto cali dell'importo esatto e che il totale netto non si muova;
controllare che nei Grafici la spesa per categoria non contenga il saldamento; ripetere in tema
chiaro e scuro.

## Cosa non si fa in questa fase

- Nessuna previsione, nessun promemoria, nessuna scadenza.
- Nessun collegamento di un movimento già esistente a una posizione: si valuterà se servirà davvero
  dopo qualche settimana d'uso.
- Nessuna presenza nella versione mobile, se non in sola lettura: deciso il 25/09/2026, la pagina
  compare sul telefono in sola lettura nella fase 8 (ex fase 7).
