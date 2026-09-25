# Fase 8 — Mobile e sincronizzazione

Obiettivo: usare Conticini dal telefono — oggi Android, domani eventualmente iOS — senza
applicazioni da installare dagli store e senza alcun backend da amministrare, con i dati allineati
fra PC e telefono.

Pianificata il 20/09/2026 (Opus 5, apertura di fase) con l'utente e con `tech-advisor`
(`gpt-6-astra` `xhigh`, thread `01a0c070-f949-7503-8544-94e5a454549c`). Sostituisce il segnaposto
scritto il 17/09/2026, di cui conferma quasi tutti i vincoli e corregge due punti, segnalati più
sotto. Le decisioni qui sotto sono **congelate**.

Questa fase si apre **dopo** le fasi 6 e 7: portare sul telefono un modello dati che sta per
cambiare significherebbe rifare il lavoro due volte.

## Revisione del 25/09/2026

Fino a quel giorno questa era la fase 7. È diventata la fase 8 quando l'utente ha deciso di
eliminare la suddivisione per conto (nuova fase 7, `fasi/fase-7-totale-unico/PIANO.md`). Tutte le
decisioni qui sotto restano valide, con queste correzioni, concordate con l'utente e con
`tech-advisor` (`gpt-6-astra` `high`, thread `01a0d91f-a121-7992-aaeb-6061d06aada7`):

- **Il modello che arriva sul telefono è quello della fase 7.** Movimenti senza conto, conti come
  saldi segnati con le loro letture, totale con àncore, niente più trasferimenti nuovi. I
  trasferimenti storici esistono solo come dati in sola lettura.
- **Sul telefono si aggiunge Debiti e crediti in sola lettura** (elenco delle posizioni, residui,
  totale netto). La domanda lasciata aperta il 20/09 è chiusa così. Rettifiche e «Allinea il
  totale» restano **solo sul PC**.
- **Lo snapshot deve contenere tutto il modello nuovo**: posizioni, letture, àncore e insiemi C
  delle àncore. Non si riusa tale e quale l'elenco fisso di tabelle dell'export
  (`packages/server/src/routes/export.ts:79-114`), che fino alla 7.3 ometteva perfino
  `debt_credit_positions`.
- **Il trasferimento non è più l'esempio di operazione composta**: non se ne creano più. Nei
  requisiti di atomicità e nell'accettazione dell'8.1 lo sostituiscono lo stipendio con il suo
  ciclo e il saldamento con il suo movimento.
- **«Allinea il totale» e i pacchetti del telefono.** L'àncora esiste proprio perché un movimento
  acquisito in ritardo, con data anteriore, non conti due volte. Sul PC, quando Google Drive è
  collegato, «Allinea» consuma prima i pacchetti in attesa. Resta un solo caso limite accettato:
  un movimento del telefono datato oggi e acquisito dopo un'àncora di oggi non è nel suo insieme
  C, quindi conta dopo l'àncora. Va scritto fra i limiti noti.

## Requisiti congelati

- **Sul telefono si inserisce e si consulta**: movimenti, prospetto, saldi dei conti, occorrenze in
  attesa. Configurazione (spese fisse, categorie e regole, previsioni), grafici e backup restano
  solo sul PC.
- **Niente funzionamento offline.** Senza rete il telefono non fa nulla, e l'utente lo ha accettato
  esplicitamente. È la decisione che semplifica di più l'intera fase.
- **Google Drive** come trasporto. L'utente ha scartato consapevolmente OneDrive, che il consulente
  raccomandava perché il suo client desktop avrebbe evitato di scrivere codice di rete sul PC.
- **Cloudflare Pages con repository privato** per distribuire il programma: gratuito, nessun dominio
  da comprare, codice non pubblico, nessuna indicizzazione, niente da amministrare.

## L'origine HTTPS è una concessione necessaria, non un dettaglio

Il requisito «nessuna installazione, nessun server, nessun sito» non è realizzabile su Android né
su iOS: un telefono non esegue un programma preso da un file o dal cloud, serve un indirizzo da cui
il browser carichi il codice, ed è anche l'unica via per far funzionare l'accesso a Google Drive.

