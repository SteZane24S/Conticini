import { type MovimentoDto } from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useRef, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { ConfermaInline } from '../components/ConfermaInline.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import {
  cercaCandidatiCollegamento,
  useOccorrenzeInAttesa,
  type OccorrenzaInAttesa,
} from './in-attesa/dati.js';
import {
  STILE_AZIONI,
  STILE_CAMPO,
  STILE_CELLA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_PAGINA,
  STILE_SEZIONE,
  STILE_TABELLA,
} from './in-attesa/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

interface PannelloAperto {
  id: string;
  modo: 'conferma' | 'salta' | 'collega';
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
      <div style={STILE_CAMPO}>
        <label htmlFor={`occorrenza-data-${occorrenza.id}`}>Data</label>
        <input
          id={`occorrenza-data-${occorrenza.id}`}
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          required
        />
        {erroriCampo.data && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.data}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor={`occorrenza-importo-${occorrenza.id}`}>Importo</label>
        <input
          id={`occorrenza-importo-${occorrenza.id}`}
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
        />
        {erroriCampo.amountCents && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
        )}
      </div>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export function InAttesa() {
  const { conti } = useConti();
  const { categorie } = useAlbero();
  const { occorrenze, caricando, errore, conferma, salta, collega } =
    useOccorrenzeInAttesa();
  const [pannelloAperto, setPannelloAperto] = useState<PannelloAperto | null>(
    null,
  );
  const pannelloApertoRef = useRef<string | null>(null);
  const [candidati, setCandidati] = useState<MovimentoDto[]>([]);
  const [caricandoCandidati, setCaricandoCandidati] = useState(false);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [erroreCampoCollegamento, setErroreCampoCollegamento] = useState<
    string | null
  >(null);
  const oggi = oggiLocale(new Date());
  const scadute = occorrenze.filter((occorrenza) => occorrenza.scadenza < oggi);
  const prossime = occorrenze.filter(
    (occorrenza) => occorrenza.scadenza >= oggi,
  );
  function nomeConto(contoId: string) {
    return conti.find((conto) => conto.id === contoId)?.nome ?? contoId;
  }
  function nomeCategoria(categoriaId: string | null) {
    return categoriaId === null
      ? '—'
      : (categorie.find((categoria) => categoria.id === categoriaId)?.nome ??
          categoriaId);
  }
  function apriPannello(id: string, modo: PannelloAperto['modo']) {
    pannelloApertoRef.current = id;
    setErroreAzione(null);
    setErroreCampoCollegamento(null);
    setPannelloAperto({ id, modo });
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
  async function gestisciSalto(id: string) {
    setErroreAzione(null);
    try {
      await salta(id);
      setPannelloAperto(null);
      pannelloApertoRef.current = null;
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    }
  }
  async function gestisciCollegamento(id: string, movimentoId: string) {
    setErroreAzione(null);
    setErroreCampoCollegamento(null);
    try {
      await collega(id, { movimentoId });
      setPannelloAperto(null);
      pannelloApertoRef.current = null;
    } catch (err) {
      if (err instanceof ErroreApi) {
        if (err.campo) setErroreCampoCollegamento(err.message);
        else setErroreAzione(err.message);
      } else setErroreAzione('Errore imprevisto.');
    }
  }
  function tabella(occorrenzeSezione: OccorrenzaInAttesa[]) {
    return (
      <table style={STILE_TABELLA}>
        <thead>
          <tr>
            <th style={STILE_CELLA}>Nome</th>
            <th style={STILE_CELLA}>Scadenza</th>
            <th style={STILE_CELLA}>Importo previsto</th>
            <th style={STILE_CELLA}>Conto</th>
            <th style={STILE_CELLA}>Categoria</th>
            <th style={STILE_CELLA}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {occorrenzeSezione.map((occorrenza) => {
            const pannelloDiQuestaRiga = pannelloAperto?.id === occorrenza.id;
            return (
              <tr key={occorrenza.id}>
                <td style={STILE_CELLA}>{occorrenza.nome}</td>
                <td style={STILE_CELLA}>{occorrenza.scadenza}</td>
                <td style={STILE_CELLA}>
                  {formatImporto(occorrenza.amountCentsPrevisto)}
                </td>
                <td style={STILE_CELLA}>{nomeConto(occorrenza.contoId)}</td>
                <td style={STILE_CELLA}>
                  {nomeCategoria(occorrenza.categoriaId)}
                </td>
                <td style={STILE_CELLA}>
                  {pannelloDiQuestaRiga &&
                  pannelloAperto.modo === 'conferma' ? (
                    <ConfermaForm
                      occorrenza={occorrenza}
                      onSalva={async (data, amountCents) => {
                        await conferma(occorrenza.id, {
                          data: data as DataISO,
                          amountCents,
                        });
                        setPannelloAperto(null);
                        pannelloApertoRef.current = null;
                      }}
                      onAnnulla={() => {
                        setPannelloAperto(null);
                        pannelloApertoRef.current = null;
                      }}
                    />
                  ) : pannelloDiQuestaRiga &&
                    pannelloAperto.modo === 'salta' ? (
                    <ConfermaInline
                      domanda="Saltare questa occorrenza?"
                      onConferma={() => void gestisciSalto(occorrenza.id)}
                      onAnnulla={() => {
                        setPannelloAperto(null);
                        pannelloApertoRef.current = null;
                      }}
                    />
                  ) : pannelloDiQuestaRiga &&
                    pannelloAperto.modo === 'collega' ? (
                    <div style={STILE_SEZIONE}>
                      {caricandoCandidati && <p>Caricamento…</p>}
                      {!caricandoCandidati && candidati.length === 0 && (
                        <p>Nessun movimento simile trovato.</p>
                      )}
                      {!caricandoCandidati && candidati.length > 0 && (
                        <ul>
                          {candidati.map((movimento) => (
                            <li key={movimento.id}>
                              {movimento.data} —{' '}
                              {formatImporto(movimento.amountCents)} —{' '}
                              {movimento.descrizione}{' '}
                              <button
                                type="button"
                                onClick={() =>
                                  void gestisciCollegamento(
                                    occorrenza.id,
                                    movimento.id,
                                  )
                                }
                              >
                                Collega
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {erroreCampoCollegamento && (
                        <span style={STILE_ERRORE_CAMPO}>
                          {erroreCampoCollegamento}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPannelloAperto(null);
                          pannelloApertoRef.current = null;
                        }}
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <span style={STILE_AZIONI}>
                      <button
                        type="button"
                        onClick={() => apriPannello(occorrenza.id, 'conferma')}
                      >
                        Conferma
                      </button>
                      <button
                        type="button"
                        onClick={() => apriPannello(occorrenza.id, 'salta')}
                      >
                        Salta
                      </button>
                      <button
                        type="button"
                        onClick={() => void caricaCandidati(occorrenza)}
                      >
                        Collega a un movimento esistente
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  return (
    <div style={STILE_PAGINA}>
      <h1>In attesa</h1>
      {caricando && <p>Caricamento…</p>}
      {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
      {!caricando && (
        <>
          <section style={STILE_SEZIONE}>
            <h2>Scadute</h2>
            {scadute.length > 0 ? (
              tabella(scadute)
            ) : (
              <p>Nessuna occorrenza scaduta.</p>
            )}
          </section>
          <section style={STILE_SEZIONE}>
            <h2>Prossime</h2>
            {prossime.length > 0 ? (
              tabella(prossime)
            ) : (
              <p>Nessuna occorrenza in arrivo.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
