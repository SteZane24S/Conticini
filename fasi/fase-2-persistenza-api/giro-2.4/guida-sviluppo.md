# Guida di sviluppo — giro 2.4

Il vincolo "una categoria con previsione non può avere spese fisse attive, e viceversa" si applica solo alla creazione di un nuovo budget default, non al semplice aggiornamento dell'importo: un aggiornamento non cambia la relazione categoria/spesa-fissa già esistente, quindi non ha senso ricontrollarla a ogni scrittura.

`RepositorioRegoleCategoria.crea`/`aggiorna` (dominio, fase 1) accettava `Omit<RegolaCategoria, 'id'>`, lasciando `deletedAt`/`createdAt` obbligatori in input pur essendo generati sempre dal modulo centrale di scrittura. Corretto in questo giro a `Omit<RegolaCategoria, 'id' | 'deletedAt' | 'createdAt'>`: è una svista di firma da fase 1, non una decisione di dominio, e nessuna funzione esistente dipendeva dalla firma precedente.

Il pattern di una regola va validato come non-vuoto **dopo** `normalizzaTesto`, non prima: un pattern come `"   "` supera `min(1)` sul testo grezzo ma si normalizza a stringa vuota, che in `categoriaDaRegole` diventerebbe un match universale silenzioso. Non rimuovere la validazione post-normalizzazione in `crea`/`aggiorna`.

`GET /api/prospetto` riusa `creaRepositorioBudgetDefault(ctx).elenca()` e la nuova `elencaTutteLeBudgetOverride` del repository di U1, invece di leggere `budget_defaults`/`budget_overrides` con SQL diretto: la duplicazione iniziale era autorizzata solo per la finestra di parallelismo con U1 ed è stata rimossa appena le due unità sono atterrate. Non reintrodurre SQL grezzo in questa rotta.

`suggerimenti.ts` legge lo storico movimenti una sola volta, tramite `leggiRegoleEStoricoApprendimento`, e chiama direttamente le funzioni pure di dominio: l'interfaccia `ServizioApprendimento` resta intatta per non rompere i chiamanti, ma la doppia lettura dello storico è stata eliminata.

Nessun test copre esplicitamente l'assenza di leak tra override di cicli diversi nel prospetto multi-ciclo: il dominio filtra correttamente per `cicloId`, verificato a mano, ma manca l'asserzione automatica — debito di copertura a basso costo per un giro futuro, non un difetto noto.