La formulazione onesta, concordata con l'utente, è: **nessun backend da amministrare; un indirizzo
statico distribuisce soltanto il programma; i dati restano sui dispositivi e nel Drive
dell'utente.** Chi aprisse quell'indirizzo senza l'account Google trova una schermata di accesso e
nient'altro, perché dietro non c'è nulla: niente database, niente sessioni, niente da proteggere.

## Architettura

```
PC (archivio autorevole)          Google Drive (appDataFolder)       Telefono (browser)
SQLite + server Fastify   ──────►  snapshot-<n>.json          ──────►  stato ricostruito
modulo di sincronizzazione ◄──────  pacchetti/<op>.json        ◄──────  in memoria, pubblica
                                                                        pacchetti immutabili
```

### Il PC resta l'archivio autorevole

Conserva il database canonico, valida le operazioni ricevute, pubblica lo snapshot e mantiene per
sé catch-up delle ricorrenze, backup e configurazione. Il telefono è una replica che sa scrivere.

Conseguenza da dichiarare nell'interfaccia, non da nascondere: quando il PC è spento il telefono
continua a funzionare e i suoi pacchetti restano su Drive, ma **il consolidamento avviene alla
prima apertura di Conticini sul PC**. «Autorevole» non significa che il PC possa sovrascrivere in
silenzio una modifica del telefono.

### Il telefono non ha un database

All'apertura scarica l'ultimo snapshot più i pacchetti successivi, ricostruisce lo stato **in
memoria** e calcola con `packages/dominio` esattamente come fa il server. Ogni modifica diventa un
pacchetto immutabile pubblicato subito su Drive.

Questa è la **prima correzione al segnaposto del 17/09**: caduto il requisito offline, IndexedDB,
service worker e coda di lavoro persistente diventano lavoro non necessario. Restano però due cose
che non si eliminano:

- **Un piccolo record in `localStorage`, scritto *prima* di ogni invio**, con l'identificatore
  dell'operazione, l'id del file Drive pre-assegnato tramite `files.generateIds` e il payload.
  Serve perché rinunciare all'offline non elimina le interruzioni **durante** un invio: se la
  pagina viene ricaricata mentre il pacchetto sta partendo, alla riapertura si verifica l'esito e
  si riprende **lo stesso** tentativo, senza creare un duplicato. Il record si cancella solo dopo
  la conferma. Il nome del file non è una garanzia di unicità: Drive ammette nomi duplicati nella
  stessa cartella.
- **La conferma all'utente segue il deposito su Drive**, non l'inserimento in un array in memoria.
  L'interfaccia distingue tre stati: *in corso*, *salvato su Drive*, *acquisito dal PC*. Un timeout
  significa «esito da verificare», non «salvataggio fallito».

Manifest e icone sì, così si aggiunge alla schermata Home e si apre a tutto schermo; ma si descrive
per quello che è, **una web app che richiede connessione**, senza far credere che funzioni offline.

Se un giorno i tempi di apertura diventassero inaccettabili, la risposta sarà una cache locale
misurata sul problema, non il ritorno all'intera impalcatura offline.

### Google Drive: `appDataFolder`, e perché la scorciatoia non funziona

Si usa la cartella applicativa con scope **`drive.appdata`** su entrambi i lati. È uno scope non
sensibile: Google non richiede verifica dell'applicazione.

- **Telefono**: Google Identity Services, modello a token. Il token dura circa un'ora e non esiste
  un refresh token nel browser: va previsto un gesto «Collega Google Drive» a ogni nuova sessione
  della pagina. Se la sessione Google è attiva e il consenso è già dato, è un passaggio breve, ma
  **non si prometta un accesso perpetuo e silenzioso**.
- **PC**: flusso OAuth per applicazioni desktop con redirect su loopback e refresh token
  conservato. Qui la configurazione resta valida a lungo.
- **Due client OAuth, uno Web e uno Desktop, nello stesso progetto Google Cloud**, che va portato
  **«In produzione»**. Lasciarlo in modalità test farebbe scadere le autorizzazioni ogni 7 giorni,
  sia il consenso sul telefono sia il refresh token del PC. Dopo il passaggio in produzione si
  rifà l'autorizzazione sul PC, per non dipendere da un token emesso durante il test.

