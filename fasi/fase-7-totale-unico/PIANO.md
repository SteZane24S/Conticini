# Fase 7 — Totale unico, conti segnati, rettifiche e àncore

Obiettivo: smettere di dividere il denaro per conto. Movimenti, spese fisse, occorrenze, stipendi e
saldamenti dei debiti non hanno più un conto; tutti i calcoli — saldo, prospetto, categorie,
grafici, totale netto dei debiti — lavorano sul **totale**. I conti restano come **saldi segnati**,
che l'utente aggiorna con una **Rettifica** guardando la propria banca, e il confronto fra la somma
dei saldi segnati e il totale calcolato dice se qualcosa manca.

Pianificata il 25/09/2026 (Opus 5, revisione del piano di progetto) con l'utente e con
`tech-advisor` (`gpt-6-astra` `high`, thread `01a0d91f-a121-7992-aaeb-6061d06aada7`). Le decisioni
qui sotto sono **congelate**: non si rimettono in discussione durante i giri. Viene dopo la fase 6
e prima della fase 8 (mobile), perché portare sul telefono un modello che sta per cambiare
significherebbe rifare il lavoro due volte.

## Perché

Registrare per ogni spesa il conto da cui è uscita si è rivelato ingestibile nell'uso reale: con
carta, contanti e più conti, tenere allineati a mano i saldi di ciascuno richiede una disciplina
che l'utente non vuole e non riesce a mantenere. Ciò che conta per le decisioni — quanto resta al
prossimo stipendio, quanto si spende per categoria — dipende solo dal totale.

## Requisiti congelati

1. **Nessun conto** su movimenti, spese fisse, occorrenze, stipendi e saldamenti dei debiti. I dati
   storici **conservano** il loro `account_id`: non si cancella e non si riscrive niente.
2. **La Rettifica aggiorna solo il saldo segnato del conto e non tocca il totale.** Le spese
   registrate hanno già ridotto il totale: se la rettifica lo spostasse, le conterebbe due volte.
3. **Scarto** = Σ saldi segnati − totale calcolato. Si mostra nel Prospetto e nella pagina Conti.
   È normale che sia diverso da zero finché non si sono rettificati tutti i conti; se resta diverso
   da zero anche dopo, c'è un movimento non registrato.
4. **«Allinea il totale»** porta il totale a coincidere con la somma dei conti segnati, ed è
   un'**àncora**, non un movimento. Resta **fuori dai consumi**: entra nel saldo e nel prospetto,
   non in spese per categoria, previsto/speso, report entrate/uscite.
5. **Trasferimenti eliminati.** Nessuna creazione, modifica o cancellazione; quelli passati restano
   visibili in storico, in sola lettura. Per spostare soldi fra conti si rettificano i due conti.

### Perché l'àncora e non un movimento di correzione

Era sul tavolo anche la strada più semplice: un movimento tecnico con importo fisso pari allo
scarto al momento del click. Il consulente l'ha scartata, e l'utente con lui, con questo esempio:
scarto −30, «Allinea», e il giorno dopo ci si ricorda che era una pizza e la si registra con la sua
data vera. Con l'importo fisso il totale scende di altri 30: la stessa spesa conta due volte. Lo
stesso accadrà nella fase 8 quando il PC acquisirà in ritardo un movimento fatto dal telefono.
Nessuna guardia sulla sincronizzazione lo risolve, perché non chiude il passato: una spesa
retrodatata si può sempre inserire domani. L'àncora invece dice «a quella data il totale era X», e
un movimento tardivo anteriore entra nella sua categoria senza spostare di nuovo il totale.

## Il modello

### Saldo segnato del conto

Il saldo segnato del conto k alla data D è:

- l'**ultima lettura** di k con data ≤ D, se esiste;
- altrimenti il **valore storico**: saldo iniziale di k + Σ movimenti con `account_id = k` e data
  ≤ D.

Poiché i movimenti nuovi hanno `account_id` NULL, il valore storico resta fermo al giorno della
migrazione. È la lettura iniziale implicita di ogni conto: la migrazione **non genera righe**, e
subito dopo la migrazione lo scarto è 0 a ogni data, passata e presente.

Regole delle letture:

- una sola lettura per conto e per data; una seconda rettifica nello stesso giorno aggiorna la
  prima (nuova revisione, non una seconda riga);
- la data è predefinita a oggi, modificabile, mai oltre oggi e mai prima dell'apertura del conto;
- si può annullare l'ultima lettura di un conto (tombstone).

### Totale

Senza àncore, come oggi: **Σ saldi iniziali dei conti aperti entro D + Σ movimenti con data ≤ D**,
compresi quelli con `account_id` NULL e compresi i trasferimenti storici, che si annullano.

Un'àncora è una terna **(t, X, C)**:

- **t** è la data dell'allineamento, sempre **oggi** al momento del click;
- **X** è Σ saldi segnati a t, **conservato** e mai ricalcolato dalle letture successive;
- **C** è l'insieme degli id dei movimenti datati t che esistono al momento del click.

Per D ≥ t, presa l'**ultima àncora valida con t ≤ D**:

