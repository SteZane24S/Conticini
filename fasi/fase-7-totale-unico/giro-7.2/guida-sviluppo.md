# Guida di sviluppo — giro 7.2

## Decisioni da conservare

- Da questo giro le nuove scritture di movimenti, spese fisse, occorrenze, stipendi e saldamenti non assegnano un conto. Gli schemi zod di richiesta restano invariati perché i form del web inviano ancora `contoId`; il server ignora il valore. La pulizia dei form è rimandata al 7.4.
- La migrazione 003 ricostruisce le tabelle necessarie per rendere nullable `account_id` e prepara le tabelle di letture e àncore per il 7.3. Il backup è obbligatorio prima di applicare migrazioni pendenti: se fallisce, l'avvio si interrompe.
- I trasferimenti storici restano leggibili, ma non si creano, modificano o cancellano più. Il web riceve solo l'adattamento minimo per conto nullo; non va anticipato il redesign del 7.4.

## Riuso e limiti

- Il runner delle migrazioni accetta una cartella configurabile: i test che creano migrazioni temporanee devono usare una cartella isolata, per non interferire con Vitest parallelo.
- Non reintrodurre la propagazione del cambio conto alle occorrenze pending: il conto non cambia più. I dati storici con conto devono restare invariati e un movimento storico non può cambiare conto.
- Le liste di letture e àncore non sono ancora collegate al prospetto. Il 7.3 deve completare anche lo schema del prospetto, il totale con àncore e gli export; la rimozione visiva dei selettori resta al 7.4.

## Review e verifica

- Il bug del backup non bloccante e la duplicazione del runner sono stati corretti. È stato corretto anche il rischio reale nel repository delle occorrenze, benché il checker lo avesse classificato fuori scope; il tipo non aggiornato di `RigaSpesaFissa` è stato rimosso. La duplicazione di `nomeConto` è stata accettata come debito preesistente non aggravato.
- Un test intermittente dovuto alla cartella condivisa delle migrazioni è stato isolato; tre esecuzioni consecutive dell'intera suite sono risultate verdi. I gate di build, test, lint e formattazione dei file coperti sono verificati; il fallimento residuo di `format:check` riguarda solo `AGENTS.md` preesistente.
- Non è stato eseguito live-testing: il ramo con conto nullo non è osservabile nei flussi UI attuali, che continuano a inviare il conto.

## Consumi e ricadute

- Le sette unità e le correzioni successive sono state eseguite su Codex (`gpt-5.6-terra`, effort alto sulle unità più delicate e medio sulle altre). L'orchestratore ha usato Claude Sonnet 5, senza escalation a Opus e senza ricadute su Sonnet.
