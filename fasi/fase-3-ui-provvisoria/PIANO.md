# Fase 3 — UI provvisoria funzionale

Obiettivo: ogni funzione raggiungibile e usabile dall'interfaccia. La grafica resta semplice e
pulita (CSS proprio, nessuna libreria di componenti pesante): il restyling arriva con la fase 5,
quindi i componenti vanno tenuti separati fra logica (hook e chiamate API) e presentazione, così
che il design nuovo sostituisca solo la seconda.

Regole comuni:
- importi inseriti come testo e convertiti con `parseImporto`;
- date con `input type="date"`;
- messaggi di errore dell'API mostrati accanto al campo;
- mai `alert`, `confirm` o `prompt`: le conferme si fanno con dialoghi in pagina;
- ogni giro si chiude con `live-testing` sull'istanza di sviluppo (`.dati-dev`).

## Giro 3.1 — Conti e categorie
- **Conti**: elenco con saldo attuale, creazione (nome, saldo iniziale, data di apertura), modifica, archiviazione. Form di trasferimento (da, a, importo, data, nota) ed elenco dei trasferimenti con modifica e cancellazione.
- **Categorie e regole**: albero Settore > Categoria con il tipo entrata/uscita; creazione, rinomina, cancellazione logica. Regole: elenco, creazione ("se la descrizione contiene … → categoria …", priorità), attiva/disattiva, e anteprima di quali movimenti esistenti colpirebbe.

## Giro 3.2 — Movimenti
- **Inserimento rapido** in cima alla pagina, pensato per la tastiera:
  - campi: data (default oggi), descrizione con autocompletamento, importo, entrata/uscita, conto (default l'ultimo usato), categoria;
  - la categoria viene proposta da regole e storico ed è modificabile;
  - "+ nuova categoria" crea la categoria al volo, anche con un settore nuovo;
  - Invio salva e riporta il fuoco alla descrizione.
- **Elenco** filtrabile (periodo, conto, settore, categoria, testo) con totali, modifica in linea e cancellazione con conferma in pagina.

## Giro 3.3 — Stipendio, spese fisse, in attesa
- **Stipendio**: registra (data, importo, conto, categoria di entrata, data prevista del prossimo, importo previsto facoltativo); storico dei cicli; modifica della data e dell'importo previsti del ciclo aperto.
- **Spese fisse**: elenco e form (nome, importo, conto, categoria, ricorrenza mensile / ogni N mesi / annuale, giorno, mese di ancoraggio, inizio, fine, **automatica o manuale**, attiva). Il vincolo previsione/fissa si mostra come errore leggibile.
- **In attesa**: occorrenze manuali scadute e prossime, con conferma (importo e data modificabili), salto, collegamento a un movimento esistente (ricerca per importo e data vicini). Contatore nel menu.

## Giro 3.4 — Previsioni e prospetto
- **Previsioni**: tabella delle categorie di uscita con il valore predefinito; selettore del ciclo con override del ciclo; colonne previsto, speso, residuo, sforamento.
- **Prospetto** (pagina iniziale):
  - selettore di data (default oggi, etichetta chiara se la data è futura);
  - saldo totale e saldi per conto;
  - fisse ancora da pagare, con le arretrate evidenziate;
  - tabella delle previsioni;
  - **saldo previsto al prossimo stipendio** in grande, con la data E;
  - "dopo l'accredito previsto" separato;
  - se il prospetto non è calcolabile: messaggio e scorciatoia per aggiornare la data prevista.

**Accettazione `live-testing` (scenario completo su un DB di sviluppo vuoto):**
1. 2 conti e un trasferimento;
2. stipendio con data prevista a +30 giorni;
3. una fissa automatica e una manuale scaduta;
4. una previsione di 100 € su Alimentari e una spesa di 30 €;
5. controllare che il saldo previsto corrisponda al calcolo scritto nel brief;
6. prospetto a una data passata;
7. confermare la manuale e verificare che la proiezione non cambi.
