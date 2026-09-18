# Fase 3, giro 3.2 — Movimenti (inserimento rapido, elenco, modifica)
Chiuso il 18/09/2026 · commit successivo a questo registro (precedente: 6095a28)

## Fatto
- [x] Nuovo hook `useMovimenti` in `packages/web/src/pages/movimenti/dati.ts`: elenco filtrato con paginazione accumulata, CRUD e totali entrate/uscite
- [x] Nuovo hook `useSuggerimenti` con autocompletamento descrizione e debounce di 300 ms
- [x] Inserimento rapido in `packages/web/src/pages/movimenti/InserimentoRapido.tsx`: data, descrizione, importo, entrata/uscita, conto, categoria, suggerimenti e conferma dopo il salvataggio
- [x] Mini-form per creare una categoria al volo, incluso il settore nuovo quando necessario
- [x] Elenco in `packages/web/src/pages/movimenti/ElencoMovimenti.tsx`: filtri per periodo/conto/settore/categoria/testo, totali, modifica in linea e cancellazione con conferma
- [x] `packages/web/src/pages/Movimenti.tsx` riscritto dal placeholder e composto attorno a un'unica istanza condivisa di `useMovimenti`
- [x] Corrette le incoerenze di categoria rispetto al tipo entrata/uscita, la sincronizzazione asincrona del conto e l'invalidazione del filtro categoria al cambio settore
- [x] Rimosso il lock globale delle operazioni sull'elenco: salvataggio e cancellazione sono ora scoped alla singola azione/riga
- [x] Corretto lo stile della lista suggerimenti, che ora si posiziona sotto il campo di input

## Misurato
- `git diff --cached --shortstat` → 5 files changed, 1456 insertions(+), 1 deletion(-)
- `npm test` (radice, tutti i workspace) → 303 test passati: 7 contratti, 116 dominio, 175 server, 5 web; nessun nuovo test scritto in questo giro
- `npm run build` (radice) → verde, nessun errore
- `npm run lint` (radice) → verde, nessun errore
- `npm run format:check` (radice) → verde per tutti i file del giro; un solo avviso preesistente e non correlato su `AGENTS.md`
- `live-testing` in Chrome → 8/9 scenari conformi al primo passaggio; dopo la correzione CSS il difetto reale è stato chiuso. Il retest mirato ha eseguito 6 ripetizioni del sospetto sui pulsanti senza riprodurlo

## Scostamenti dal brief
- Nessuno scostamento strutturale.
- Tutti gli implementer hanno girato su Codex (`gpt-5.6-terra`, effort medium), in quattro unità con contratti fissati dall'orchestratore: U1 dati+stili, U2 inserimento rapido, U3 elenco, U4 assemblaggio pagina.
- La paginazione a offset instabile se il dataset cambia durante lo scaricamento di più pagine è stata confermata come debito, non corretta: per un'app locale personale mono-utente senza scritture concorrenti è trascurabile, come il debito N+1 accettato nel giro 3.1.
- Il rischio residuo, a bassissima probabilità, di race condition UI se il tipo del movimento cambia esattamente durante la creazione asincrona di una categoria è stato lasciato invariato: non è un rischio di dati e non è realistico nell'interazione manuale prevista.

## Resta aperto
- Paginazione a offset instabile in `useMovimenti` se il dataset cambia durante lo scaricamento di più pagine: debito accettato per il volume e il modello mono-utente dell'app.
- Aprire “Modifica” su una riga mentre un'altra modifica non salvata è aperta sovrascrive il form precedente senza avviso: debito minore di UX della fase “UI provvisoria”.
- Rischio trascurabile di race condition UI durante la creazione asincrona di una categoria, se il tipo del movimento cambia nello stesso istante.
- La pendenza preesistente su `AGENTS.md` resta invariata: file non tracciato alla radice, decisione dell'utente se tenerlo, cancellarlo o ignorarlo.
- Prossimo giro: 3.3 — Stipendio, spese fisse, in attesa, da `fasi/fase-3-ui-provvisoria/PIANO.md`.
