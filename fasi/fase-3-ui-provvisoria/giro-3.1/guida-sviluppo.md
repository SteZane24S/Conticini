# Fase 3, giro 3.1 — perché queste scelte

## Ricaduta su Sonnet invece di Codex
La pool Codex non era disponibile in questo giro: `implementer` (U0-U3) e `conformity` sono
girati in ricaduta, rispettivamente su `general-purpose` e `Explore`, con lo stesso contratto
di ruolo passato in testa al prompt. `bug-hunter`, `checker` e `live-testing` girano su Sonnet
in ogni caso, quindi per loro non è una deviazione. Conseguenza pratica: queste sessioni
lasciano traccia nei transcript, a differenza delle sessioni Codex — da tenere presente
confrontando il peso di questo giro con quelli precedenti nel registro dei consumi.

## Endpoint elenco trasferimenti (U0)
Prima esisteva solo `GET /api/trasferimenti/:gruppo` (uno alla volta): la pagina Conti aveva
bisogno di un elenco. Aggiunto `GET /api/trasferimenti` invece di adattare l'endpoint singolo,
per non cambiarne il contratto già consumato altrove.

## Vincolo "settore con categorie attive" spostato lato server
Il `bug-hunter` ha trovato che eliminare un settore con categorie attive lasciava categorie
orfane (invisibili nell'albero, ma ancora selezionabili nel form regole), e proponeva un blocco
lato UI. L'orchestratore ha deciso diversamente: il controllo va nel repository
(`RepositorioSettori.elimina`, `packages/server/src/repositories/settori.ts`) con un nuovo
errore di dominio `erroreSettoreConCategorie` (409, `packages/server/src/errori.ts`), perché
l'integrità dei dati è una responsabilità del server, non solo della UI che oggi lo chiama. Una
UI futura (o un client diverso) che salti il controllo lato client sarebbe comunque protetta.

## Bug del `Content-Type` su `DELETE`, trovato solo dal collaudo
I test automatici (`npm test`) erano tutti verdi, ma `live-testing` ha trovato che **ogni**
`DELETE` dell'app rispondeva 500. Causa: il client HTTP mandava sempre l'header
`Content-Type: application/json`, anche sulle richieste senza corpo — ogni `DELETE` è chiamato
con `body: undefined`. Fastify, ricevendo quell'header senza un corpo, fallisce nel suo parser
JSON di default *prima* che la richiesta arrivi alla rotta: per questo anche il nuovo vincolo
sul settore (sopra) non riusciva a restituire il suo messaggio 409, la richiesta non arrivava
mai al codice della rotta. I test unitari non lo intercettavano perché mockano `fetch`
direttamente, senza passare da un vero parser HTTP — è la controprova che i gate automatici
(build/test/lint) non bastano su questo genere di difetto, e perché il collaudo in Chrome resta
un passo obbligato e non opzionale per ogni giro che tocca `packages/web`.
Fix: l'header si manda ora solo quando `opzioni?.body !== undefined`.

## Duplicazioni fra U2 e U3, corrette dopo la review di conformità
U2 (Conti) e U3 (Categorie e regole) sono state scritte come unità indipendenti nello stesso
giro e hanno duplicato tre cose, tutte segnalate da `conformity` e corrette:
- `schemaOk` (validazione della risposta API): estratto come `rispostaOkSchema` in
  `packages/web/src/api.ts`.
- Il componente di conferma-eliminazione, reimplementato a mano tre volte in U3 mentre U2 lo
  aveva già fattorizzato: estratto come `packages/web/src/components/ConfermaInline.tsx`.
- Costanti di stile e `messaggioErrore`, duplicate fra i file di U3: estratte in
  `pages/categorie-regole/stili.ts`.

## Rilievi scartati, e perché
- **Cast `as DataISO` invece di `parseDataISO`** (conformity, media): il `checker` lo aveva
  verificato fondato, ma l'orchestratore ha controllato direttamente il codice server e trovato
  lo stesso pattern (cast dopo validazione zod al bordo) in 42 punti di `packages/server/src`.
  Non è una violazione della convenzione del progetto: è la convenzione. Nessuna modifica.
- **Gestori `handleX` vs `gestisciX`** (conformity, bassa): il `checker` aveva confermato il
  rilievo così come proposto (uniformare U2 a "handle", come U3). L'orchestratore ha invertito
  la direzione della correzione: il resto del progetto, fuori da questo giro, è interamente in
  italiano anche nei nomi di funzione (`registraGestoreErrori`, `creaTrasferimento`,
  `elencaTrasferimenti`...). È "handle" di U3 l'anomalia rispetto alla convenzione esistente,
  non "gestisci" di U2. Corretto rinominando U3, non U2.

## Debiti accettati, non toccati in questo giro
- Query N+1 in `elencaTrasferimenti`: una query per il gruppo più una per le righe di ciascun
  trasferimento. Trascurabile per un'app personale con questo volume di dati; da rivedere solo
  se il volume cambiasse di ordine di grandezza.
- UUID tecnico in coda al messaggio di errore del vincolo sul settore: cosmetico, da pulire se
  si ritocca `errori.ts` in un giro futuro, non merita un giro dedicato.
- Messaggio d'errore del form trasferimento che resta visibile come stato stantio dopo che
  l'utente corregge il campo: debito di UX minore, accettabile per la fase "UI provvisoria" che
  per definizione non è la UI finale (fase 5, restyling).

## Cosa non toccare, e perché
- `packages/server/src/repositories/trasferimenti.ts`: la query N+1 è un debito noto e
  accettato, non un bug da correggere di passaggio in un giro futuro che tocchi altro in quel
  file — se la si tocca, farlo con un giro dedicato e test di carico, non incidentalmente.
- Il pattern cast `as DataISO` dopo validazione zod: è la convenzione del progetto in oltre 40
  punti del server. Non "correggerlo" a `parseDataISO` per coerenza percepita: sarebbe la
  modifica non richiesta, non il contrario.
