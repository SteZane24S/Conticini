# Guida di sviluppo — giro 6.2

## Decisioni da conservare

- Il totale netto usa `calcolaTotaleNetto`: soldi sui conti, crediti da incassare e debiti da pagare restano leggibili separatamente; i saldamenti cambiano il conto e il residuo in modo compensato, quindi il totale non si muove.
- Le posizioni aperte precedono quelle saldate, che restano visibili e attenuate. Un saldamento può essere parziale; l'operazione è resa idempotente riusando l'identificatore generato all'apertura del form.
- Elimina è disponibile solo senza saldamenti: completa il percorso per correggere una posizione creata per errore, mentre il rifiuto server protegge le posizioni già collegate a movimenti.

## Riuso e limiti

- La pagina ricopia il caricamento paginato dei movimenti, la formattazione degli importi e gli stili del riquadro del Prospetto per non modificare altre pagine in questo giro; la duplicazione è intenzionale e accettata.
- Il selettore del conto resta provvisorio: l'API 6.1 lo richiede, ma la fase 7 lo eliminerà nei giri 7.2 e 7.4.
- Il caricamento dei saldamenti usa un contatore di richieste per ignorare risposte tardive; i dialoghi disabilitano la conferma durante l'invio per evitare doppie richieste.

## Verifica

- Il collaudo Chrome ha coperto creazione, saldamento parziale e completo, annullamento, eliminazione, grafici e temi chiaro/scuro: 9 scenari su 9 riusciti, senza errori di console o richieste fallite.
- Il primo avvio del collaudo è fallito perché l'estensione Chrome non era collegata; dopo la riapertura di Chrome il secondo avvio è riuscito.
- `npm run format:check` resta bloccato dal solo `AGENTS.md` non tracciato, preesistente e fuori scope.

## Consumi e ricadute

- Il giro è stato orchestrato con Claude Opus 5.5 per scelta esplicita dell'utente, per misurare i consumi della nuova versione; il confronto fra giri deve tenerne conto.
- L'unità implementer è stata Codex gpt-5.6-terra high; non ci sono state ricadute su Sonnet.
