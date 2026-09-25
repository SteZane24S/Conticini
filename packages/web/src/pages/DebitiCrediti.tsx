import {
  type ContoDto,
  type CreaPosizioneInput,
  type CreaSaldamentoInput,
  type MovimentoDto,
  type PosizioneDto,
} from '@conticini/contratti';
import {
  calcolaTotaleNetto,
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useRef, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import {
  Bottone,
  Campo,
  ControlloSegmentato,
  Dialogo,
  Etichetta,
  Scheda,
} from '../components/index.js';
import { caricaSaldamenti, useDebitiCrediti } from './debiti-crediti/dati.js';
import {
  STILE_AZIONI,
  STILE_CARD,
  STILE_COLONNA_SALDO_PRINCIPALE,
  STILE_COLONNA_SALDO_SECONDARIA,
  STILE_DESCRIZIONE,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_INTESTAZIONE,
  STILE_INTESTAZIONE_CARD,
  STILE_KICKER,
  STILE_LISTA,
  STILE_NOME_OCCORRENZA,
  STILE_NUMERO_GRANDE,
  STILE_NUMERO_MEDIO,
  STILE_PAGINA,
  STILE_RIQUADRO_SALDO,
  STILE_VUOTO,
} from './debiti-crediti/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

function NuovaPosizioneForm({
  onSalva,
}: {
  onSalva: (dati: CreaPosizioneInput) => Promise<unknown>;
}) {
  const [verso, setVerso] = useState<'debito' | 'credito'>('debito');
  const [descrizione, setDescrizione] = useState('');
  const [importoTesto, setImportoTesto] = useState('');
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);
    let importoCents: number;
    try {
      importoCents = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ importoCents: 'Importo non valido.' });
      return;
    }
    if (importoCents <= 0) {
      setErroriCampo({ importoCents: "L'importo deve essere positivo." });
      return;
    }
    setSalvando(true);
    try {
      await onSalva({ descrizione, verso, importoCents });
      setDescrizione('');
      setImportoTesto('');
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
      <ControlloSegmentato
        nome="posizione-verso"
        valore={verso}
        onCambio={(valore) => setVerso(valore as 'debito' | 'credito')}
        opzioni={[
          { valore: 'debito', etichetta: 'Debito (devo io)' },
          { valore: 'credito', etichetta: 'Credito (mi devono)' },
        ]}
      />
      <Campo
        etichetta="Descrizione"
        idCampo="posizione-descrizione"
        errore={erroriCampo.descrizione}
      >
        <input
          id="posizione-descrizione"
          className="input"
          type="text"
          value={descrizione}
          onChange={(evento) => setDescrizione(evento.target.value)}
          placeholder="Es. prestito a Maria"
          required
        />
      </Campo>
      <Campo
        etichetta="Importo"
        idCampo="posizione-importo"
        errore={erroriCampo.importoCents}
      >
        <input
          id="posizione-importo"
          className="input"
          type="text"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          required
        />
      </Campo>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Aggiungi'}
        </Bottone>
      </div>
    </form>
  );
}

function SaldaForm({
  posizione,
  conti,
  onSalva,
  onAnnulla,
}: {
  posizione: PosizioneDto;
  conti: ContoDto[];
  onSalva: (dati: CreaSaldamentoInput) => Promise<unknown>;
  onAnnulla: () => void;
}) {
  const contiAttivi = conti.filter((conto) => !conto.archiviato);
  const [contoId, setContoId] = useState(
    contiAttivi.length === 1 ? contiAttivi[0]!.id : '',
  );
  const [importoTesto, setImportoTesto] = useState(
    formatImportoPerCampo(Math.abs(posizione.residuoCents)),
  );
  const [data, setData] = useState(oggiLocale(new Date()));
  const [operazioneId] = useState(() => crypto.randomUUID());
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);
    let importoCents: number;
    try {
      importoCents = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ importoCents: 'Importo non valido.' });
      return;
    }
    if (importoCents <= 0) {
      setErroriCampo({ importoCents: "L'importo deve essere positivo." });
      return;
    }
    if (importoCents > Math.abs(posizione.residuoCents)) {
      setErroriCampo({ importoCents: "L'importo supera il residuo." });
      return;
    }
    setSalvando(true);
    try {
      await onSalva({ contoId, importoCents, data, operazioneId });
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
      <Campo etichetta="Conto" idCampo={`saldamento-conto-${posizione.id}`}>
        <select
          id={`saldamento-conto-${posizione.id}`}
          className="input"
          value={contoId}
          onChange={(evento) => setContoId(evento.target.value)}
          required
        >
          <option value="">Seleziona un conto</option>
          {contiAttivi.map((conto) => (
            <option key={conto.id} value={conto.id}>
              {conto.nome}
            </option>
          ))}
        </select>
      </Campo>
      {erroriCampo.contoId && (
        <span style={STILE_ERRORE_CAMPO}>{erroriCampo.contoId}</span>
      )}
      <Campo
        etichetta="Importo"
        idCampo={`saldamento-importo-${posizione.id}`}
        errore={erroriCampo.importoCents}
      >
        <input
          id={`saldamento-importo-${posizione.id}`}
          className="input"
          type="text"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      <Campo etichetta="Data" idCampo={`saldamento-data-${posizione.id}`}>
        <input
          id={`saldamento-data-${posizione.id}`}
          className="input"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value as DataISO)}
          required
        />
      </Campo>
      {erroriCampo.data && (
        <span style={STILE_ERRORE_CAMPO}>{erroriCampo.data}</span>
      )}
      <div style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
        Verrà registrato un movimento di{' '}
        {posizione.verso === 'debito' ? 'uscita' : 'entrata'} sul conto scelto.
      </div>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salda'}
        </Bottone>
        <Bottone variante="secondaria" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

