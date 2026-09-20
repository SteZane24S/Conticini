repo: SteZane24S/Conticini
branch: main

## Last sync
date: 2026-09-17T17:45:00Z
- Design della fase 5 (`fasi/fase-5-design/PIANO.md`) realizzato come prototipo unico `Conticini.dc.html`, tutte e 10 le sezioni del brief.
- Calcoli allineati al dominio reale: formula del prospetto `saldo(D) − fisse ancora da pagare − Σ max(0, previsto − speso)`, ciclo `[stipendio, prossimo)`, date `YYYY-MM-DD`.
- Regole di categoria e suggerimenti descrizione replicano `dominio/src/regole.ts` (match su descrizione normalizzata, priorità ordinabile, interruttore attiva/disattiva).
- Stile dal design system Modernist (Archivo, raggio 0, righe 2px, accento #ec3013) con tema chiaro e scuro; font ancora da CDN, da includere nel bundle in implementazione.

## Screen map
| Schermata del prototipo | File del repository |
| --- | --- |
| Prospetto | packages/dominio/src/prospetto.ts, packages/dominio/src/saldi.ts, packages/dominio/src/cicli.ts |
| Movimenti | packages/dominio/src/regole.ts, packages/dominio/src/soldi.ts, packages/web/src/pages/Movimenti.tsx |
| Stipendio | packages/dominio/src/cicli.ts, packages/web/src/pages/Stipendio.tsx |
| Conti | packages/dominio/src/saldi.ts, packages/dominio/src/repository.ts, packages/web/src/pages/Conti.tsx |
| Categorie e regole | packages/dominio/src/regole.ts, packages/dominio/src/validazioni.ts |
| Spese fisse | packages/dominio/src/ricorrenze.ts, packages/dominio/src/repository.ts |
| In attesa | packages/dominio/src/prospetto.ts (OccorrenzaFissa, stato pending/paid/skipped) |
| Previsioni | packages/dominio/src/prospetto.ts (BudgetDefault, BudgetOverride) |
| Grafici | packages/dominio/src/saldi.ts, fasi/fase-4-grafici-backup-rilascio/PIANO.md |
| Backup | fasi/fase-4-grafici-backup-rilascio/PIANO.md, CLAUDE.md (cartella dati, backup better-sqlite3) |
| Navigazione e layout | packages/web/src/layout/Layout.tsx |
