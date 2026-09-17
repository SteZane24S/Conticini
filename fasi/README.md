# Registro delle fasi e dei giri

Ogni fase ha una cartella `fase-N-nome/` con il proprio `PIANO.md`, che dice perimetro, giri e
criteri di accettazione. Il `PIANO.md` di una fase si scrive in pianificazione e durante i giri non
si modifica.

## Un giro = una cartella
Alla chiusura di ogni giro `documentalista-agent` scrive `fase-N-nome/giro-N.M/` con due file:

- **`TODO.md`**: cosa è stato fatto, file toccati, intervallo di commit (`<sha>..<sha>`), esiti dei gate e numeri **misurati**, ognuno col comando che l'ha prodotto. Se non c'è una misura si scrive `nessuna misura`. Aggiunge le unità eseguite sulla ricaduta Sonnet, se ce ne sono state.
- **`guida-sviluppo.md`**: il perché. Le scelte fatte e le alternative scartate, i rilievi di review e come sono stati decisi (anche quelli scartati), cosa non va toccato e per quale ragione.

La cartella del giro la crea l'orchestratore prima di lanciare il documentalista.

## A fine giro, inoltre
`documentalista-agent` aggiorna `sviluppo/TODO.md`:
- riga di stato e prossimo giro;
- spunta del giro chiuso;
- pendenze (rilievi fondati ma fuori scope, domande in attesa, debiti accettati).

Non riordina e non riformula le voci vicine.

## Documenti superati
Si spostano in `sviluppo/storico/` conservando il path, previa conferma dell'utente.
