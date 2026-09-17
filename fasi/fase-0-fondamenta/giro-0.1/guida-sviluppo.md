# Guida di sviluppo — giro 0.1

## Perché questa strada

Il giro ha seguito il perimetro previsto da `fasi/fase-0-fondamenta/PIANO.md` § Giro 0.1: prima la fondazione condivisa del monorepo, poi i pacchetti separati per dominio, contratti, server e web. TypeScript strict, `noUncheckedIndexedAccess`, ESLint flat config, Prettier e Vitest rendono espliciti i vincoli prima dell'implementazione applicativa.

Il confine del dominio è verificato con `no-restricted-imports`, includendo sia `node:*` sia `node:*/**`, così anche gli import Node con sottopercorso sono vietati. `better-sqlite3` è fissato alla versione esatta `12.10.0` e verificato come binario precompilato, senza compilazione locale.

## Rilievi e decisioni

Il pattern incompleto `node:*` in `eslint.config.js` è stato corretto aggiungendo `node:*/**`. La chiusura di `database` nel test SQLite è stata protetta spostandola in `finally`.

Lo script `dev` radice senza script omologhi ancora presenti nei pacchetti server e web è stato classificato fuori scope: il piano prevede lo script del server nel giro 0.2 e quello del web nel giro 0.3. Non è stato corretto; fino alla chiusura del giro 0.3, `npm run dev` dalla radice fallisce con `Missing script: dev`.

## Cosa non toccare

Il piano di progetto, `CLAUDE.md`, il codice sorgente e `.git/**` non fanno parte del lavoro documentale del giro. Il lockfile generato non va descritto file per file.