L'utente aveva detto che la cartella non deve essere nascosta, il che aprirebbe la strada a usare
`G:\Il mio Drive` — Google Drive per desktop **è installato e attivo sul PC**, verificato il
20/09/2026 — evitando del tutto OAuth sul lato PC. Non funziona, ed è la **seconda correzione al
segnaposto**: con lo scope `drive.file` un'applicazione vede solo i file che ha creato lei o che le
sono stati esplicitamente affidati, quindi i pacchetti depositati dal client desktop resterebbero
invisibili al telefono. L'unica alternativa sarebbe un accesso ampio a tutto il Drive, che è
peggiore sotto ogni aspetto. Si resta su `appDataFolder` e si accetta il costo di OAuth sul PC.

### Protocollo di sincronizzazione

- **Bootstrap**: uno snapshot logico immutabile prodotto dal PC, completo di revisioni e tombstone,
  con un punto di partenza esplicito. Non si ricostruisce retroattivamente la storia dal
  `change_log` esistente.
- **Pacchetti**: identificatore del dataset, versione del protocollo e dello schema, dispositivo,
  identificatore dell'operazione, sequenza per dispositivo, dipendenze, e operazioni raggruppate in
  modo atomico. Pubblicazione completa, controllo d'integrità, deduplicazione per identificatore.
  **Non ci si affida all'ordine di arrivo dei file né agli orologi.**
- **Accettazione automatica**: un'operazione già ricevuta non ha effetto; un id nuovo senza
  violazioni si inserisce; un aggiornamento la cui `base_revision` coincide con la revisione
  corrente si applica. Le dipendenze mancanti si **attendono**, non si dichiarano conflitti.
- **Conflitto**: modifiche concorrenti sulla stessa riga, cancellazione contro modifica, violazione
  di un vincolo fra righe. Si conservano entrambe le proposte e si chiede all'utente. **Mai «vince
  l'ultimo» sul timestamp, mai fusione automatica campo per campo.**
- **Atomicità di dominio**: stipendio con il suo ciclo, conferma di
  un'occorrenza, saldamento di un debito con il suo movimento — si accettano o si sospendono
  insieme. Anche righe diverse possono confliggere fra loro: per esempio una previsione e una spesa
  fissa attivate sulla stessa categoria.

Il `change_log` di oggi **non è già un protocollo**, e va saputo prima di cominciare: non contiene
un identificatore dell'operazione composta (le due gambe di un trasferimento producono due righe
correlate solo dal `transfer_group_id` dentro il payload) e il payload degli aggiornamenti è
parziale, senza il valore precedente. Il formato del pacchetto deve risolvere queste due mancanze;
gli UUID, i tombstone e `base_revision` sono le fondamenta, non l'edificio.

## Giri

### 8.1 — Protocollo, snapshot e applicazione dei pacchetti

Solo PC, nessuna rete, nessun Google: tutto collaudabile con file locali e DB temporanei, ed è il
motivo per cui questo giro viene per primo — è la parte rischiosa e si può provare senza
infrastruttura.

- Schemi zod di snapshot e pacchetto in `packages/contratti`.
- Costruzione dello snapshot dal database, partendo dalla logica dell'export JSON
  (`packages/server/src/routes/export.ts`), che esporta le tabelle con i tombstone e le colonne di
  sincronizzazione. Lo snapshot deve contenere **tutte** le tabelle sincronizzabili, verificato
  contro lo schema e non contro un elenco scritto a mano: in particolare posizioni, letture dei
  conti, àncore e insiemi C (revisione del 25/09/2026).
- Applicazione di un pacchetto: idempotenza per identificatore, controllo di `base_revision`,
  rilevazione dei conflitti, atomicità delle operazioni composte, attesa delle dipendenze mancanti.
- Migrazione per lo stato di sincronizzazione: cursori, operazioni già applicate, conflitti aperti.

**Accettazione.** Applicare due volte lo stesso pacchetto non cambia nulla; un pacchetto che
modifica una riga cambiata nel frattempo produce un conflitto e non scrive niente; uno stipendio
arriva insieme al suo ciclo e un saldamento insieme al suo movimento, o non arrivano; un pacchetto che dipende da uno non ancora presente resta in attesa e
si applica quando l'altro arriva.

