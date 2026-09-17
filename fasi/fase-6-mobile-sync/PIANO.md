# Fase 6 — Mobile e sincronizzazione (futura)

**Segnaposto.** Questa fase non si esegue senza una nuova sessione di pianificazione su Opus.

## Vincoli già noti (tech-advisor, 17/09/2026)
- Il requisito "nessuna installazione, nessun server, nessun sito" **non è realizzabile** su Android e iOS. La via praticabile è una web app servita da un'origine HTTPS statica, senza backend: da quell'indirizzo passa solo il codice, mai i dati. Si usa dal browser o aggiunta alla schermata Home.
- Aprire un HTML direttamente da Google Drive non funziona: manca l'origine per il service worker e per OAuth.
- La persistenza nel browser (IndexedDB o SQLite WASM su OPFS) non è garantita contro la cancellazione: servono export completi e backup obbligatori. Le PWA sulla Home di iOS sono esentate dalla cancellazione dopo 7 giorni di ITP, ma non da quella fatta dall'utente.
- OAuth Google lato client con Google Identity Services (modello a token), scope `drive.appdata`. Serve un progetto Google Cloud con client OAuth e origini autorizzate; nessun client secret nel frontend. Il token scade: la sincronizzazione si fa all'apertura e su comando.
- Sincronizzazione a **pacchetti di modifiche immutabili** più snapshot versionati in `appDataFolder`, costruiti da `change_log`. Mai sincronizzare il file SQLite, mai un JSON unico sovrascritto. Conflitti su importi, conti e cancellazioni resi espliciti, non "vince l'ultimo".
- Il dominio e i servizi di `packages/dominio` si riusano nel browser con un adattatore di persistenza diverso: se servisse importare `fastify` o `better-sqlite3` nel client, il confine è stato violato.
