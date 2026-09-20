import { useEffect, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { Bottone, Campo, Dialogo, Tabella } from '../components/index.js';
import { useBackup } from './backup/dati.js';
import {
  STILE_AZIONI,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_INTESTAZIONE,
  STILE_PAGINA,
  STILE_SEZIONE,
  STILE_TITOLO_SEZIONE,
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
  const [backupDaConfermare, setBackupDaConfermare] = useState<string | null>(
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

  async function gestisciRipristino(nomeFile: string): Promise<boolean> {
    setErroreAzione(null);
    setMessaggioAzione(null);
    setRipristinoEseguendo(nomeFile);
    try {
      await ripristina(nomeFile);
      setMessaggioAzione('Ripristino completato.');
      return true;
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
      return false;
    } finally {
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
  const statoColore = !ultimo
    ? 'var(--rosso)'
    : ultimoVecchio
      ? 'var(--ambra)'
      : 'var(--verde)';
  const backupSelezionato =
    backupDaConfermare === null
      ? null
      : (backups.find((backup) => backup.nomeFile === backupDaConfermare) ??
        null);

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Backup</h1>
      </div>

      <section style={STILE_SEZIONE}>
        <div style={STILE_TITOLO_SEZIONE}>
          <h2 style={{ margin: 0, fontSize: '17px' }}>Stato</h2>
        </div>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
        {messaggioAzione && <p>{messaggioAzione}</p>}
        {!caricando && ultimo && (
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statoColore,
              }}
            />
            Ultimo backup: {ultimo.quando.replace('T', ' ')} (
            {ultimo.dimensioneByte} byte,{' '}
            {formattaDimensione(ultimo.dimensioneByte)})
          </p>
        )}
        {!caricando && !ultimo && (
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statoColore,
              }}
            />
            Nessun backup eseguito finora.
          </p>
        )}
        {!caricando && ultimoVecchio && (
          <p style={{ color: 'var(--ambra)' }}>
            L'ultimo backup ha più di 7 giorni.
          </p>
        )}
        <div style={STILE_AZIONI}>
          <Bottone
            variante="primaria"
            onClick={() => void gestisciBackup()}
            disabled={backupInCorso}
          >
            {backupInCorso ? 'Backup in corso…' : 'Esegui backup ora'}
          </Bottone>
        </div>
      </section>

      <section style={STILE_SEZIONE}>
        <div style={STILE_TITOLO_SEZIONE}>
          <h2 style={{ margin: 0, fontSize: '17px' }}>Backup disponibili</h2>
        </div>
        {!caricando && backups.length > 0 && (
          <Tabella>
            <thead>
              <tr>
                <th>Nome file</th>
                <th>Quando</th>
                <th>Dimensione</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => (
                <tr key={backup.nomeFile}>
                  <td>{backup.nomeFile}</td>
                  <td>{backup.quando.replace('T', ' ')}</td>
                  <td>
                    {backup.dimensioneByte} byte (
                    {formattaDimensione(backup.dimensioneByte)})
                  </td>
                  <td>
                    {ripristinoEseguendo === backup.nomeFile ? (
                      <span>Ripristino in corso…</span>
                    ) : (
                      <Bottone
                        variante="ghost"
                        onClick={() => setBackupDaConfermare(backup.nomeFile)}
                      >
                        Ripristina
                      </Bottone>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabella>
        )}
        {!caricando && backups.length === 0 && (
          <p>Nessun backup disponibile.</p>
        )}
      </section>

      <section style={STILE_SEZIONE}>
        <div style={STILE_TITOLO_SEZIONE}>
          <h2 style={{ margin: 0, fontSize: '17px' }}>Impostazioni</h2>
        </div>
        {impostazioni && (
          <form
            style={STILE_FORM}
            onSubmit={(evento) => void gestisciSalva(evento)}
          >
            <Campo
              etichetta="Cartella"
              idCampo="backup-cartella"
              errore={erroriCampo.cartella}
            >
              <input
                id="backup-cartella"
                className="input"
                value={cartella}
                onChange={(evento) => setCartella(evento.target.value)}
                disabled={salvando}
                required
              />
            </Campo>
            <Campo
              etichetta="Ogni quanti backup mantenerne"
              idCampo="backup-rotazione"
              errore={erroriCampo.rotazione}
            >
              <input
                id="backup-rotazione"
                className="input"
                type="number"
                min={1}
                value={rotazione}
                onChange={(evento) => setRotazione(evento.target.value)}
                disabled={salvando}
                required
              />
            </Campo>
            {erroreGenerale && (
              <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
            )}
            <div style={STILE_AZIONI}>
              <Bottone variante="primaria" type="submit" disabled={salvando}>
                {salvando ? 'Salvataggio…' : 'Salva'}
              </Bottone>
            </div>
          </form>
        )}
      </section>

      <section style={STILE_SEZIONE}>
        <div style={STILE_TITOLO_SEZIONE}>
          <h2 style={{ margin: 0, fontSize: '17px' }}>Esportazione dati</h2>
        </div>
        <div style={STILE_FORM}>
          <Campo etichetta="Da" idCampo="export-data-da">
            <input
              id="export-data-da"
              className="input"
              type="date"
              value={dataDa}
              onChange={(evento) => setDataDa(evento.target.value)}
            />
          </Campo>
          <Campo etichetta="A" idCampo="export-data-a">
            <input
              id="export-data-a"
              className="input"
              type="date"
              value={dataA}
              onChange={(evento) => setDataA(evento.target.value)}
            />
          </Campo>
          <a
            className="btn btn-secondary"
            href={`/api/export/movimenti.csv${query}`}
          >
            Scarica CSV movimenti
          </a>
          <a className="btn btn-secondary" href="/api/export/completo.json">
            Scarica export completo (JSON)
          </a>
        </div>
      </section>
      <Dialogo
        aperto={backupDaConfermare !== null}
        titolo="Ripristinare da questo backup?"
        onChiudi={() => setBackupDaConfermare(null)}
        azioni={
          <>
            <Bottone
              variante="primaria"
              disabled={
                backupDaConfermare !== null &&
                ripristinoEseguendo === backupDaConfermare
              }
              onClick={() => {
                const nomeFile = backupDaConfermare!;
                void gestisciRipristino(nomeFile).then((successo) => {
                  if (successo) {
                    setBackupDaConfermare((corrente) =>
                      corrente === nomeFile ? null : corrente,
                    );
                  }
                });
              }}
            >
              Ripristina
            </Bottone>
            <Bottone
              variante="secondaria"
              onClick={() => setBackupDaConfermare(null)}
            >
              Annulla
            </Bottone>
          </>
        }
      >
        {backupSelezionato && (
          <p>
            «{backupSelezionato.nomeFile}»,{' '}
            {backupSelezionato.quando.replace('T', ' ')}. Tutti i dati attuali
            verranno sostituiti con quelli di questo backup.
          </p>
        )}
        {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
      </Dialogo>
    </div>
  );
}
