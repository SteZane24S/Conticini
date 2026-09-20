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
import {
  Bottone,
  Campo,
  Etichetta,
  Scheda,
  Tabella,
} from '../components/index.js';
import { useConti, useTrasferimenti } from './conti/dati.js';
import {
  STILE_AZIONI,
  STILE_CELLA_CARD,
  STILE_COLONNA_FORM,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_GRID_CONTENUTI,
  STILE_INTESTAZIONE,
  STILE_KICKER,
  STILE_PAGINA,
  STILE_RIGA_CARD,
  STILE_SEZIONE,
  STILE_TITOLO_SEZIONE,
  STILE_VALORE_CARD,
} from './conti/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€/u, '');
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
      <Campo etichetta="Nome" idCampo="conto-nome" errore={erroriCampo.nome}>
        <input
          id="conto-nome"
          className="input"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Saldo iniziale"
        idCampo="conto-saldo"
        errore={erroriCampo.saldoInizialeCents}
      >
        <input
          id="conto-saldo"
          className="input"
          type="text"
          inputMode="decimal"
          value={saldoTesto}
          onChange={(evento) => setSaldoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      <Campo
        etichetta="Data apertura"
        idCampo="conto-data"
        errore={erroriCampo.dataApertura}
      >
        <input
          id="conto-data"
          className="input"
          type="date"
          value={dataApertura}
          onChange={(evento) => setDataApertura(evento.target.value)}
          required
        />
      </Campo>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone type="submit" variante="primaria" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </Bottone>
        <Bottone type="button" variante="secondaria" onClick={onAnnulla}>
          Annulla
        </Bottone>
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
      <Campo etichetta="Data" idCampo="trasf-data" errore={erroriCampo.data}>
        <input
          id="trasf-data"
          className="input"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Da"
        idCampo="trasf-origine"
        errore={erroriCampo.contoOrigineId}
      >
        <select
          id="trasf-origine"
          className="input"
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
      </Campo>
      <Campo
        etichetta="A"
        idCampo="trasf-destinazione"
        errore={erroriCampo.contoDestinazioneId}
      >
        <select
          id="trasf-destinazione"
          className="input"
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
      </Campo>
      <Campo
        etichetta="Importo"
        idCampo="trasf-importo"
        errore={erroriCampo.amountCents}
      >
        <input
          id="trasf-importo"
          className="input"
          type="text"
          inputMode="decimal"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      <Campo
        etichetta="Descrizione"
        idCampo="trasf-descrizione"
        errore={erroriCampo.descrizione}
      >
        <input
          id="trasf-descrizione"
          className="input"
          value={descrizione}
          onChange={(evento) => setDescrizione(evento.target.value)}
          required
        />
      </Campo>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone type="submit" variante="primaria" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </Bottone>
        <Bottone type="button" variante="secondaria" onClick={onAnnulla}>
          Annulla
        </Bottone>
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
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Conti</h1>
      </div>

      {!caricando && conti.some((conto) => !conto.archiviato) && (
        <div style={STILE_RIGA_CARD}>
          {conti
            .filter((conto) => !conto.archiviato)
            .map((conto) => {
              const saldo = saldoDi(conto.id);
              return (
                <div style={STILE_CELLA_CARD} key={conto.id}>
                  <div style={STILE_KICKER}>{conto.nome}</div>
                  <div
                    style={{
                      ...STILE_VALORE_CARD,
                      color:
                        saldo !== null && saldo < 0
                          ? 'var(--rosso)'
                          : undefined,
                    }}
                  >
                    {saldo === null ? '—' : formatImporto(saldo)}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      <section style={STILE_SEZIONE}>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {erroreAzioneConto && (
          <p style={STILE_ERRORE_GENERALE}>{erroreAzioneConto}</p>
        )}

        {!caricando && conti.length > 0 && (
          <Tabella>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Saldo attuale</th>
                <th>Data apertura</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {conti.map((conto) => {
                const saldo = saldoDi(conto.id);
                return (
                  <tr key={conto.id}>
                    <td>{conto.nome}</td>
                    <td>{saldo === null ? '—' : formatImporto(saldo)}</td>
                    <td>{conto.dataApertura}</td>
                    <td>
                      {conto.archiviato ? (
                        <Etichetta variante="outline">Archiviato</Etichetta>
                      ) : (
                        'Attivo'
                      )}
                    </td>
                    <td>
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
                          <Bottone
                            variante="ghost"
                            onClick={() => setFormContoAperto(conto.id)}
                          >
                            Modifica
                          </Bottone>
                          {conto.archiviato ? (
                            <Bottone
                              variante="ghost"
                              onClick={() =>
                                void gestisciRiattivazione(conto.id)
                              }
                            >
                              Riattiva
                            </Bottone>
                          ) : (
                            <Bottone
                              variante="ghost"
                              onClick={() => setArchiviazioneInCorso(conto.id)}
                            >
                              Archivia
                            </Bottone>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Tabella>
        )}

        {!caricando && conti.length === 0 && <p>Nessun conto presente.</p>}
      </section>

      <div style={STILE_GRID_CONTENUTI}>
        <div style={STILE_COLONNA_FORM}>
          {formContoAperto === null && (
            <Bottone
              variante="secondaria"
              onClick={() => setFormContoAperto('nuovo')}
            >
              Nuovo conto
            </Bottone>
          )}

          {formContoAperto === 'nuovo' && (
            <Scheda titolo="Nuovo conto">
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
            </Scheda>
          )}

          {contoInModifica && (
            <Scheda titolo="Modifica conto">
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
            </Scheda>
          )}

          {formTrasferimentoAperto === null && (
            <Bottone
              variante="secondaria"
              onClick={() => setFormTrasferimentoAperto('nuovo')}
              disabled={conti.length < 2}
            >
              Nuovo trasferimento
            </Bottone>
          )}

          {formTrasferimentoAperto === 'nuovo' && (
            <Scheda titolo="Nuovo trasferimento">
              <TrasferimentoForm
                conti={conti}
                onSalva={async (dati) => {
                  await creaTrasferimento({
                    ...dati,
                    data: dati.data as DataISO,
                  });
                  setFormTrasferimentoAperto(null);
                }}
                onAnnulla={() => setFormTrasferimentoAperto(null)}
              />
            </Scheda>
          )}

          {trasferimentoInModifica && (
            <Scheda titolo="Modifica trasferimento">
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
            </Scheda>
          )}
        </div>

        <section style={STILE_SEZIONE}>
          <h2 style={STILE_TITOLO_SEZIONE}>Trasferimenti</h2>
          {caricandoTrasferimenti && <p>Caricamento…</p>}
          {erroreTrasferimenti && (
            <p style={STILE_ERRORE_GENERALE}>{erroreTrasferimenti}</p>
          )}
          {erroreAzioneTrasferimento && (
            <p style={STILE_ERRORE_GENERALE}>{erroreAzioneTrasferimento}</p>
          )}

          {!caricandoTrasferimenti && trasferimenti.length > 0 && (
            <Tabella>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Da</th>
                  <th>A</th>
                  <th>Importo</th>
                  <th>Descrizione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {trasferimenti.map((trasferimento) => (
                  <tr key={trasferimento.transferGroupId}>
                    <td>{trasferimento.data}</td>
                    <td>{nomeConto(trasferimento.contoOrigineId)}</td>
                    <td>{nomeConto(trasferimento.contoDestinazioneId)}</td>
                    <td>{formatImporto(trasferimento.amountCents)}</td>
                    <td>{trasferimento.descrizione}</td>
                    <td>
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
                          <Bottone
                            variante="ghost"
                            onClick={() =>
                              setFormTrasferimentoAperto(
                                trasferimento.transferGroupId,
                              )
                            }
                          >
                            Modifica
                          </Bottone>
                          <Bottone
                            variante="ghost"
                            onClick={() =>
                              setEliminazioneInCorso(
                                trasferimento.transferGroupId,
                              )
                            }
                          >
                            Elimina
                          </Bottone>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabella>
          )}

          {!caricandoTrasferimenti && trasferimenti.length === 0 && (
            <p>Nessun trasferimento presente.</p>
          )}
        </section>
      </div>
    </div>
  );
}