interface PannelloAperto {
  id: string;
  modo: 'salda' | 'saldamenti';
}

function posizioniOrdinate(
  posizioni: PosizioneDto[],
  verso: 'debito' | 'credito',
): PosizioneDto[] {
  const ordinaPerData = (prima: PosizioneDto, seconda: PosizioneDto) =>
    prima.dataApertura.localeCompare(seconda.dataApertura);
  const dellaDirezione = posizioni.filter(
    (posizione) => posizione.verso === verso,
  );
  return [
    ...dellaDirezione
      .filter((posizione) => posizione.residuoCents !== 0)
      .sort(ordinaPerData),
    ...dellaDirezione
      .filter((posizione) => posizione.residuoCents === 0)
      .sort(ordinaPerData),
  ];
}

export function DebitiCrediti() {
  const {
    posizioni,
    conti,
    soldiSuiContiCents,
    caricando,
    errore,
    crea,
    elimina,
    salda,
    annullaSaldamento,
  } = useDebitiCrediti();
  const [pannelloAperto, setPannelloAperto] = useState<PannelloAperto | null>(
    null,
  );
  const pannelloApertoRef = useRef<string | null>(null);
  const richiestaSaldamentiCorrente = useRef(0);
  const [saldamenti, setSaldamenti] = useState<MovimentoDto[]>([]);
  const [caricandoSaldamenti, setCaricandoSaldamenti] = useState(false);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const [idDaEliminare, setIdDaEliminare] = useState<string | null>(null);
  const [inviandoDialogo, setInviandoDialogo] = useState(false);
  const [saldamentoDaAnnullare, setSaldamentoDaAnnullare] =
    useState<MovimentoDto | null>(null);
  const totaleNetto = calcolaTotaleNetto(soldiSuiContiCents, posizioni);
  const posizioneDaEliminare =
    idDaEliminare === null
      ? null
      : (posizioni.find((posizione) => posizione.id === idDaEliminare) ?? null);

  function apriPannello(id: string, modo: PannelloAperto['modo']) {
    pannelloApertoRef.current = id;
    setErroreAzione(null);
    setPannelloAperto({ id, modo });
  }

  function chiudiPannello() {
    pannelloApertoRef.current = null;
    setPannelloAperto(null);
  }

  async function caricaSaldamentiPosizione(posizioneId: string) {
    const richiesta = ++richiestaSaldamentiCorrente.current;
    setSaldamenti([]);
    setCaricandoSaldamenti(true);
    try {
      const risultati = await caricaSaldamenti(posizioneId);
      if (
        richiestaSaldamentiCorrente.current !== richiesta ||
        pannelloApertoRef.current !== posizioneId
      )
        return;
      setSaldamenti(risultati);
    } catch (err) {
      if (
        richiestaSaldamentiCorrente.current !== richiesta ||
        pannelloApertoRef.current !== posizioneId
      )
        return;
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      if (
        richiestaSaldamentiCorrente.current === richiesta &&
        pannelloApertoRef.current === posizioneId
      ) {
        setCaricandoSaldamenti(false);
      }
    }
  }

  function apriSaldamenti(posizioneId: string) {
    apriPannello(posizioneId, 'saldamenti');
    void caricaSaldamentiPosizione(posizioneId);
  }

  async function gestisciEliminazione(id: string): Promise<boolean> {
    setErroreAzione(null);
    setInviandoDialogo(true);
    try {
      await elimina(id);
      return true;
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
      return false;
    } finally {
      setInviandoDialogo(false);
    }
  }

  async function gestisciAnnullamento(
    movimento: MovimentoDto,
  ): Promise<boolean> {
    setErroreAzione(null);
    setInviandoDialogo(true);
    try {
      await annullaSaldamento(movimento.id);
      if (movimento.posizioneId !== null) {
        void caricaSaldamentiPosizione(movimento.posizioneId);
      }
      return true;
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
      return false;
    } finally {
      setInviandoDialogo(false);
    }
  }

  function nomeConto(contoId: string): string {
    return (
      conti.find((conto) => conto.id === contoId)?.nome ?? 'Conto sconosciuto'
    );
  }

  function renderSezione(verso: 'debito' | 'credito') {
    const titolo = verso === 'debito' ? 'Debiti' : 'Crediti';
    const posizioniDellaSezione = posizioniOrdinate(posizioni, verso);

    return (
      <section style={STILE_LISTA}>
        <h2 style={{ margin: 0 }}>{titolo}</h2>
        {posizioniDellaSezione.length === 0 ? (
          <div style={STILE_VUOTO}>
            {verso === 'debito' ? 'Nessun debito.' : 'Nessun credito.'}
          </div>
        ) : (
          posizioniDellaSezione.map((posizione) => {
            const saldata = posizione.residuoCents === 0;
            const pannelloDiQuestaCard = pannelloAperto?.id === posizione.id;
            const coloreBordo = saldata
              ? 'var(--color-divider)'
              : posizione.verso === 'debito'
                ? 'var(--rosso)'
                : 'var(--verde)';

            return (
              <div
                key={posizione.id}
                style={{
                  ...STILE_CARD,
                  borderLeft: `4px solid ${coloreBordo}`,
                  opacity: saldata ? 0.7 : 1,
                }}
              >
                <div style={STILE_INTESTAZIONE_CARD}>
                  <span style={STILE_NOME_OCCORRENZA}>
                    {posizione.descrizione}
                  </span>
                  {saldata && <Etichetta variante="neutral">Saldata</Etichetta>}
                  <span style={{ color: 'var(--muted)', fontSize: '12.5px' }}>
                    aperta il {posizione.dataApertura}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: 'var(--muted)',
                      fontSize: '12.5px',
                    }}
                  >
                    residuo {formatImporto(Math.abs(posizione.residuoCents))} di{' '}
                    {formatImporto(Math.abs(posizione.importoInizialeCents))}
                  </span>
                </div>
                <div style={STILE_AZIONI}>
                  {!saldata && (
                    <Bottone
                      variante="primaria"
                      onClick={() => apriPannello(posizione.id, 'salda')}
                    >
                      Salda
                    </Bottone>
                  )}
                  {posizione.importoInizialeCents !==
                    posizione.residuoCents && (
                    <Bottone
                      variante="ghost"
                      onClick={() => apriSaldamenti(posizione.id)}
                    >
                      Saldamenti
                    </Bottone>
                  )}
                  {posizione.importoInizialeCents ===
                    posizione.residuoCents && (
                    <Bottone
                      variante="ghost"
                      onClick={() => setIdDaEliminare(posizione.id)}
                    >
                      Elimina
                    </Bottone>
                  )}
                </div>
                {pannelloDiQuestaCard && pannelloAperto.modo === 'salda' ? (
                  <div style={{ ...STILE_FORM, marginTop: 'var(--space-4)' }}>
                    <SaldaForm
                      posizione={posizione}
                      conti={conti}
                      onSalva={async (dati) => {
                        await salda(posizione.id, dati);
                        chiudiPannello();
                      }}
                      onAnnulla={chiudiPannello}
                    />
                  </div>
                ) : pannelloDiQuestaCard &&
                  pannelloAperto.modo === 'saldamenti' ? (
                  <div style={{ ...STILE_FORM, marginTop: 'var(--space-4)' }}>
                    {caricandoSaldamenti && <p>Caricamento…</p>}
                    {!caricandoSaldamenti && saldamenti.length === 0 && (
                      <p>Nessun saldamento trovato.</p>
                    )}
                    {!caricandoSaldamenti &&
                      saldamenti.map((movimento) => (
                        <div key={movimento.id} style={STILE_AZIONI}>
                          <span>
                            {movimento.data} — {nomeConto(movimento.contoId)} —{' '}
                            {formatImporto(Math.abs(movimento.amountCents))}
                          </span>
                          <Bottone
                            variante="ghost"
                            onClick={() => setSaldamentoDaAnnullare(movimento)}
                          >
                            Annulla saldamento
                          </Bottone>
                        </div>
                      ))}
                    <div style={STILE_AZIONI}>
                      <Bottone variante="secondaria" onClick={chiudiPannello}>
                        Chiudi
                      </Bottone>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    );
  }

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Debiti e crediti</h1>
      </div>
      <p style={STILE_DESCRIZIONE}>
        Soldi prestati e presi in prestito: saldare registra un movimento reale
        sul conto scelto.
      </p>
      {caricando && <p>Caricamento…</p>}
      {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
      {!caricando && (
        <>
          <div style={STILE_RIQUADRO_SALDO}>
            <div style={STILE_COLONNA_SALDO_PRINCIPALE}>
              <div style={STILE_KICKER}>Totale netto a oggi</div>
              <div
                style={{
                  ...STILE_NUMERO_GRANDE,
                  color:
                    totaleNetto.nettoCents >= 0
                      ? 'var(--verde)'
                      : 'var(--rosso)',
                  marginTop: 'var(--space-3)',
                }}
              >
                {formatImporto(totaleNetto.nettoCents)}
              </div>
            </div>
            <div style={STILE_COLONNA_SALDO_SECONDARIA}>
              <div>
                <div style={STILE_KICKER}>Soldi sui conti</div>
                <div style={STILE_NUMERO_MEDIO}>
                  {formatImporto(totaleNetto.soldiSuiContiCents)}
                </div>
              </div>
              <div>
                <div style={STILE_KICKER}>Crediti da incassare</div>
                <div style={STILE_NUMERO_MEDIO}>
                  + {formatImporto(totaleNetto.creditiDaIncassareCents)}
                </div>
              </div>
              <div>
                <div style={STILE_KICKER}>Debiti da pagare</div>
                <div style={STILE_NUMERO_MEDIO}>
                  − {formatImporto(totaleNetto.debitiDaPagareCents)}
                </div>
              </div>
            </div>
          </div>
          <Scheda titolo="Nuova posizione">
            <NuovaPosizioneForm onSalva={crea} />
          </Scheda>
          {renderSezione('debito')}
          {renderSezione('credito')}
        </>
      )}
      <Dialogo
        aperto={idDaEliminare !== null}
        titolo="Eliminare questa posizione?"
        onChiudi={() => setIdDaEliminare(null)}
        azioni={
          <>
            <Bottone
              variante="primaria"
              disabled={inviandoDialogo}
              onClick={() =>
                void gestisciEliminazione(idDaEliminare!).then((successo) => {
                  if (successo) setIdDaEliminare(null);
                })
              }
            >
              {inviandoDialogo ? 'Eliminazione…' : 'Elimina'}
            </Bottone>
            <Bottone
              variante="secondaria"
              onClick={() => setIdDaEliminare(null)}
            >
              Annulla
            </Bottone>
          </>
        }
      >
        {posizioneDaEliminare && (
          <>«{posizioneDaEliminare.descrizione}» verrà eliminata.</>
        )}
      </Dialogo>
      <Dialogo
        aperto={saldamentoDaAnnullare !== null}
        titolo="Annullare questo saldamento?"
        onChiudi={() => setSaldamentoDaAnnullare(null)}
        azioni={
          <>
            <Bottone
              variante="primaria"
              disabled={inviandoDialogo}
              onClick={() =>
                saldamentoDaAnnullare &&
                void gestisciAnnullamento(saldamentoDaAnnullare).then(
                  (successo) => {
                    if (successo) setSaldamentoDaAnnullare(null);
                  },
                )
              }
            >
              {inviandoDialogo ? 'Annullamento…' : 'Annulla saldamento'}
            </Bottone>
            <Bottone
              variante="secondaria"
              onClick={() => setSaldamentoDaAnnullare(null)}
            >
              Annulla
            </Bottone>
          </>
        }
      >
        Il movimento verrà eliminato dal conto e il residuo tornerà aperto.
      </Dialogo>
    </div>
  );
}
