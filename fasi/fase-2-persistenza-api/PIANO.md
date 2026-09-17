# Fase 2 — Persistenza e API

Obiettivo: implementare in `packages/server` le interfacce dichiarate in `dominio`, su
better-sqlite3, ed esporle via API validate con gli schemi di `packages/contratti`. Le regole di
calcolo **non** si riscrivono in SQL: il server carica i dati e chiama il dominio.

Schema e invarianti: `PIANO.md` («Modello dati») e `CLAUDE.md`.

## Giro 2.1 — Schema e repository base
- Migrazione `001-schema.sql` con tutte le tabelle del modello dati, colonne di sincronizzazione, vincoli `UNIQUE` e chiavi esterne, indici su date e categorie.
- Un modulo centrale di scrittura che, in un'unica transazione:
  - assegna `revision` e `base_revision`;
  - aggiorna `updated_at`;
  - scrive `change_log` con `op_id` e `device_id`.

  Le cancellazioni valorizzano `deleted_at`. Nessun repository scrive SQL di modifica fuori da questo modulo.
- Le letture escludono i tombstone per default.
- Test su DB temporaneo:
  - ogni scrittura produce una riga in `change_log`;
  - un rollback non lascia né la riga né il log;
  - dopo una cancellazione, la riga resta con `deleted_at` valorizzato.

## Giro 2.2 — Conti, categorie, movimenti, trasferimenti
- CRUD dei conti (archiviazione invece della cancellazione se esistono movimenti).
- CRUD di settori e categorie; `POST` di una categoria con un settore nuovo inline (creazione al volo, atomica).
- CRUD dei movimenti con le validazioni del dominio (segno/tipo, data di apertura del conto) e salvataggio di `description_norm`.
- Trasferimenti: `POST/PUT/DELETE /api/trasferimenti/:gruppo`, sempre sulle due gambe in una transazione.
- Elenco dei movimenti con filtri (periodo, conto, settore, categoria, testo) e paginazione.
- Errori con un formato unico (codice, messaggio in italiano, campo).

## Giro 2.3 — Stipendi, spese fisse, occorrenze
- `POST /api/stipendi`: crea il movimento d'entrata e il ciclo (data prevista del prossimo, importo previsto facoltativo) in un'unica transazione. `PATCH` per aggiornare data e importo previsti del ciclo aperto.
- CRUD delle spese fisse (auto/manuale, attiva) con il vincolo previsione/fissa. Una modifica vale per le occorrenze non ancora pagate; quelle pagate non si toccano.
- Catch-up idempotente: materializza le occorrenze fino a oggi + 400 giorni, con id UUIDv5; per le `auto` con scadenza ≤ oggi crea il movimento con id UUIDv5(occurrence) e stato `paid`. Si esegue all'avvio e al cambio di giorno (controllo del giorno sull'heartbeat), mai dentro le GET.
- Occorrenze:
  - elenco `pending` (scadute e prossime);
  - `conferma` (importo e data correggibili → crea il movimento);
  - `salta`;
  - `collega` a un movimento esistente.

**Accettazione:**
- un doppio catch-up non crea duplicati;
- un catch-up dopo 3 mesi di "PC spento" crea le automatiche arretrate con la data di scadenza;
- modificare l'importo di una fissa non cambia le occorrenze pagate.

## Giro 2.4 — Previsioni, prospetto, suggerimenti
- Previsioni: CRUD dei default per categoria; override per ciclo; `GET` del ciclo con il budget effettivo.
- `GET /api/prospetto?data=YYYY-MM-DD` (default oggi): carica i dati e restituisce l'esito di `prospetto()` del dominio.
- `GET /api/cicli` (elenco per il selettore).
- CRUD delle regole di categoria; `GET /api/suggerimenti?testo=` (autocompletamento + categoria proposta).

**Accettazione:** test API che riproducono via HTTP i casi 2, 3, 5 e 6 del giro 1.2.
