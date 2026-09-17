# Conticini — stato del progetto

**Stato:** giro 1.2 chiuso il 17/09/2026.
**Prossimo giro:** 1.3 — Fase 1, Normalizzazione, regole di categoria, ranking autocompletamento, validazioni, vedi `fasi/fase-1-dominio/PIANO.md`.
**Orchestratore dei giri:** Claude Sonnet 5 `high`, contesto pulito a ogni giro.

## Checklist dei giri

### Fase 0 — Fondamenta
- [x] 0.1 Monorepo, TypeScript, ESLint (confine di `dominio`), Prettier, Vitest, gate, better-sqlite3 verificato
- [x] 0.2 Server Fastify: cartella dati, DB, migrazioni, `meta`, `/api/salute`, localhost + `Host`, istanza singola, heartbeat
- [x] 0.3 Web: Vite + proxy, layout provvisorio con navigazione, build servita da Fastify

### Fase 1 — Dominio puro
- [x] 1.1 Soldi, date, UUIDv5, ricorrenze
- [x] 1.2 Saldo a D, cicli, formula di previsione + test di accettazione
- [ ] 1.3 Normalizzazione, regole di categoria, ranking autocompletamento, validazioni

### Fase 2 — Persistenza e API
- [ ] 2.1 Schema 001, colonne di sincronizzazione, `change_log`, repository
- [ ] 2.2 API conti, settori/categorie, movimenti, trasferimenti
- [ ] 2.3 API stipendi/cicli, spese fisse, occorrenze, catch-up
- [ ] 2.4 API previsioni, prospetto, regole e suggerimenti

### Fase 3 — UI provvisoria
- [ ] 3.1 Conti e trasferimenti; settori, categorie e regole
- [ ] 3.2 Movimenti (inserimento rapido, elenco, modifica)
- [ ] 3.3 Stipendio; spese fisse; in attesa
- [ ] 3.4 Previsioni; prospetto

### Fase 4 — Grafici, backup, rilascio
- [ ] 4.1 Grafici
- [ ] 4.2 Backup e ripristino, export CSV e JSON
- [ ] 4.3 Build in `app/`, launcher, icona, aggiornamento

### Fase 5 — Restyling con Claude Design
- [ ] Design prodotto dall'utente su claude.ai/design (brief in `fasi/fase-5-design/PIANO.md`)
- [ ] Giri da definire quando il design esiste

### Fase 6 — Mobile e sincronizzazione
- [ ] Richiede una nuova sessione di pianificazione su Opus

## Pendenze aperte
- Nessuna pendenza aperta. Prossimo giro: 1.3 — Fase 1, Normalizzazione/regole/validazioni.
- Nessun rilievo fondato ma fuori scope.
- Nessuna domanda in attesa dell'utente.
- Nessun debito accettato.