### 8.2 — Trasporto Google Drive sul PC

- OAuth desktop con loopback e conservazione del refresh token.
- Client `appDataFolder`: elenco, caricamento, scaricamento, id pre-assegnati.
- Pubblicazione dello snapshot e consumo dei pacchetti, all'avvio e a comando.
- Pagina di stato nella UI del PC: collegamento a Google, ultimo allineamento, conflitti aperti.
- «Allinea il totale» (fase 7), quando Drive è collegato, consuma prima i pacchetti in attesa.

**Accettazione.** Un movimento inserito sul PC compare nello snapshot su Drive; un pacchetto
costruito a mano e caricato su Drive viene applicato al riavvio; staccare la rete a metà
pubblicazione e riprendere non produce doppioni.

### 8.3 — App mobile in lettura

- Build «mobile» della stessa `packages/web`: si sostituisce il punto unico di uscita HTTP
  (`packages/web/src/api.ts`, l'unica `fetch` di dati del progetto) con un router in-process che
  risponde localmente. Le pagine e i componenti **non si riscrivono**: le 55 chiamate sono già tutte
  confinate nei moduli `dati.ts` e `use*.ts`, e nessun `.tsx` conosce la rete.
- Adattatore **in memoria** delle interfacce già dichiarate in `packages/dominio/src/repository.ts`.
- Accesso con Google, caricamento dello stato da Drive, Prospetto, saldi segnati dei conti con lo
  scarto (sola lettura: niente rettifiche né «Allinea»), elenco movimenti, **Debiti e crediti in
  sola lettura**. Layout stretto da telefono.

**Accettazione.** Il prospetto calcolato sul telefono coincide cifra per cifra con quello del PC
alla stessa data. È mostrato a quando risale l'ultimo aggiornamento pubblicato dal PC, perché il
catch-up delle ricorrenze resta suo.

### 8.4 — App mobile in scrittura

- Inserimento rapido dei movimenti, **senza conto** come sul PC dalla fase 7, con autocompletamento e categoria proposta (il calcolo è già
  puro in `packages/dominio/src/regole.ts`).
- Pubblicazione del pacchetto con il record di ripresa in `localStorage` e gli stati *salvato su
  Drive* / *acquisito dal PC*.
- I servizi applicativi necessari alla scrittura (creazione del movimento con le sue validazioni)
  si estraggono in `packages/dominio`, e **il server viene rifattorizzato per usare gli stessi**.
  Non si duplica la logica di scrittura in due posti destinati a divergere: è il motivo per cui
  questo giro tocca anche `packages/server`.

**Accettazione.** Movimento inserito dal telefono, PC acceso dopo, movimento presente e identico.
Interruzione di rete a metà invio, riapertura, nessun duplicato e nessuna perdita.

### 8.5 — In attesa, conflitti, chiusura della fase

- Occorrenze in attesa sul telefono.
- Schermata di risoluzione dei conflitti sul PC: le due proposte a confronto e una scelta esplicita
  che produce una nuova operazione.
- Manifest, icone, aggiunta alla schermata Home.
- Documentazione d'uso e limiti noti.

## Configurazione che spetta all'utente

Si guida **in chat, un passo per volta**, non si consegna come documento: progetto Google Cloud con
i due client OAuth e passaggio in produzione (giro 8.2 per il PC, 8.3 per il telefono); account
Cloudflare e collegamento al repository privato (giro 8.3).

## Vincoli permanenti

- **Playwright resta vietato**, anche qui: il collaudo dell'interfaccia lo fa `live-testing` in
  Chrome, e la prova finale sul telefono la fa l'utente.
- Il confine di `packages/dominio` non si allenta: se per far funzionare il telefono servisse
  importare `fastify` o `better-sqlite3` nel client, vuol dire che il confine è stato violato e la
  soluzione è un'altra.
- **iOS resta progettato ma non collaudato** finché non esiste un dispositivo su cui provarlo: va
  scritto come limite noto, non dato per funzionante.
