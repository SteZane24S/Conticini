# Fase 1 — Dominio puro, giro 1.3 — Normalizzazione, regole e validazioni
Chiuso il 17/09/2026 · Intervallo di commit: non ancora disponibile, il commit segue questo registro (HEAD di partenza: cca6c3c1a70a35a7579e43f56e131d13e3197ce8)

## Fatto
- [x] Aggiunte normalizzazione del testo, regole di categoria e ranking dei suggerimenti di descrizione e categoria.
- [x] Aggiunte validazioni tipizzate per trasferimenti, segno della categoria, apertura del conto e vincolo previsione/fissa.
- [x] Definite le interfacce asincrone dei repository e `ServizioApprendimento`, con esportazione dal dominio.
- [x] Corretta la gestione dei limiti non positivi nei suggerimenti e uniformata la forma degli import del repository.

## Misurato
- `npm.cmd run build` (root): superato; compilati tutti i workspace (dominio, server, web).
- `npm.cmd test` (root): 261 test superati su 29 file di test (dominio 226/20, server 34/8, web 1/1).
- `npm.cmd test --workspace @conticini/dominio -- src/testo.test.ts src/regole.test.ts src/validazioni.test.ts`: 42 test superati su 3 file.
- `npm.cmd run lint` (root): superato.
- `npm.cmd run format:check` (root): superato.

## Scostamenti dal brief
Nessuno.

## Resta aperto
La progettazione delle interfacce per catch-up delle ricorrenze, backup ed export è rimandata alla fase 2, quando i relativi requisiti saranno istruiti.

