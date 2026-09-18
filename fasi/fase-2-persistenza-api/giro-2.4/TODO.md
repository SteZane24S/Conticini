# Fase 2 — Persistenza e API, giro 2.4 — Previsioni, prospetto, regole e suggerimenti
Chiuso il 18/09/2026 · Intervallo di commit: non ancora disponibile, il commit segue questo registro (HEAD di partenza: ba5148d)

## Fatto
- [x] U1: implementate le API di previsioni (budget di default e override, budget effettivo per ciclo) con il vincolo di dominio categoria-previsione/spesa-fissa applicato solo alla creazione.
- [x] U2: implementati `GET /api/prospetto` e `GET /api/cicli`, riusando i repository esistenti e la funzione pura di dominio del prospetto.
- [x] U3: implementato il CRUD delle regole di categoria e l'endpoint di suggerimenti (autocompletamento e categoria proposta), con correzione della firma del contratto di dominio `RepositorioRegoleCategoria`.
- [x] U4: completato il wiring dei nuovi contratti e delle nuove rotte in `packages/contratti/src/index.ts` e `packages/server/src/app.ts`.

## Misurato
- `git diff --cached --shortstat` (contro HEAD ba5148d, prima del commit di questo giro): 20 file cambiati, 1661 inserimenti, 2 rimozioni.
- `npm run build`: superato (tutti i workspace).
- `npm test`: 116/116 dominio, 173/173 server, 1/1 web.
- `npm run lint`: superato, nessun output.
- `npm run format:check`: fallisce solo su `AGENTS.md`, pendenza preesistente invariata (non introdotta da questo giro).

## Scostamenti dal brief
- U3: correzione della firma di `RepositorioRegoleCategoria.crea`/`aggiorna` (da `Omit<RegolaCategoria, 'id'>` a `Omit<RegolaCategoria, 'id' | 'deletedAt' | 'createdAt'>`), emersa come blocco legittimo durante l'esecuzione e autorizzata dall'orchestratore: svista di firma da fase 1, nessun comportamento cambiato.
- U2: la duplicazione di lettura budget, autorizzata dal brief solo per la durata del parallelismo con U1, è stata rimossa a posteriori dopo l'atterraggio di U1, aggiungendo `elencaTutteLeBudgetOverride` al suo repository.
- Nessun altro scostamento nelle unità U1/U4.

## Resta aperto
- `AGENTS.md` non tracciato alla radice: pendenza preesistente invariata, decisione dell'utente.
- Debito di copertura test accettato: nessun test verifica esplicitamente l'assenza di leak tra override di cicli diversi nel prospetto multi-ciclo (comportamento verificato manualmente come corretto leggendo il dominio).
- Durante il giro la pool Codex si è esaurita per quota; le correzioni di U3, il wiring U4 e il fix di formattazione sono girati in ricaduta su Sonnet — da tenere presente nel confronto dei pesi fra giri nel registro dei consumi, perché queste sessioni lasciano traccia nei transcript a differenza di quelle Codex.
- Il prossimo giro è il 3.1 — Conti e trasferimenti; settori, categorie e regole, da `fasi/fase-3-ui-provvisoria/PIANO.md`. Da qui in avanti ogni giro si chiude con `live-testing`.
