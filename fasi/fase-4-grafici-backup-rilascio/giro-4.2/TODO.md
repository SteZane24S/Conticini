# Fase 4, giro 4.2 — Backup, ripristino, export

Chiuso il 19/09/2026 · commit successivo a questo registro (precedente: 01b4cbeb3fd970996001e287488bd6f18b1bdaf5)

## Fatto

- [x] Implementato il motore server di backup e ripristino, con configurazione locale, rotazione, validazione, backup di sicurezza e migrazioni post-ripristino.
- [x] Aggiunte le API di stato, esecuzione, impostazioni e ripristino del backup.
- [x] Implementati export CSV dei movimenti ed export JSON completo con tombstone e metadati del dataset.
- [x] Integrate le rotte di export e backup nell'avvio del server, incluso il backup automatico prima delle migrazioni.
- [x] Trasformata la pagina web Backup in una pagina completa per stato, backup, ripristino, impostazioni ed esportazione.
- [x] Eseguito il collaudo in Chrome dello scenario backup → modifica → ripristino → dati coerenti.

## Misurato

- `npm run build` → verde su tutti e quattro i pacchetti; bundle web `dist/assets/index-x5VK8g5u.js` 852,15 kB, gzip 241,69 kB.
- `npm test` → verde; 338 test totali su 47 file: contratti 7/1, dominio 121/11, server 205/33, web 5/2.
- `npm run lint` → verde, nessun errore.
- `npm run format:check` → pulito sui file toccati; unico avviso residuo su `AGENTS.md`.
- `git diff --cached --shortstat` → 19 file cambiati, 1874 inserimenti, 10 cancellazioni.

## Scostamenti dal brief

Nessuno. Il presunto status 503 sull'export CSV è stato verificato come falso positivo dello strumento di automazione browser: le richieste dirette e tramite proxy hanno risposto 200.

## Resta aperto

- Prossimo giro: 4.3 — Rilascio in `app/`.
- La pendenza preesistente su `AGENTS.md` resta invariata.
- Nessun rilievo fondato resta fuori scope; il rilievo sul pattern Promise di `useBackup` è stato confermato fondato ma scartato dall'orchestratore, perché il file di riferimento usa già entrambi gli stili.
