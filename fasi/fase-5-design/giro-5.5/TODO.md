# Fase 5, giro 5.5 — Previsioni, Grafici, Backup

Chiuso il 20/09/2026 · commit 5c96970..<commit di questo giro>

## Fatto

- [x] Restilizzata Previsioni con card Totale previsto e Margine sull'accredito, colonna Settore e componenti condivisi, senza nuove chiamate API.
- [x] Restilizzata la cornice di Grafici con intestazione, selettore Ciclo/Periodo e contenitori, mantenendo invariati i tre grafici Recharts e la barra Totale.
- [x] Restilizzata Backup e migrata la conferma di Ripristina da `ConfermaInline` a `Dialogo`, con chiusura solo a operazione riuscita.
- [x] Corretti i cinque rilievi fondati di review: due costanti di stile inutilizzate e tre difetti di concorrenza, errore visibile e doppio invio in Backup.
- [x] Chiusa la Fase 5: completati i giri 5.1–5.5 previsti dal piano.

## Misurato

- `git diff --stat` sui 6 file del giro → 6 file cambiati, 421 inserimenti(+), 238 cancellazioni(-).
- `npm run build` dalla radice → verde su contratti, dominio, server e web.
- `npm test` dalla radice → verde, 338 test totali su 47 file: contratti 7/1, dominio 121/11, server 205/33, web 5/2.
- `npm run lint` dalla radice → verde, nessun errore.
- `npm run format:check` dalla radice → fallisce solo su `AGENTS.md` non tracciato; `npx prettier --check` mirato sui 6 file toccati → tutti conformi.
- Collaudo Chrome su `http://localhost:5173/`, server `127.0.0.1:47300`, dati `.dati-dev`, in tema chiaro e scuro → tre pagine verificate, un difetto preesistente, nessun errore di console o chiamata di rete fallita.

## Scostamenti dal brief

- Il difetto di validazione nativa del campo “Ogni quanti backup mantenerne” è stato rilevato nel collaudo ma non corretto: non è una regressione del giro e resta fuori scope.
- A inizio collaudo sono stati terminati 23 `node.exe` orfani di giri precedenti; è stata poi usata una sola istanza pulita, fermata a fine ciclo.

## Resta aperto

- La validazione nativa dei form può impedire la visualizzazione degli errori applicativi; da valutare in un giro futuro che tocchi la validazione generale.
- La pendenza preesistente su `AGENTS.md` non tracciato resta invariata; `npm run format:check` continua a fallire solo per quel file.
- Prossimo passo: Fase 6 — Mobile e sincronizzazione, con nuova sessione di pianificazione su Opus.
