import type { ContoDto, TrasferimentoDto } from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { ConfermaInline } from '../components/ConfermaInline.js';
import { useConti, useTrasferimenti } from './conti/dati.js';
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
} from './conti/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

interface DatiFormConto {
  nome: string;
  saldoInizialeCents: number;
  dataApertura: string;
}

interface ContoFormProps {
  contoIniziale?: ContoDto;
  onSalva: (dati: DatiFormConto) => Promise<unknown>;
  onAnnulla: () => void;
}

function ContoForm({ contoIniziale, onSalva, onAnnulla }: ContoFormProps) {
  const [nome, setNome] = useState(contoIniziale?.nome ?? '');
  const [saldoTesto, setSaldoTesto] = useState(
    contoIniziale
      ? formatImportoPerCampo(contoIniziale.saldoInizialeCents)
      : '0,00',
  );
  const [dataApertura, setDataApertura] = useState(
    contoIniziale?.dataApertura ?? oggiLocale(new Date()),
  );
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);

    let saldoInizialeCents: number;
    try {
      saldoInizialeCents = parseImporto(saldoTesto);
    } catch {
      setErroriCampo({ saldoInizialeCents: 'Importo non valido.' });
      return;
    }

    setSalvando(true);
    try {
      await onSalva({ nome, saldoInizialeCents, dataApertura });
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

  return (
    <form style={STILE_FORM} onSubmit={(evento) => void gestisciSalva(evento)}>
      <div style={STILE_CAMPO}>
        <label htmlFor="conto-nome">Nome</label>
        <input
          id="conto-nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
        />
        {erroriCampo.nome && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.nome}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="conto-saldo">Saldo iniziale</label>
        <input
          id="conto-saldo"
          value={saldoTesto}
          onChange={(evento) => setSaldoTesto(evento.target.value)}
        />
        {erroriCampo.saldoInizialeCents && (
          <span style={STILE_ERRORE_CAMPO}>
            {erroriCampo.saldoInizialeCents}
          </span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="conto-data">Data apertura</label>
        <input
          id="conto-data"
          type="date"
          value={dataApertura}
          onChange={(evento) => setDataApertura(evento.target.value)}
          required
        />
        {erroriCampo.dataApertura && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.dataApertura}</span>
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

interface DatiFormTrasferimento {
  data: string;
  amountCents: number;
  contoOrigineId: string;
  contoDestinazioneId: string;
  descrizione: string;
}

interface TrasferimentoFormProps {
  conti: ContoDto[];
  trasferimentoIniziale?: TrasferimentoDto;
  onSalva: (dati: DatiFormTrasferimento) => Promise<unknown>;
  onAnnulla: () => void;
}

function TrasferimentoForm({
  conti,
  trasferimentoIniziale,
  onSalva,
  onAnnulla,
}: TrasferimentoFormProps) {
  const [data, setData] = useState(
    trasferimentoIniziale?.data ?? oggiLocale(new Date()),
  );
  const [importoTesto, setImportoTesto] = useState(
    trasferimentoIniziale
      ? formatImportoPerCampo(trasferimentoIniziale.amountCents)
      : '0,00',
  );
  const [contoOrigineId, setContoOrigineId] = useState(
    trasferimentoIniziale?.contoOrigineId ?? conti[0]?.id ?? '',
  );
  const [contoDestinazioneId, setContoDestinazioneId] = useState(
    trasferimentoIniziale?.contoDestinazioneId ?? conti[1]?.id ?? '',
  );
  const [descrizione, setDescrizione] = useState(
    trasferimentoIniziale?.descrizione ?? '',
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
      await onSalva({
        data,
        amountCents,
        contoOrigineId,
        contoDestinazioneId,
        descrizione,
      });
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

  return (
    <form style={STILE_FORM} onSubmit={(evento) => void gestisciSalva(evento)}>
      <div style={STILE_CAMPO}>
        <label htmlFor="trasf-data">Data</label>
        <input
          id="trasf-data"
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
        <label htmlFor="trasf-origine">Da</label>
        <select
          id="trasf-origine"
          value={contoOrigineId}
          onChange={(evento) => setContoOrigineId(evento.target.value)}
          required
        >
          {conti.map((conto) => (
            <option key={conto.id} value={conto.id}>
              {conto.nome}
            </option>
          ))}
        </select>
        {erroriCampo.contoOrigineId && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.contoOrigineId}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="trasf-destinazione">A</label>
        <select
          id="trasf-destinazione"
          value={contoDestinazioneId}
          onChange={(evento) => setContoDestinazioneId(evento.target.value)}
          required
        >
          {conti.map((conto) => (
            <option key={conto.id} value={conto.id}>
              {conto.nome}
            </option>
          ))}
        </select>
        {erroriCampo.contoDestinazioneId && (
          <span style={STILE_ERRORE_CAMPO}>
            {erroriCampo.contoDestinazioneId}
          </span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="trasf-importo">Importo</label>
        <input
          id="trasf-importo"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
        />
        {erroriCampo.amountCents && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="trasf-descrizione">Descrizione</label>
        <input
          id="trasf-descrizione"
          value={descrizione}
          onChange={(evento) => setDescrizione(evento.target.value)}
          required
        />
        {erroriCampo.descrizione && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.descrizione}</span>
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

export function Conti() {
  const {
    conti,
    saldi,
    caricando,
    errore,
    crea,
    aggiorna,
    archivia,
    ricarica: contiRicarica,
  } = useConti();
  const {
    trasferimenti,
    caricando: caricandoTrasferimenti,
    errore: erroreTrasferimenti,
    crea: creaTrasferimento,
    aggiorna: aggiornaTrasferimento,
    elimina: eliminaTrasferimento,
  } = useTrasferimenti(contiRicarica);

  const [formContoAperto, setFormContoAperto] = useState<string | null>(null);
  const [archiviazioneInCorso, setArchiviazioneInCorso] = useState<
    string | null
  >(null);
  const [erroreAzioneConto, setErroreAzioneConto] = useState<string | null>(
    null,
  );

  const [formTrasferimentoAperto, setFormTrasferimentoAperto] = useState<
    string | null
  >(null);
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState<string | null>(
    null,
  );
  const [erroreAzioneTrasferimento, setErroreAzioneTrasferimento] = useState<
    string | null
  >(null);

  function saldoDi(contoId: string): number | null {
    return saldi.find((s) => s.contoId === contoId)?.saldoCents ?? null;
  }

  function nomeConto(contoId: string): string {
    return conti.find((c) => c.id === contoId)?.nome ?? contoId;
  }

  async function gestisciArchiviazione(id: string) {
    setErroreAzioneConto(null);
    try {
      await archivia(id);
    } catch (err) {
      setErroreAzioneConto(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setArchiviazioneInCorso(null);
    }
  }

  async function gestisciRiattivazione(id: string) {
    setErroreAzioneConto(null);
    try {
      await aggiorna(id, { archiviato: false });
    } catch (err) {
      setErroreAzioneConto(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    }
  }

  async function gestisciEliminazioneTrasferimento(gruppo: string) {
    setErroreAzioneTrasferimento(null);
    try {
      await eliminaTrasferimento(gruppo);
    } catch (err) {
      setErroreAzioneTrasferimento(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setEliminazioneInCorso(null);
    }
  }

  const contoInModifica =
    formContoAperto !== null && formContoAperto !== 'nuovo'
      ? conti.find((c) => c.id === formContoAperto)
      : undefined;

  const trasferimentoInModifica =
    formTrasferimentoAperto !== null && formTrasferimentoAperto !== 'nuovo'
      ? trasferimenti.find((t) => t.transferGroupId === formTrasferimentoAperto)
      : undefined;

  return (
    <div style={STILE_PAGINA}>
      <h1>Conti</h1>

      <section style={STILE_SEZIONE}>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {erroreAzioneConto && (
          <p style={STILE_ERRORE_GENERALE}>{erroreAzioneConto}</p>
        )}

        {!caricando && conti.length > 0 && (
          <table style={STILE_TABELLA}>
            <thead>
              <tr>
                <th style={STILE_CELLA}>Nome</th>
                <th style={STILE_CELLA}>Saldo attuale</th>
                <th style={STILE_CELLA}>Data apertura</th>
                <th style={STILE_CELLA}>Stato</th>
                <th style={STILE_CELLA}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {conti.map((conto) => {
                const saldo = saldoDi(conto.id);
                return (
                  <tr key={conto.id}>
                    <td style={STILE_CELLA}>{conto.nome}</td>
                    <td style={STILE_CELLA}>
                      {saldo === null ? '—' : formatImporto(saldo)}
                    </td>
                    <td style={STILE_CELLA}>{conto.dataApertura}</td>
                    <td style={STILE_CELLA}>
                      {conto.archiviato ? 'Archiviato' : 'Attivo'}
                    </td>
                    <td style={STILE_CELLA}>
                      {archiviazioneInCorso === conto.id ? (
                        <ConfermaInline
                          domanda="Archiviare il conto?"
                          onConferma={() =>
                            void gestisciArchiviazione(conto.id)
                          }
                          onAnnulla={() => setArchiviazioneInCorso(null)}
                        />
                      ) : (
                        <span style={STILE_AZIONI}>
                          <button
                            type="button"
                            onClick={() => setFormContoAperto(conto.id)}
                          >
                            Modifica
                          </button>
                          {conto.archiviato ? (
                            <button
                              type="button"
                              onClick={() =>
                                void gestisciRiattivazione(conto.id)
                              }
                            >
                              Riattiva
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setArchiviazioneInCorso(conto.id)}
                            >
                              Archivia
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!caricando && conti.length === 0 && <p>Nessun conto presente.</p>}

        {formContoAperto === null && (
          <button type="button" onClick={() => setFormContoAperto('nuovo')}>
            Nuovo conto
          </button>
        )}

        {formContoAperto === 'nuovo' && (
          <ContoForm
            onSalva={async (dati) => {
              await crea({
                ...dati,
                dataApertura: dati.dataApertura as DataISO,
              });
              setFormContoAperto(null);
            }}
            onAnnulla={() => setFormContoAperto(null)}
          />
        )}

        {contoInModifica && (
          <ContoForm
            contoIniziale={contoInModifica}
            onSalva={async (dati) => {
              await aggiorna(contoInModifica.id, {
                ...dati,
                dataApertura: dati.dataApertura as DataISO,
              });
              setFormContoAperto(null);
            }}
            onAnnulla={() => setFormContoAperto(null)}
          />
        )}
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Trasferimenti</h2>
        {caricandoTrasferimenti && <p>Caricamento…</p>}
        {erroreTrasferimenti && (
          <p style={STILE_ERRORE_GENERALE}>{erroreTrasferimenti}</p>
        )}
        {erroreAzioneTrasferimento && (
          <p style={STILE_ERRORE_GENERALE}>{erroreAzioneTrasferimento}</p>
        )}

        {!caricandoTrasferimenti && trasferimenti.length > 0 && (
          <table style={STILE_TABELLA}>
            <thead>
              <tr>
                <th style={STILE_CELLA}>Data</th>
                <th style={STILE_CELLA}>Da</th>
                <th style={STILE_CELLA}>A</th>
                <th style={STILE_CELLA}>Importo</th>
                <th style={STILE_CELLA}>Descrizione</th>
                <th style={STILE_CELLA}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {trasferimenti.map((trasferimento) => (
                <tr key={trasferimento.transferGroupId}>
                  <td style={STILE_CELLA}>{trasferimento.data}</td>
                  <td style={STILE_CELLA}>
                    {nomeConto(trasferimento.contoOrigineId)}
                  </td>
                  <td style={STILE_CELLA}>
                    {nomeConto(trasferimento.contoDestinazioneId)}
                  </td>
                  <td style={STILE_CELLA}>
                    {formatImporto(trasferimento.amountCents)}
                  </td>
                  <td style={STILE_CELLA}>{trasferimento.descrizione}</td>
                  <td style={STILE_CELLA}>
                    {eliminazioneInCorso === trasferimento.transferGroupId ? (
                      <ConfermaInline
                        domanda="Eliminare il trasferimento?"
                        onConferma={() =>
                          void gestisciEliminazioneTrasferimento(
                            trasferimento.transferGroupId,
                          )
                        }
                        onAnnulla={() => setEliminazioneInCorso(null)}
                      />
                    ) : (
                      <span style={STILE_AZIONI}>
                        <button
                          type="button"
                          onClick={() =>
                            setFormTrasferimentoAperto(
                              trasferimento.transferGroupId,
                            )
                          }
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEliminazioneInCorso(
                              trasferimento.transferGroupId,
                            )
                          }
                        >
                          Elimina
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!caricandoTrasferimenti && trasferimenti.length === 0 && (
          <p>Nessun trasferimento presente.</p>
        )}

        {formTrasferimentoAperto === null && (
          <button
            type="button"
            onClick={() => setFormTrasferimentoAperto('nuovo')}
            disabled={conti.length < 2}
          >
            Nuovo trasferimento
          </button>
        )}

        {formTrasferimentoAperto === 'nuovo' && (
          <TrasferimentoForm
            conti={conti}
            onSalva={async (dati) => {
              await creaTrasferimento({ ...dati, data: dati.data as DataISO });
              setFormTrasferimentoAperto(null);
            }}
            onAnnulla={() => setFormTrasferimentoAperto(null)}
          />
        )}

        {trasferimentoInModifica && (
          <TrasferimentoForm
            conti={conti}
            trasferimentoIniziale={trasferimentoInModifica}
            onSalva={async (dati) => {
              await aggiornaTrasferimento(
                trasferimentoInModifica.transferGroupId,
                {
                  ...dati,
                  data: dati.data as DataISO,
                },
              );
              setFormTrasferimentoAperto(null);
            }}
            onAnnulla={() => setFormTrasferimentoAperto(null)}
          />
        )}
      </section>
    </div>
  );
}