```
totale(D) = X
          + Σ movimenti con t < data ≤ D
          + Σ movimenti con data = t e id ∉ C
          + Σ saldi iniziali dei conti aperti in (t, D]
```

Per D < t della prima àncora vale la formula senza àncore. Un'àncora successiva non modifica i
saldi delle date precedenti.

C risolve il confine della giornata, che il consulente ha segnalato come indispensabile: se si
allinea alle 10 e si registra un pranzo datato oggi alle 15, il pranzo non è in C e abbassa il
totale normalmente. Un movimento datato oggi che esisteva già al click è invece dentro X.

Regole delle àncore:

- «Allinea» si fa solo con t = oggi; una sola àncora per giorno, e un secondo click nello stesso
  giorno la aggiorna (nuova revisione, X e C ricalcolati);
- si annulla solo l'**ultima** àncora, con un tombstone;
- X e C si calcolano **dentro la transazione** che scrive l'àncora;
- un conto nuovo deve avere la data di apertura **successiva** all'ultima àncora, altrimenti il suo
  saldo iniziale sarebbe assorbito da un X che non lo conteneva;
- un conto si archivia solo con saldo segnato 0.

### Conseguenze da conoscere, non difetti

- Un movimento con data ≤ t registrato, modificato o cancellato **dopo** l'àncora cambia categorie,
  budget e grafici delle spese, ma **non il totale**. È il comportamento voluto: il totale a quella
  data era già stato attestato dai saldi reali.
- Il test di accettazione della 1.2 «pagare una fissa all'importo e alla data previsti non cambia
  la proiezione» resta valido, **tranne** quando si registra in ritardo un pagamento già assorbito
  da un'àncora. Lì il saldo non scende ma l'impegno sparisce, quindi la proiezione migliora: è la
  correzione di una previsione fatta con informazioni incomplete. Lo stesso vale per il residuo di
  un budget. Va scritto nel test, come caso a sé, non promesso.
- La formula del prospetto non cambia: cambia soltanto la funzione del saldo, che resta **una sola
  funzione pura** in `packages/dominio`, usata dal prospetto, dal grafico del saldo giornaliero e
  dal totale netto dei debiti. La fase 8 la riusa identica sul telefono.
- Le àncore non sono movimenti: restano fuori dalle aggregazioni dei consumi senza regole nuove.

## Giri

### 7.1 — Dominio

Solo `packages/dominio`, test fitti.

- `packages/dominio/src/saldi.ts`: `saldiPerConto` e `saldoA` si sostituiscono con saldo segnato
  (con ripiego sul valore storico), totale con àncore e insieme C, scarto. `contoId` di
  `Movimento` diventa nullable. Tipi nuovi per lettura e àncora.
