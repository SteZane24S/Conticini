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

## Materiale esportato (in `design/`, sincronizzato il 2026-09-17)
- `Conticini.dc.html` — prototipo unico e interattivo, tutte e 10 le schermate del brief più dialoghi di conferma e toast. Non è codice React: usa un motore di template proprietario dello strumento (`support.js`, tag `sc-if`/`sc-for`, `x-dc`) solo per l'anteprima nel browser di claude.ai/design. Serve come riferimento visivo e di interazione, non si importa nel progetto.
- `_ds/modernist-.../styles.css` — foglio di stile del design system "Modernist": token reali (`--color-*`, `--font-*`, `--space-*`, `--radius-*`, `--shadow-*`) e classi component (`.btn`, `.card`, `.field`, `.tag`, `.table`, `.dialog`, `.seg`, `.nav`). Questo sì va portato nel progetto.
- `_ds/modernist-.../readme.md` — guida alle classi del design system; cita file (`components/*.html`, `foundations/*.html`, `templates/`, `theme.json`, `assets/photo.jpg`) che **non sono stati esportati**: non cercarli, la guida testuale basta.
- `_ds/modernist-.../_ds_bundle.js` — bundle vuoto (nessun componente estratto), ignorabile.
- `_ds/modernist-.../_adherence.oxlintrc.json` — configurazione lint dello strumento di design, non integrata nel progetto (che usa ESLint): ignorabile.
- `github.md` — mappa schermata → file del repository, utile per orientarsi ma non normativa.

## Decisioni congelate per l'implementazione
- **Font**: il design system carica Archivo con `@import` da Google Fonts (`styles.css` riga 2). Va sostituito con i file `.woff2` inclusi nel bundle di `packages/web` — nessuna risorsa da CDN, come da vincolo di questo piano.
- **Icone**: il prototipo non usa icone Lucide in modo estensivo (un solo `<svg>`, il grafico mock a riga 648 di `Conticini.dc.html`, da ignorare: i grafici restano su Recharts). Dove l'interfaccia attuale ha già delle icone, usare `lucide-react` da npm, mai da CDN.
- **Tema chiaro/scuro**: il design system di per sé non definisce token per il tema scuro; li definisce il prototipo con `html[data-theme="dark"]` (`Conticini.dc.html` righe 14-39), insieme a variabili di dominio non presenti nel design system base (`--verde`, `--verde-bg`, `--rosso`, `--rosso-bg`, `--neu`, `--neu-bg`, `--ambra`, `--ambra-bg`, usate per entrate/uscite/trasferimenti/avvisi). Questi token vanno portati così come sono nel progetto.
- **Conferme**: dentro la pagina con il pattern `.dialog-backdrop`/`.dialog` del design system (righe 717-736 del prototipo per la struttura, componenti in `readme.md`), mai popup del browser — vincolo già nel brief.
- **Componenti condivisi**: una libreria React in `packages/web/src/components` che ricalca le classi del design system (bottone, campo, tag, card, tabella, dialogo, controllo segmentato), usata da tutte le pagine. Si costruisce nel giro 5.1 e non si duplica nei giri successivi.

## Giri

### Giro 5.1 — Fondamenta: token, componenti condivisi, layout
- Token del design system in `packages/web` (colori, tipografia, spaziature, raggio 0, ombre) più i token di dominio e di tema scuro elencati sopra.
- Font Archivo self-hosted nel bundle Vite.
- Componenti React condivisi: bottone, campo, tag, card, tabella, dialogo, controllo segmentato — dalle classi `.btn/.field/.tag/.card/.table/.dialog/.seg` del design system.
- Sidebar di navigazione e layout generale in `Layout.tsx`, dal prototipo righe 49-75, incluso il badge del contatore "In attesa".
- Selettore tema chiaro/scuro, persistito (il prototipo lo fa con `dataset.theme`, riga 926).

**Accettazione:** build/test/lint verdi; `live-testing` verifica sidebar, cambio tema e i componenti di base (bottone, campo, dialogo) coerenti sia in chiaro sia in scuro.

### Giro 5.2 — Prospetto e Movimenti
- **Prospetto** (prototipo righe 77-182): saldo previsto in grande con data dello stipendio, saldo totale e card conti, elenco spese fisse da pagare con le arretrate evidenziate, tabella previsioni per categoria con barra di sforamento, riquadro "dopo l'accredito previsto", avviso quando manca la data del prossimo stipendio.
- **Movimenti** (righe 184-289): barra di inserimento rapido con autocompletamento descrizione e "+ nuova categoria", elenco filtrabile con totali.
- Solo restyling: nessuna modifica a hook o chiamate API esistenti.

**Accettazione:** `live-testing` sulle due pagine, in chiaro e in scuro.

### Giro 5.3 — Stipendio, Conti, Categorie e regole
- **Stipendio** (righe 291-351): form di registrazione e storico dei cicli.
- **Conti** (righe 353-411): card dei conti, form nuovo conto, form ed elenco dei trasferimenti.
- **Categorie e regole** (righe 413-469): albero settore > categoria, elenco regole con priorità e interruttore.

**Accettazione:** `live-testing` sulle tre pagine, in chiaro e in scuro.

### Giro 5.4 — Spese fisse, In attesa
- **Spese fisse** (righe 471-528): elenco con ricorrenza e badge automatica/manuale, form di creazione e modifica.
- **In attesa** (righe 530-573): conferma (importo/data modificabili), salta, collega a un movimento; badge nel menu.

**Accettazione:** `live-testing` sulle due pagine, in chiaro e in scuro.

### Giro 5.5 — Previsioni, Grafici, Backup — chiude la fase
- **Previsioni** (righe 575-617): selettore di ciclo, tabella categorie previsto/valore.
- **Grafici** (righe 619-677): adattare i grafici Recharts reali esistenti al nuovo stile — il prototipo qui è solo un mock SVG statico, da ignorare come implementazione.
- **Backup** (righe 679-713): stato ultimo backup, backup ora, cartella, ripristino, export.

**Accettazione:** `live-testing` sulle tre pagine, in chiaro e in scuro; con questo giro la Fase 5 è chiusa.
