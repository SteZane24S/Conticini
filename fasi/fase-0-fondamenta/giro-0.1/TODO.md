# Giro 0.1 — Monorepo e tooling

## Intervallo di commit

`edec210..6676553` — un solo commit: `Giro 0.1 — Monorepo e tooling` (lo sha di arrivo è quello del commit finale, che include anche questo registro tramite `git commit --amend`).

## Cosa è stato fatto

Creato il monorepo npm workspaces con `packages/dominio`, `packages/contratti`, `packages/server` e `packages/web`. Predisposti TypeScript strict con `noUncheckedIndexedAccess`, ESLint flat config, Prettier, Vitest con test segnaposto in ogni pacchetto e gli script radice `build`, `test`, `lint`, `format`, `format:check` e `dev`.

In `packages/dominio/**`, `no-restricted-imports` vieta `node:*`, `node:*/**`, `fs`, `path`, `fastify`, `better-sqlite3`, `react` e `zod`.

`better-sqlite3` è installato in `packages/server` alla versione esatta `12.10.0`. L'installazione pulita ha scaricato un binario precompilato e non ha compilato localmente.

Diff del giro: `C:\Users\Stefa\AppData\Local\Temp\claude\C--Users-Stefa-OneDrive-Desktop-Conticini-sviluppo\f436f7b5-2d4f-4508-9ab3-ddee97879094\scratchpad\giro-0.1-finale.diff`; il lockfile generato è escluso dalla descrizione file per file.

## Gate ed esiti misurati

- `git diff --shortstat edec210..6676553` (intero commit del giro, registro incluso) → `26 files changed, 4418 insertions(+), 4 deletions(-)`.
- `git diff --shortstat edec210..6676553 -- . ':!package-lock.json'` (esclude il lockfile generato) → `25 files changed, 307 insertions(+), 4 deletions(-)`.
- `npm test` (dalla radice, dopo le correzioni) → 3 workspace con test (dominio, server, web), 8 file di test totali, 8 test totali, tutti superati.
- `npm run build` → verde, nessun errore TypeScript sui 4 pacchetti.
- `npm run lint` → verde, dopo la correzione del pattern ESLint.
- `npm run format:check` → verde, dopo aver riformattato il file corretto.

## Esecuzione e review

La prima ripresa dell'implementer (Codex, `gpt-5.6-terra`, effort `high`) si è fermata con `BLOCKED`: la sandbox senza accesso alla rete causava `EACCES` verso `registry.npmjs.org`; è stato verificato che non era un problema di rete reale. La seconda ripresa, con accesso abilitato, ha completato l'installazione pulita del binario precompilato, i quattro gate e l'esperimento di accettazione: import temporaneo di `fastify` in `packages/dominio/src/index.ts`, lint fallito come atteso per `no-restricted-imports`, import rimosso e lint tornato verde.

Bug-hunter (Claude Sonnet 5) e conformity (Codex `gpt-5.6-terra`) hanno prodotto tre rilievi; checker (Claude Sonnet 5) li ha verificati direttamente. Sono stati adjudicati così:

- **Fondato, severità alta — bug-hunter:** `group: ['node:*']` non copriva `node:fs/promises`, perché `*` non attraversa `/`. Corretto in `eslint.config.js` con `['node:*', 'node:*/**']`.
- **Fondato, severità bassa — bug-hunter:** `database.close()` non era eseguito se falliva l'assert. Corretto in `packages/server/src/sqlite-smoke.test.ts` spostando la chiusura in `finally`.
- **Fuori scope — conformity:** lo script `dev` radice invoca script ancora assenti in server e web. Il checker ha verificato che sono previsti dal piano nei giri 0.2 e 0.3; non è stato corretto.

Non è stato eseguito live-testing: il giro non tocca l'interfaccia e `packages/web` contiene solo lo scheletro TypeScript, senza Vite/React installato.