- `packages/dominio/src/prospetto.ts`: usa la nuova funzione del totale; espone i saldi segnati con
  la data della lettura da cui vengono (o l'indicazione «storico») e lo scarto.
- `packages/dominio/src/validazioni.ts`: via il divieto «movimento anteriore all'apertura del
  conto» per i movimenti senza conto; nuove validazioni per data di apertura dopo l'ultima àncora,
  archiviazione solo a saldo segnato 0, data della lettura non futura e non anteriore
  all'apertura.
- Totale netto dei debiti calcolato sul totale.
- Interfacce asincrone dei repository in `repository.ts` per letture e àncore.

**Accettazione.** Oltre ai gate di progetto, test espliciti con gli esempi concordati in chat:

- Banca 1.000, Contanti 100, spese per 150 senza conto → totale 950, somma segnati 1.100, scarto
  +150; rettifica Banca a 880 → totale 950, scarto +30; rettifica Contanti a 70 → scarto 0;
- scarto −30, àncora, poi una spesa di 30 datata prima dell'àncora → totale invariato, la categoria
  sale di 30;
- àncora oggi, poi un movimento di −15 datato oggi e creato dopo → totale −15;
- D anteriore alla prima àncora → stesso risultato della formula senza àncore;
- dati senza letture e senza àncore → scarto 0 a ogni D e totale identico a quello di oggi;
- due àncore successive: a una D fra le due vale la prima;
- conto aperto dopo l'àncora → il suo saldo iniziale entra nel totale;
- il caso limite della fissa pagata in ritardo e già assorbita, scritto come test a sé.

### 7.2 — Migrazione 003 e API senza conto

- **Runner delle migrazioni** (`packages/server/src/migrations-runner.ts:41`). Oggi ogni file gira
  in una transazione con `foreign_keys=ON`, e dentro una transazione il pragma non si può cambiare.
  Serve un marcatore in testa al file per le migrazioni che ricostruiscono tabelle. Per quelle il
  runner imposta `foreign_keys=OFF` **fuori** dalla transazione, esegue il file, controlla con
  `PRAGMA foreign_key_check` (errore → rollback) e riporta `foreign_keys=ON`.
- **Backup automatico prima di applicare migrazioni pendenti**, con l'API di backup di
  better-sqlite3 (mai copia del `.db` aperto), nella cartella dei backup esistente. La 003 girerà
  sui dati reali di `app/dati/` al primo avvio dopo il rilascio: deve esistere una copia di prima.
- **Migrazione 003**:
  - ricostruisce `transactions`, `recurring_expenses` e `recurring_occurrences` con `account_id`
    nullable, seguendo la procedura ufficiale di SQLite in 12 passi (tabella nuova, copia, drop,
    rename, indici e trigger ricreati);
  - crea `account_readings` (conto, data, saldo in centesimi) e `total_anchors` (data, totale in
    centesimi), più `total_anchor_covered_transactions` (àncora, movimento) per l'insieme C. Tutte
    hanno le sei colonne di sincronizzazione; C sta in una tabella figlia e non in un JSON, perché
    le righe della fase 8 devono restare immutabili e confrontabili.
- `contoId` sparisce da contratti, repository e route di movimenti, spese fisse, occorrenze e
  catch-up, stipendi, saldamenti (`packages/server/src/repositories/posizioni.ts:205-280`). I
  movimenti automatici del catch-up e quelli delle conferme nascono senza conto.
- Trasferimenti: via creazione, modifica e cancellazione (API e repository); restano elenco e
  lettura. I due movimenti di un trasferimento storico restano protetti come oggi.

**Accettazione.** Gate verdi, e un test di migrazione su un DB popolato con conti, trasferimenti,
fisse, cicli, occorrenze e posizioni: il totale a più date e il saldo per conto sono **identici
prima e dopo** la 003. `PRAGMA foreign_key_check` è vuoto. Esiste il backup pre-migrazione. Un
movimento nuovo si crea senza conto; una richiesta con `contoId` sui percorsi ordinari non lo
salva.

### 7.3 — API di rettifiche, àncore, prospetto, export

- Rettifiche: creare o aggiornare la lettura di un conto a una data, elencare le letture di un
  conto, annullare l'ultima.
- Àncore: «Allinea» (calcolo di X e C dentro la transazione), elencare, annullare l'ultima.
- Conti: validazioni di apertura dopo l'ultima àncora e di archiviazione solo a saldo segnato 0.
- Prospetto (`GET /api/prospetto`): saldi segnati con la loro data, somma, scarto; totale sulla
  nuova funzione. Grafico del saldo giornaliero sulla stessa funzione.
- Totale netto dei debiti sul totale.
- Export CSV: via la colonna Conto.
- Export JSON: aggiunge posizioni, letture, àncore e insiemi C. **Oggi l'export JSON omette
  `debt_credit_positions`** (elenco fisso in `packages/server/src/routes/export.ts:79-114`): è un
  difetto trovato dal consulente, e questo giro lo corregge.

**Accettazione.** Gate verdi; test API degli esempi della 7.1 via `fastify.inject`; export JSON che
contiene tutte le tabelle, verificato contro l'elenco delle tabelle del DB.

### 7.4 — Interfaccia senza conto

- Spariscono selettori e colonne del conto in: Movimenti (inserimento rapido, elenco e filtri),
  Spese fisse, In attesa (conferma), Stipendio, saldamento di Debiti e crediti.
- Pagina Conti: via la sezione Trasferimenti. Nell'elenco movimenti i trasferimenti storici restano
  visibili, marcati come tali e senza azioni.
- Nel linguaggio visivo della fase 5, con i componenti condivisi di `packages/web/src/components/`.

**Accettazione.** Gate verdi e `live-testing`: inserire una spesa, una fissa, uno stipendio e un
saldamento senza che venga chiesto un conto; il totale scende dell'importo esatto; i trasferimenti
storici si vedono e non si modificano.

### 7.5 — Conti e Prospetto; chiusura della fase

- Pagina Conti:
  - una card per conto con saldo segnato e data della lettura («storico» se non ce n'è);
  - dialogo **Rettifica** (nuovo saldo, data predefinita oggi) e storico delle letture con
    «annulla ultima»;
  - in cima somma dei conti segnati, totale calcolato e scarto;
  - pulsante **«Allinea il totale»**, attivo solo con scarto diverso da zero e con una frase che
    spiega cosa fa;
  - elenco delle àncore con «annulla ultima».
- Prospetto: le card per conto mostrano il saldo segnato con la sua data; una riga mostra lo
  scarto.
- **Rilascio** in `app/programma` con `npm run release` (`app/dati/` non si tocca). Prima si prova
  su `.dati-dev` che il backup pre-migrazione nasca e che la 003 si applichi.

**Accettazione.** Gate verdi e `live-testing` in tema chiaro e scuro, rifacendo in interfaccia gli
esempi della 7.1: due conti, spese senza conto, due rettifiche fino a scarto 0; poi una spesa non
registrata, «Allinea», la spesa inserita retrodatata con totale invariato, un pranzo di oggi con
totale che scende. Chiude la fase.

## Cosa non si fa in questa fase

- Nessuna attribuzione, nemmeno facoltativa, di un movimento a un conto.
- Nessuna azione «sposta fra conti»: l'utente l'ha scartata, si rettificano i due conti.
- Nessuna àncora a una data diversa da oggi.
- Nessuna rettifica o àncora dal telefono (fase 8).
