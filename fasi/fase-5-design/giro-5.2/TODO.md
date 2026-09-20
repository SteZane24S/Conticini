# Fase 5, giro 5.2 — Prospetto e Movimenti

Chiuso il 20/09/2026 · commit successivo a questo registro (precedente: 85472f6a9f7b8fc3a9ed3ee01a2879b3c389e33d)

## Fatto

- [x] Prospetto restilizzato: intestazione con selettore data, riquadro "Saldo previsto al prossimo stipendio"/"Dopo l'accredito previsto" (o avviso quando manca la data del prossimo stipendio), card di saldo totale e per conto, elenco spese fisse ancora da pagare con badge "arretrata", tabella previsioni per categoria con barra di avanzamento.
- [x] Movimenti restilizzati: barra di inserimento rapido con controllo segmentato Entrata/Uscita, autocompletamento descrizione, form "+ nuova categoria"; riga filtri invariata; riga totali; tabella con modifica inline ed eliminazione con conferma inline preservate.
- [x] Corretto in collaudo: saldo negativo non colorato di rosso nelle card conti del Prospetto (`var(--rosso)` su card "Saldo totale" e card di singolo conto).

## Misurato

- `git diff --stat` sui sei file del giro → 6 file cambiati, 853 inserimenti, 498 cancellazioni.
- `npm run build` (dalla radice) → verde su dominio, contratti, server e web.
- `npm test` (dalla radice) → verde, 338 test totali (contratti 7/1 file, dominio 121/11 file, server 205/33 file, web 5/2 file).
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → fallisce solo su `AGENTS.md`, pendenza preesistente non toccata in questo giro.
- Collaudo Chrome (due passate, tema chiaro e scuro) → verde dopo la correzione del difetto sul saldo negativo; nessun errore di console.

## Scostamenti dal brief

- Il filtro "Periodo" del prototipo di design non è stato introdotto: richiedeva nuova logica non prevista dal brief.
- I due implementer su Codex (`gpt-5.6-terra`) sono andati in timeout due volte ciascuno ("nessuna risposta per 1800s") senza scrivere codice; le due unità sono state implementate direttamente dall'orchestratore, seguendo gli stessi brief.
- La review `conformity` su Codex è andata in timeout per due tentativi consecutivi. Causa individuata: un processo `codex` orfano vivo da 3 giorni (534 thread, 2,67 GB di working set), terminato su conferma dell'utente; il server MCP Codex è rimasto comunque disconnesso per il resto del giro. Review di conformità svolta manualmente dall'orchestratore (colori/dimensioni hard-coded, riuso dei componenti condivisi, id dei campi): nessun rilievo.
- La review `bug-hunter` (Claude Sonnet, sola lettura) è girata regolarmente: 0 rilievi.

## Resta aperto

- Prossimo giro: 5.3 — Stipendio, Conti, Categorie e regole, da `fasi/fase-5-design/PIANO.md`. Continua a chiudersi con `live-testing`.
- La pendenza preesistente su `AGENTS.md` resta invariata: non generata né modificata in questo giro.
- Osservazione non bloccante non risolta: la card di un conto scompare dal Prospetto se la data di riferimento è anteriore alla creazione del conto, invece di mostrare 0,00€ — comportamento di dominio non toccato in questo giro.
- Difetto giudicato falso positivo dello strumento di automazione (digitazione simulata dell'intero valore "1,50" nel campo Importo, non riproducibile carattere per carattere): nessuna modifica.
- Nota tecnica sull'ambiente: pattern di timeout ripetuti su Codex (4 tentativi su 4 senza risposta), causa probabile un processo orfano ora terminato; server rimasto disconnesso per il giro. Da monitorare nel prossimo giro.
- Osservazione fuori scope: processi `node.exe` orfani risalenti a più giorni prima di questo giro, non toccati; segnalati per un'eventuale pulizia decisa dall'utente.

## Intervallo di commit

`85472f6a9f7b8fc3a9ed3ee01a2879b3c389e33d..<commit di questo giro>`
