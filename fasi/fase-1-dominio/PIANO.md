# Fase 1 — Dominio puro

Obiettivo: tutti i calcoli dell'app in `packages/dominio`, senza I/O, coperti da test. Le
funzioni ricevono dati semplici (array di movimenti, occorrenze, cicli, budget) e restituiscono
risultati: nessuna dipendenza da repository in questa fase. Le interfacce dei repository si
dichiarano qui, ma vengono implementate nella fase 2.

I requisiti esatti stanno in `PIANO.md` («Requisiti congelati» e «Modello dati»).

## Giro 1.1 — Soldi, date, identità, ricorrenze
- `soldi`:
  - `parseImporto("1.234,56")` → 123456 (accetta anche `1234.56`, `-12`, `12,5`; rifiuta più di 2 decimali, testo, valori oltre il limite applicativo);
  - `formatImporto(cents)` in it-IT con €;
  - `somma` con controllo `Number.isSafeInteger`.
- `date`: tipo `DataISO` (`YYYY-MM-DD`), validazione, confronto, `oggiLocale(now)` con `now` iniettato, `aggiungiMesi` con clamp all'ultimo giorno, `ultimoGiornoDelMese`.
- `identita`: UUIDv5 implementato in TS puro (SHA-1 compreso, oppure `crypto.subtle` **solo se** disponibile in modo portabile; preferibile il TS puro). Namespace fisso di progetto dichiarato come costante. Test contro i vettori noti di RFC 9562.
- `ricorrenze`: regole `monthly(anchorDay)`, `everyNMonths(n, anchorDay, anchorMonth)`, `yearly(anchorMonth, anchorDay)`, con `startDate` e `endDate`. `occorrenzeTra(regola, da, a)` → `[{ periodo: 'YYYY-MM', scadenza }]`. Periodo nominale = mese della scadenza nominale.

**Accettazione:** test per il giorno 31 (gen 31 → feb 28/29 → mar 31), il 29/2 annuale, ogni 3 mesi con ancora a novembre, i limiti di inizio e fine, l'anno bisestile, l'overflow degli importi.

## Giro 1.2 — Saldi, cicli, prospetto
- `saldoA(D, conti, movimenti)`: somma dei saldi iniziali dei conti aperti entro D e dei movimenti con data ≤ D; `saldiPerConto`.
- `cicloContenente(D, cicli)`; ciclo aperto; nessun ciclo prima del primo stipendio.
- `prospetto(D, dati)` restituisce:
  - saldo totale e saldi per conto;
  - elenco delle fisse ancora da pagare (arretrate + in `(D, E)`), con il totale;
  - per ogni categoria con budget: previsto, speso, residuo, sforamento;
  - `saldoPrevisto` (oppure `null` con un motivo: `orizzonte_mancante`, `orizzonte_superato`, `nessun_ciclo`);
  - `dopoAccredito` (se esiste l'importo previsto);
  - il flag `dataFutura`.
- Il budget effettivo è l'override del ciclo se c'è, altrimenti il default.

**Test di accettazione obbligatori** (uno per riga, con nomi espliciti):
1. un trasferimento non cambia il saldo totale;
2. pagare una fissa all'importo e alla data previsti non cambia `saldoPrevisto`;
3. una fissa pagata dopo D resta un impegno nel prospetto a D;
4. una manuale scaduta, non confermata, conta; una saltata no;
5. budget 100, speso 30 → residuo 70; speso 130 → residuo 0, sforamento 30;
6. E mancante → `saldoPrevisto = null` con `orizzonte_mancante`; E ≤ D senza un nuovo stipendio → `orizzonte_superato`;
7. D prima del primo stipendio → saldo presente, previsioni assenti;
8. un'occorrenza con scadenza esattamente E è esclusa;
9. esempio completo calcolato a mano e scritto nel test come commento.

## Giro 1.3 — Apprendimento e validazioni
- `normalizzaTesto`: minuscole, senza accenti (NFD + rimozione dei diacritici), spazi compressi, trim.
- `categoriaDaRegole(descrizione, regole)`: `contains` sul normalizzato; precedenza: priorità più alta, poi pattern più lungo, poi il più recente; solo regole attive e non cancellate.
- `suggerimentiDescrizione(prefisso, storico)`: ranking per frequenza e recenza, restituisce descrizione, categoria più usata e importo più recente; massimo N risultati.
- `suggerisciCategoria(descrizione, regole, storico)`: prima le regole, poi lo storico; la scelta manuale resta dell'interfaccia.
- Validazioni con esito tipizzato (niente eccezioni generiche): trasferimento valido; segno coerente col tipo della categoria; movimento non anteriore all'apertura del conto; vincolo previsione/fissa sulla stessa categoria.
- Interfacce asincrone dei repository e dei servizi applicativi (solo i tipi), senza SQL né concetti HTTP.

**Accettazione:** gate verdi; nessun import vietato in `dominio`.
