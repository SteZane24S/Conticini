# Fase 2 — Persistenza e API, giro 2.1 — Schema e repository base
Chiuso il 17/09/2026 · Intervallo di commit: non ancora disponibile, il commit segue questo registro (HEAD di partenza: 92cefed8418ba9181812ed62314a8606fe319455)

## Fatto
- [x] Aggiunta la migrazione 001 con lo schema del modello dati, vincoli, indici e colonne di sincronizzazione.
- [x] Aggiunto il modulo centrale di scrittura transazionale con revisioni, `change_log`, tombstone e letture senza tombstone per default.
- [x] Aggiunti i test del repository base per log, rollback, cancellazioni, colonne riservate e identificativi inesistenti.
- [x] Aggiornati i test delle migrazioni e la configurazione TypeScript/Vitest necessaria a mantenere verdi i gate.

## Misurato
- `npm run build --workspaces --if-present`: superato.
- `npm test --workspaces --if-present`: 1/1 contratti, 113/113 dominio su 10 file, 24/24 server su 5 file, 1/1 web.
- `npm test -w packages/server`: 24/24 superati in due esecuzioni consecutive.
- `npm run lint`: superato.
- `npm run format:check`: fallisce solo su `AGENTS.md`, pendenza preesistente.

## Scostamenti dal brief
Sono stati aggiunti gli aggiornamenti numerici ai test delle migrazioni, l’esclusione dei test dai tre `tsconfig.json` e `fileParallelism: false` per il pacchetto server: conseguenze necessarie di difetti preesistenti esposti dalla nuova migrazione e dai test paralleli.

## Resta aperto
Il file `AGENTS.md` non tracciato resta invariato; la decisione sul suo destino è dell’utente. Il rilevamento ottimistico dei conflitti è rimandato alla fase 6, quando esisterà il consumer della sincronizzazione.

