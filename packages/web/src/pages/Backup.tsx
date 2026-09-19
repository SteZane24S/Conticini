import { useEffect, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { ConfermaInline } from '../components/ConfermaInline.js';
import { useBackup } from './backup/dati.js';
import {
  STILE_AZIONI,
  STILE_AVVISO,
  STILE_CAMPO,
  STILE_CELLA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_PAGINA,
  STILE_SEZIONE,
  STILE_TABELLA,
} from './backup/stili.js';

function formattaDimensione(byte: number): string {
  if (byte < 1024) {
    return `${byte} B`;
  }
  if (byte < 1024 * 1024) {
    return `${(byte / 1024).toFixed(1)} KB`;
  }
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

export function Backup() {
  const {
    impostazioni,
    backups,
    ultimo,
    ultimoVecchio,
    caricando,
    errore,
    eseguiOra,
    aggiornaImpostazioni,
    ripristina,
  } = useBackup();
  const [backupInCorso, setBackupInCorso] = useState(false);
  const [ripristinoInCorso, setRipristinoInCorso] = useState<string | null>(
    null,
  );
  const [ripristinoEseguendo, setRipristinoEseguendo] = useState<string | null>(
    null,
  );
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [messaggioAzione, setMessaggioAzione] = useState<string | null>(null);
  const [cartella, setCartella] = useState('');
  const [rotazione, setRotazione] = useState('');
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [dataDa, setDataDa] = useState('');
  const [dataA, setDataA] = useState('');

  useEffect(() => {
    if (impostazioni) {
      setCartella(impostazioni.cartella);
      setRotazione(String(impostazioni.rotazione));
    }
  }, [impostazioni]);

  async function gestisciBackup() {
    setErroreAzione(null);
    setMessaggioAzione(null);
    setBackupInCorso(true);
    try {
      await eseguiOra();
      setMessaggioAzione('Backup completato.');
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setBackupInCorso(false);
    }
  }

  async function gestisciRipristino(nomeFile: string) {
    setErroreAzione(null);
    setMessaggioAzione(null);
    setRipristinoEseguendo(nomeFile);
    setRipristinoInCorso(null);
    try {
      await ripristina(nomeFile);
      setMessaggioAzione('Ripristino completato.');
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setRipristinoInCorso(null);
      setRipristinoEseguendo(null);
    }
  }

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);
    setMessaggioAzione(null);

    const rotazioneNumero = Number(rotazione);
    if (!Number.isInteger(rotazioneNumero) || rotazioneNumero < 1) {
      setErroriCampo({
        rotazione: 'Inserire un numero intero maggiore di zero.',
      });
      return;
    }

    setSalvando(true);
    try {
      await aggiornaImpostazioni({ cartella, rotazione: rotazioneNumero });
      setMessaggioAzione('Impostazioni salvate.');
    } catch (err) {
      if (err instanceof ErroreApi) {
        if (err.campo) {
          setErroriCampo({ [err.campo]: err.message });
        } else {
          setErroreGenerale(err.message);
        }
      } else {
        setErroreGenerale('Errore imprevisto.');
      }
    } finally {
      setSalvando(false);
    }
  }

  const parametri = new URLSearchParams();
  if (dataDa) {
    parametri.set('dataDa', dataDa);
  }
  if (dataA) {
    parametri.set('dataA', dataA);
  }
  const query = parametri.size > 0 ? `?${parametri.toString()}` : '';

  return (
    <div style={STILE_PAGINA}>
      <h1>Backup</h1>

      <section style={STILE_SEZIONE}>
        <h2>Stato</h2>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
        {messaggioAzione && <p>{messaggioAzione}</p>}
        {!caricando && ultimo && (
          <p>
            Ultimo backup: {ultimo.quando.replace('T', ' ')} (
            {ultimo.dimensioneByte} byte,{' '}
            {formattaDimensione(ultimo.dimensioneByte)})
          </p>
        )}
        {!caricando && !ultimo && <p>Nessun backup eseguito finora.</p>}
        {!caricando && ultimoVecchio && (
          <p style={STILE_AVVISO}>L'ultimo backup ha più di 7 giorni.</p>
        )}
        <div style={STILE_AZIONI}>
          <button
            type="button"
            onClick={() => void gestisciBackup()}
            disabled={backupInCorso}
          >
            {backupInCorso ? 'Backup in corso…' : 'Esegui backup ora'}
          </button>
        </div>
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Backup disponibili</h2>
        {!caricando && backups.length > 0 && (
          <table style={STILE_TABELLA}>
            <thead>
              <tr>
                <th style={STILE_CELLA}>Nome file</th>
                <th style={STILE_CELLA}>Quando</th>
                <th style={STILE_CELLA}>Dimensione</th>
                <th style={STILE_CELLA}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.nomeFile}>
                  <td style={STILE_CELLA}>{backup.nomeFile}</td>
                  <td style={STILE_CELLA}>{backup.quando.replace('T', ' ')}</td>
                  <td style={STILE_CELLA}>
                    {backup.dimensioneByte} byte (
                    {formattaDimensione(backup.dimensioneByte)})
                  </td>
                  <td style={STILE_CELLA}>
                    {ripristinoInCorso === backup.nomeFile ? (
                      <ConfermaInline
                        domanda="Ripristinare da questo backup? Tutti i dati attuali verranno sostituiti con quelli del backup."
                        onConferma={() =>
                          void gestisciRipristino(backup.nomeFile)
                        }
                        onAnnulla={() => setRipristinoInCorso(null)}
                      />
                    ) : ripristinoEseguendo === backup.nomeFile ? (
                      <span>Ripristino in corso…</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRipristinoInCorso(backup.nomeFile)}
                      >
                        Ripristina
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!caricando && backups.length === 0 && (
          <p>Nessun backup disponibile.</p>
        )}
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Impostazioni</h2>
        {impostazioni && (
          <form
            style={STILE_FORM}
            onSubmit={(evento) => void gestisciSalva(evento)}
          >
            <div style={STILE_CAMPO}>
              <label htmlFor="backup-cartella">Cartella</label>
              <input
                id="backup-cartella"
                value={cartella}
                onChange={(evento) => setCartella(evento.target.value)}
                disabled={salvando}
                required
              />
              {erroriCampo.cartella && (
                <span style={STILE_ERRORE_CAMPO}>{erroriCampo.cartella}</span>
              )}
            </div>
            <div style={STILE_CAMPO}>
              <label htmlFor="backup-rotazione">
                Ogni quanti backup mantenerne
              </label>
              <input
                id="backup-rotazione"
                type="number"
                min={1}
                value={rotazione}
                onChange={(evento) => setRotazione(evento.target.value)}
                disabled={salvando}
                required
              />
              {erroriCampo.rotazione && (
                <span style={STILE_ERRORE_CAMPO}>{erroriCampo.rotazione}</span>
              )}
            </div>
            {erroreGenerale && (
              <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
            )}
            <div style={STILE_AZIONI}>
              <button type="submit" disabled={salvando}>
                {salvando ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Esportazione dati</h2>
        <div style={STILE_FORM}>
          <div style={STILE_CAMPO}>
            <label htmlFor="export-data-da">Da</label>
            <input
              id="export-data-da"
              type="date"
              value={dataDa}
              onChange={(evento) => setDataDa(evento.target.value)}
            />
          </div>
          <div style={STILE_CAMPO}>
            <label htmlFor="export-data-a">A</label>
            <input
              id="export-data-a"
              type="date"
              value={dataA}
              onChange={(evento) => setDataA(evento.target.value)}
            />
          </div>
          <a href={`/api/export/movimenti.csv${query}`}>
            Scarica CSV movimenti
          </a>
          <a href="/api/export/completo.json">Scarica export completo (JSON)</a>
        </div>
      </section>
    </div>
  );
}
