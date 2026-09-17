# Fase 5 — Restyling con Claude Design

Obiettivo: sostituire la presentazione provvisoria della fase 3 con un design fatto dall'utente su
claude.ai/design. Si tocca solo `packages/web`: la logica (hook, chiamate API) resta com'è.

## Come si procede
1. L'utente apre claude.ai/design e usa il brief qui sotto.
2. Quando il design è pronto, lo esporta (handoff verso Claude Code o export HTML/React) in `sviluppo/fasi/fase-5-design/design/`.
3. Una sessione di pianificazione breve definisce i giri in base al materiale esportato (componenti, token di colore e tipografia, schermate).
4. Vincoli per l'implementazione:
   - nessuna risorsa da CDN: font e icone vanno inclusi nel bundle;
   - tema chiaro e scuro;
   - finestra desktop con larghezza minima di circa 1000 px, pensando già a un layout che in futuro possa stringersi al telefono.

## Brief da incollare in Claude Design
> App desktop personale di finanza, in italiano, chiamata **Conticini**. Uso quotidiano, rapido,
> da tastiera. Stile pulito e leggibile, numeri grandi e chiari, verde per le entrate, rosso per le
> uscite, un colore neutro per i trasferimenti. Tema chiaro e scuro. Menu laterale con le voci qui
> sotto.
>
> 1. **Prospetto** (pagina iniziale): selettore di data; in grande il *saldo previsto al prossimo stipendio* con la data dello stipendio; saldo totale e card per ogni conto; elenco delle spese fisse ancora da pagare (con le arretrate evidenziate); tabella previsioni per categoria (previsto, speso, residuo, sforamento con barra di avanzamento); riquadro separato "dopo l'accredito previsto"; stato di avviso quando manca la data del prossimo stipendio.
> 2. **Movimenti**: barra di inserimento rapido in alto (data, descrizione con autocompletamento a tendina, importo, entrata/uscita, conto, categoria proposta con "+ nuova categoria"); sotto, elenco filtrabile per periodo, conto, settore, categoria e testo, con totali.
> 3. **Stipendio**: form di registrazione (data, importo, conto, data prevista e importo previsto del prossimo) e storico dei cicli.
> 4. **Conti**: card dei conti con saldo; form per un nuovo conto; form e elenco dei trasferimenti fra conti.
> 5. **Categorie e regole**: albero Settore > Categoria (entrata/uscita); elenco delle regole "se la descrizione contiene … → categoria …" con priorità e interruttore attiva/disattiva.
> 6. **Spese fisse**: elenco con importo, ricorrenza (mensile, ogni N mesi, annuale), prossima scadenza, badge automatica/manuale; form di creazione e modifica.
> 7. **In attesa**: spese fisse manuali da confermare, con azioni conferma (importo e data modificabili), salta, collega a un movimento; badge con il numero nel menu.
> 8. **Previsioni**: selettore del ciclo; tabella delle categorie con previsione predefinita e valore del ciclo.
> 9. **Grafici**: torta per settore, linea del saldo, barre previsto/speso, selettore di periodo.
> 10. **Backup**: stato dell'ultimo backup, pulsante "backup ora", cartella, ripristino, export CSV e JSON.
>
> Dialoghi di conferma dentro la pagina (non popup del browser).

## Giri
Da definire quando il design esiste.
