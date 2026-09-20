import { type MovimentoDto } from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useRef, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { Bottone, Campo, Dialogo } from '../components/index.js';
import {
  cercaCandidatiCollegamento,
  useOccorrenzeInAttesa,
  type OccorrenzaInAttesa,
} from './in-attesa/dati.js';
import {
  STILE_AZIONI,
  STILE_CARD,
  STILE_DESCRIZIONE,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_INTESTAZIONE,
  STILE_INTESTAZIONE_CARD,
  STILE_LISTA,
  STILE_NOME_OCCORRENZA,
  STILE_PAGINA,
  STILE_VUOTO,
} from './in-attesa/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

function giorniDiScarto(scadenza: string, oggi: string): number {
  return Math.round(
    (new Date(`${scadenza}T00:00:00Z`).getTime() -
      new Date(`${oggi}T00:00:00Z`).getTime()) /
      -86400000,
  );
}

interface PannelloAperto {
  id: string;
  modo: 'conferma' | 'collega';
}

function ConfermaForm({
  occorrenza,
  onSalva,
  onAnnulla,
}: {
  occorrenza: OccorrenzaInAttesa;
  onSalva: (data: string, amountCents: number) => Promise<unknown>;
  onAnnulla: () => void;
}) {
  const [data, setData] = useState(occorrenza.scadenza);
  const [importoTesto, setImportoTesto] = useState(
    formatImportoPerCampo(occorrenza.amountCentsPrevisto),
  );
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);
    let amountCents: number;
    try {
      amountCents = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ amountCents: 'Importo non valido.' });
      return;
    }
    setSalvando(true);
    try {
      await onSalva(data, amountCents);
    } catch (err) {
      if (err instanceof ErroreApi) {
        if (err.campo) setErroriCampo({ [err.campo]: err.message });
        else setErroreGenerale(err.message);
      } else setErroreGenerale('Errore imprevisto.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form style={STILE_FORM} onSubmit={(evento) => void gestisciSalva(evento)}>
      <Campo
        etichetta="Data"
        idCampo={`occorrenza-data-${occorrenza.id}`}
        errore={erroriCampo.data}
      >
        <input
          id={`occorrenza-data-${occorrenza.id}`}
          className="input"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Importo"
        idCampo={`occorrenza-importo-${occorrenza.id}`}
        errore={erroriCampo.amountCents}
      >
        <input
          id={`occorrenza-importo-${occorrenza.id}`}
          className="input"
          type="text"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </Bottone>
        <Bottone variante="secondaria" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

export function InAttesa() {
  const { occorrenze, caricando, errore, conferma, salta, collega } =
    useOccorrenzeInAttesa();
  const [pannelloAperto, setPannelloAperto] = useState<PannelloAperto | null>(
    null,
  );
  const [idDaSaltare, setIdDaSaltare] = useState<string | null>(null);
  const pannelloApertoRef = useRef<string | null>(null);
  const [candidati, setCandidati] = useState<MovimentoDto[]>([]);
  const [caricandoCandidati, setCaricandoCandidati] = useState(false);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [erroreCampoCollegamento, setErroreCampoCollegamento] = useState<
    string | null
  >(null);
  const oggi = oggiLocale(new Date());
  const occorrenzeOrdinate = [...occorrenze].sort((prima, seconda) =>
    prima.scadenza.localeCompare(seconda.scadenza),
  );
  const occorrenzaDaSaltare =
    idDaSaltare === null
      ? null
      : (occorrenze.find((occorrenza) => occorrenza.id === idDaSaltare) ??
        null);

  function apriPannello(id: string, modo: PannelloAperto['modo']) {
    pannelloApertoRef.current = id;
    setErroreAzione(null);
    setErroreCampoCollegamento(null);
    setPannelloAperto({ id, modo });
  }

  function chiudiPannello() {
    setPannelloAperto(null);
    pannelloApertoRef.current = null;
  }

  async function caricaCandidati(occorrenza: OccorrenzaInAttesa) {
    apriPannello(occorrenza.id, 'collega');
    setCandidati([]);
    setCaricandoCandidati(true);
    try {
      const risultati = await cercaCandidatiCollegamento(occorrenza);
      if (pannelloApertoRef.current !== occorrenza.id) return;
      setCandidati(risultati);
    } catch (err) {
      if (pannelloApertoRef.current !== occorrenza.id) return;
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      if (pannelloApertoRef.current === occorrenza.id) {
        setCaricandoCandidati(false);
      }
    }
  }

  async function gestisciSalto(id: string): Promise<boolean> {
    setErroreAzione(null);
    try {
      await salta(id);
      return true;
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
      return false;
    }
  }

  async function gestisciCollegamento(id: string, movimentoId: string) {
    setErroreAzione(null);
    setErroreCampoCollegamento(null);
    try {
      await collega(id, { movimentoId });
      chiudiPannello();
    } catch (err) {
      if (err instanceof ErroreApi) {
        if (err.campo) setErroreCampoCollegamento(err.message);
        else setErroreAzione(err.message);
      } else setErroreAzione('Errore imprevisto.');
    }
  }

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>In attesa</h1>
        {occorrenze.length > 0 && (
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>
            {occorrenze.length}{' '}
            {occorrenze.length === 1
              ? 'occorrenza da confermare'
              : 'occorrenze da confermare'}
          </span>
        )}
      </div>
      <p style={STILE_DESCRIZIONE}>
        Occorrenze di spese fisse manuali arrivate a scadenza: conferma con
        l'importo reale, salta il ciclo, oppure collegale a un movimento già
        registrato.
      </p>
      {caricando && <p>Caricamento…</p>}
      {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
      {!caricando && (
        <div style={STILE_LISTA}>
          {occorrenzeOrdinate.length === 0 ? (
            <div style={STILE_VUOTO}>
              Niente in attesa: tutte le occorrenze manuali sono confermate o
              saltate.
            </div>
          ) : (
            occorrenzeOrdinate.map((occorrenza) => {
              const giorni = giorniDiScarto(occorrenza.scadenza, oggi);
              const stato =
                giorni > 0
                  ? `arretrata di ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`
                  : giorni === 0
                    ? 'in scadenza oggi'
                    : `in arrivo tra ${-giorni} ${-giorni === 1 ? 'giorno' : 'giorni'}`;
              const coloreStato = giorni > 0 ? 'var(--rosso)' : 'var(--ambra)';
              const coloreBordo =
                giorni > 0 ? 'var(--color-accent)' : 'var(--ambra)';
              const pannelloDiQuestaCard = pannelloAperto?.id === occorrenza.id;

              return (
                <div
                  key={occorrenza.id}
                  style={{
                    ...STILE_CARD,
                    borderLeft: `4px solid ${coloreBordo}`,
                  }}
                >
                  <div style={STILE_INTESTAZIONE_CARD}>
                    <span style={STILE_NOME_OCCORRENZA}>{occorrenza.nome}</span>
                    <span
                      style={{
                        color: coloreStato,
                        fontSize: '12px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {stato}
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        color: 'var(--muted)',
                        fontSize: '12.5px',
                      }}
                    >
                      previsti {formatImporto(occorrenza.amountCentsPrevisto)}
                    </span>
                  </div>
                  {pannelloDiQuestaCard &&
                  pannelloAperto.modo === 'conferma' ? (
                    <ConfermaForm
                      occorrenza={occorrenza}
                      onSalva={async (data, amountCents) => {
                        await conferma(occorrenza.id, {
                          data: data as DataISO,
                          amountCents,
                        });
                        chiudiPannello();
                      }}
                      onAnnulla={chiudiPannello}
                    />
                  ) : pannelloDiQuestaCard &&
                    pannelloAperto.modo === 'collega' ? (
                    <div style={STILE_FORM}>
                      {caricandoCandidati && <p>Caricamento…</p>}
                      {!caricandoCandidati && candidati.length === 0 && (
                        <p>Nessun movimento simile trovato.</p>
                      )}
                      {!caricandoCandidati && candidati.length > 0 && (
                        <div style={STILE_FORM}>
                          {candidati.map((movimento) => (
                            <div key={movimento.id} style={STILE_AZIONI}>
                              <span>
                                {movimento.data} —{' '}
                                {formatImporto(movimento.amountCents)} —{' '}
                                {movimento.descrizione}
                              </span>
                              <Bottone
                                variante="ghost"
                                onClick={() =>
                                  void gestisciCollegamento(
                                    occorrenza.id,
                                    movimento.id,
                                  )
                                }
                              >
                                Collega
                              </Bottone>
                            </div>
                          ))}
                        </div>
                      )}
                      {erroreCampoCollegamento && (
                        <span style={STILE_ERRORE_CAMPO}>
                          {erroreCampoCollegamento}
                        </span>
                      )}
                      <div style={STILE_AZIONI}>
                        <Bottone variante="secondaria" onClick={chiudiPannello}>
                          Annulla
                        </Bottone>
                      </div>
                    </div>
                  ) : (
                    <div style={STILE_AZIONI}>
                      <Bottone
                        variante="primaria"
                        onClick={() => apriPannello(occorrenza.id, 'conferma')}
                      >
                        Conferma
                      </Bottone>
                      <Bottone
                        variante="secondaria"
                        onClick={() => setIdDaSaltare(occorrenza.id)}
                      >
                        Salta
                      </Bottone>
                      <Bottone
                        variante="ghost"
                        onClick={() => void caricaCandidati(occorrenza)}
                      >
                        Collega a un movimento esistente
                      </Bottone>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
      <Dialogo
        aperto={idDaSaltare !== null}
        titolo="Saltare questa occorrenza?"
        onChiudi={() => setIdDaSaltare(null)}
        azioni={
          <>
            <Bottone
              variante="primaria"
              onClick={() =>
                void gestisciSalto(idDaSaltare!).then((successo) => {
                  if (successo) setIdDaSaltare(null);
                })
              }
            >
              Salta
            </Bottone>
            <Bottone variante="secondaria" onClick={() => setIdDaSaltare(null)}>
              Annulla
            </Bottone>
          </>
        }
      >
        {occorrenzaDaSaltare && (
          <>
            «{occorrenzaDaSaltare.nome}» non verrà registrata per la scadenza
            del {occorrenzaDaSaltare.scadenza} e uscirà dal prospetto.
          </>
        )}
      </Dialogo>
    </div>
  );
}
