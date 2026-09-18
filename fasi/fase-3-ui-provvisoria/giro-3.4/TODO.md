# Fase 3, giro 3.4 — Previsioni; prospetto
Chiuso il 18/09/2026 · commit successivo a questo registro (precedente: f570d4406034981acf0fd2d60d2bac44ca254baa)

## Fatto
- [x] Nuova pagina `packages/web/src/pages/Previsioni.tsx` con budget default, selezione del ciclo, override e valori del prospetto
- [x] Nuova pagina `packages/web/src/pages/Prospetto.tsx`, impostata come pagina iniziale, con saldi, fisse, previsioni e saldo previsto
- [x] Aggiunto il parametro opzionale `tutte=true` a `GET /api/occorrenze` per arricchire correttamente le spese fisse non pending
- [x] Corretto il pulsante Annulla dei form inline di Previsioni durante il salvataggio

## Misurato
- `npm run build` → verde; web: 248 moduli trasformati
- `npm test` → verde; 304 test passati su 42 file
- `npm run lint` → verde; nessun errore
- `npm run format:check` → pulito sui file toccati; avviso residuo su `AGENTS.md`

## Scostamenti dal brief
- Il collaudo ha richiesto un riavvio del server per attivare il catch-up retroattivo, limite noto e non introdotto da questo giro.
- Nessun rilievo di review è rimasto fuori scope: i due rilievi fondati sono stati corretti e riverificati.

## Resta aperto
- Fase 3 chiusa; tutti i giri 3.1-3.4 completati.
- Il catch-up retroattivo resta da valutare in un giro futuro che tocchi `packages/server`; la pendenza preesistente su `AGENTS.md` resta invariata.
- Prossimo giro: 4.1 — Grafici, da `fasi/fase-4-grafici-backup-rilascio/PIANO.md`.
