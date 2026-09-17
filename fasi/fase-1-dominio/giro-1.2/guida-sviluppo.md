# Guida di sviluppo — Giro 1.2

## Scopo

Questo giro aggiunge al dominio puro il saldo a una data, il ciclo stipendio→stipendio e il prospetto di previsione, secondo i requisiti congelati del piano. Le decisioni qui riportate servono a mantenere la formula coerente quando il lavoro verrà ripreso più avanti.

## Decisioni da preservare

Le fisse ancora da pagare scadute, cioè le arretrate con `scadenza <= D`, si calcolano sempre. Sono un fatto contabile riferito a D, non una previsione: restano visibili anche se non esiste un ciclo che contiene D oppure se manca la data prevista del prossimo stipendio E. Solo la parte in orizzonte, con scadenze in `(D, E)`, richiede un ciclo con E valida. Questa estensione della frase del piano “se manca E [...]: saldo e arretrati sì” è annotata anche nel codice, sopra il calcolo delle arretrate.

Per stabilire se un'occorrenza fissa è stata pagata entro D si usa la data del movimento collegato (`movimentoCollegato.data <= D`), non il campo `stato`. Di conseguenza, una voce con `stato: 'paid'` ma con movimento datato dopo D rimane un impegno nel prospetto a D. Il comportamento è verificato dal test 3.

L'orizzonte usa estremi aperti: `D < scadenza < E`. Una scadenza esattamente uguale a E è esclusa, come verifica il test 8. E è valida soltanto se è strettamente successiva a D; per `E <= D` il motivo è `orizzonte_superato`.

Nel calcolo di `dopoAccreditoCents` il controllo sull'importo previsto del ciclo è `!= null`, non `??`. Così un importo previsto pari a 0 centesimi, pur essendo un caso limite legittimo, viene trattato come presente.

## Review e decisioni

`bug-hunter` ha restituito `RILIEVI: 0`: ha ricalcolato manualmente i confronti di date stretti e non stretti della formula e l'intero esempio del test 9, con piena corrispondenza tra codice, test e formula congelata.

`conformity` ha restituito `RILIEVI: 0`: non ha rilevato violazioni del confine di `packages/dominio`, duplicazioni di helper esistenti o difformità dallo stile di `date.ts`, `soldi.ts` e `ricorrenze.ts`.

Non ci sono stati rilievi da adjudicare, quindi il `checker` non è stato lanciato. Non sono state applicate correzioni successive alla prima implementazione.

## Cosa non toccare

Non validare `arretrate` soltanto quando esiste un ciclo: si perderebbe la garanzia che saldo e arretrati restino visibili prima del primo stipendio o quando manca l'orizzonte.

Non usare `stato` per decidere se una fissa è pagata entro D: la decisione deve dipendere sempre dalla data del `movimentoCollegato`.

Non aggiungere un campo `mode` (auto/manuale) a `OccorrenzaFissa`: appartiene alla fase 2, dedicata al catch-up delle ricorrenze, non alla formula del prospetto.

## Verifiche e ambiente

I test obbligatori del giro hanno superato 15 test, la suite completa del monorepo 179 test; build, lint e controllo della formattazione sono superati. I comandi eseguiti sono riportati in `TODO.md`.

Su questa macchina PowerShell blocca `npm.ps1` per la execution policy: usare `npm.cmd` per i comandi npm.

Il commit del giro non è ancora stato creato; segue la scrittura del registro.
