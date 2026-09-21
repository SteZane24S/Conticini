import { formatImporto, parseImporto } from '@conticini/dominio';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { Bottone, Campo, Tabella } from '../components/index.js';
import { ConfermaInline } from '../components/ConfermaInline.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { dataRiferimentoCiclo, usePrevisioni } from './previsioni/dati.js';
import {
  STILE_AZIONI,
  STILE_CAMPO_SELETTORE,
  STILE_CELLA_CARD,
  STILE_CELLA_DESTRA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_INTESTAZIONE,
  STILE_KICKER,
  STILE_PAGINA,
  STILE_RIGA_CARD,
  STILE_VALORE_CARD,
} from './previsioni/stili.js';
import { useStipendio } from './stipendio/dati.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

interface PannelloAperto {
  categoriaId: string;
  modo: 'default' | 'override';
}

interface ModificaPrevisioneFormProps {
  categoriaId: string;
  modo: PannelloAperto['modo'];
  amountCents: number;
  onSalva: (amountCents: number) => Promise<void>;
  onAnnulla: () => void;
}

function ModificaPrevisioneForm({
  categoriaId,
  modo,
  amountCents,
  onSalva,
  onAnnulla,
}: ModificaPrevisioneFormProps) {
  const [importoTesto, setImportoTesto] = useState(
    formatImportoPerCampo(amountCents),
  );
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const id = `previsione-${modo}-${categoriaId}`;

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);

    let nuovoImportoCents: number;
    try {
      nuovoImportoCents = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ amountCents: 'Importo non valido.' });
      return;
    }

    setSalvando(true);
    try {
      await onSalva(nuovoImportoCents);
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
      <Campo etichetta="Importo" idCampo={id} errore={erroriCampo.amountCents}>
        <input
          id={id}
          className="input"
          type="text"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      {erroriCampo.categoriaId && (
        <span style={STILE_ERRORE_CAMPO}>{erroriCampo.categoriaId}</span>
      )}
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </Bottone>
        <Bottone
          variante="secondaria"
          type="button"
          disabled={salvando}
          onClick={onAnnulla}
        >
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

export function Previsioni() {
  const {
    categorie,
    settori,
    caricamento: caricamentoCategorie,
    erroreCaricamento: erroreCategorie,
  } = useAlbero();
  const {
    cicli,
    caricando: caricamentoCicli,
    errore: erroreCicli,
  } = useStipendio();
  const [cicloSelezionatoId, setCicloSelezionatoId] = useState('');
  const [pannelloAperto, setPannelloAperto] = useState<PannelloAperto | null>(
    null,
  );
  const [categoriaIdDaResettare, setCategoriaIdDaResettare] = useState<
    string | null
  >(null);
  const [erroreReset, setErroreReset] = useState<string | null>(null);
  const resettandoRef = useRef(false);

  useEffect(() => {
    if (cicloSelezionatoId === '' && cicli[0]) {
      setCicloSelezionatoId(cicli[0].id);
    }
  }, [cicloSelezionatoId, cicli]);

  const dataRiferimento = cicloSelezionatoId
    ? dataRiferimentoCiclo(cicli, cicloSelezionatoId)
    : null;
  const {
    budgetDefaults,
    categorieCiclo,
    caricando: caricamentoPrevisioni,
    errore: errorePrevisioni,
    impostaDefault,
    impostaOverride,
    rimuoviDefault,
  } = usePrevisioni(dataRiferimento);
  const categorieUscita = categorie.filter(
    (categoria) => categoria.kind === 'uscita',
  );
  const totalePrevisto = categorieUscita.reduce(
    (totale, categoria) =>
      totale +
      (categorieCiclo.find((voce) => voce.categoriaId === categoria.id)
        ?.previstoCents ?? 0),
    0,
  );
  const cicloSelezionato = cicli.find(
    (ciclo) => ciclo.id === cicloSelezionatoId,
  );
  const margine =
    cicloSelezionato?.expectedAmountCents === null ||
    cicloSelezionato?.expectedAmountCents === undefined
      ? null
      : cicloSelezionato.expectedAmountCents - totalePrevisto;

  function apriPannello(categoriaId: string, modo: PannelloAperto['modo']) {
    setPannelloAperto({ categoriaId, modo });
  }

  function apriReset(categoriaId: string) {
    setErroreReset(null);
    setCategoriaIdDaResettare(categoriaId);
  }

  function annullaReset() {
    setErroreReset(null);
    setCategoriaIdDaResettare(null);
  }

  async function gestisciReset(categoriaId: string) {
    if (resettandoRef.current) return;
    resettandoRef.current = true;
    setErroreReset(null);
    try {
      await rimuoviDefault(categoriaId);
      setCategoriaIdDaResettare(null);
    } catch (err) {
      setErroreReset(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      resettandoRef.current = false;
    }
  }

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Previsioni</h1>
        <div style={STILE_CAMPO_SELETTORE}>
          <Campo etichetta="Ciclo" idCampo="previsioni-ciclo">
            <select
              id="previsioni-ciclo"
              className="input"
              value={cicloSelezionatoId}
              onChange={(evento) => {
                setCicloSelezionatoId(evento.target.value);
                setPannelloAperto(null);
              }}
            >
              {cicli.map((ciclo, indice) => (
                <option key={ciclo.id} value={ciclo.id}>
                  {`${ciclo.startDate}${indice === 0 ? ' (aperto)' : ''}`}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </div>
      <div style={STILE_RIGA_CARD}>
        <div style={STILE_CELLA_CARD}>
          <div style={STILE_KICKER}>Totale previsto</div>
          <div style={STILE_VALORE_CARD}>{formatImporto(totalePrevisto)}</div>
        </div>
        <div style={STILE_CELLA_CARD}>
          <div style={STILE_KICKER}>Margine sull'accredito</div>
          <div
            style={{
              ...STILE_VALORE_CARD,
              ...(margine === null
                ? {}
                : { color: margine >= 0 ? 'var(--verde)' : 'var(--rosso)' }),
            }}
          >
            {margine === null ? '—' : formatImporto(margine)}
          </div>
        </div>
      </div>
      <section>
        {(caricamentoCategorie ||
          caricamentoCicli ||
          caricamentoPrevisioni) && <p>Caricamento…</p>}
        {erroreCategorie && (
          <p style={STILE_ERRORE_GENERALE}>{erroreCategorie}</p>
        )}
        {erroreCicli && <p style={STILE_ERRORE_GENERALE}>{erroreCicli}</p>}
        {errorePrevisioni && (
          <p style={STILE_ERRORE_GENERALE}>{errorePrevisioni}</p>
        )}
        <Tabella>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Settore</th>
              <th>Valore predefinito</th>
              <th>Previsto nel ciclo</th>
              <th>Speso</th>
              <th>Residuo</th>
              <th>Sforamento</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {categorieUscita.map((categoria) => {
              const budgetDefault = budgetDefaults.find(
                (budget) => budget.categoriaId === categoria.id,
              );
              const categoriaCiclo = categorieCiclo.find(
                (voce) => voce.categoriaId === categoria.id,
              );
              const settore = settori.find(
                (elemento) => elemento.id === categoria.settoreId,
              );
              const modificaDefault =
                pannelloAperto?.categoriaId === categoria.id &&
                pannelloAperto.modo === 'default';
              const modificaOverride =
                pannelloAperto?.categoriaId === categoria.id &&
                pannelloAperto.modo === 'override';

              return (
                <tr key={categoria.id}>
                  <td>{categoria.nome}</td>
                  <td>{settore?.nome ?? categoria.settoreId}</td>
                  <td style={STILE_CELLA_DESTRA}>
                    {modificaDefault ? (
                      <ModificaPrevisioneForm
                        categoriaId={categoria.id}
                        modo="default"
                        amountCents={budgetDefault?.amountCents ?? 0}
                        onSalva={async (amountCents) => {
                          await impostaDefault(categoria.id, amountCents);
                          setPannelloAperto(null);
                        }}
                        onAnnulla={() => setPannelloAperto(null)}
                      />
                    ) : budgetDefault ? (
                      formatImporto(budgetDefault.amountCents)
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={STILE_CELLA_DESTRA}>
                    {modificaOverride ? (
                      <ModificaPrevisioneForm
                        categoriaId={categoria.id}
                        modo="override"
                        amountCents={categoriaCiclo?.previstoCents ?? 0}
                        onSalva={async (amountCents) => {
                          await impostaOverride(
                            cicloSelezionatoId,
                            categoria.id,
                            amountCents,
                          );
                          setPannelloAperto(null);
                        }}
                        onAnnulla={() => setPannelloAperto(null)}
                      />
                    ) : categoriaCiclo ? (
                      formatImporto(categoriaCiclo.previstoCents)
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={STILE_CELLA_DESTRA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.speseCents)
                      : '—'}
                  </td>
                  <td style={STILE_CELLA_DESTRA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.residuoCents)
                      : '—'}
                  </td>
                  <td style={STILE_CELLA_DESTRA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.sforamentoCents)
                      : '—'}
                  </td>
                  <td>
                    {categoriaIdDaResettare === categoria.id ? (
                      <span style={STILE_AZIONI}>
                        <ConfermaInline
                          domanda="Azzerare la previsione?"
                          onConferma={() => void gestisciReset(categoria.id)}
                          onAnnulla={annullaReset}
                        />
                      </span>
                    ) : (
                      !modificaDefault &&
                      !modificaOverride && (
                        <span style={STILE_AZIONI}>
                          <Bottone
                            variante="ghost"
                            type="button"
                            onClick={() =>
                              apriPannello(categoria.id, 'default')
                            }
                          >
                            Modifica
                          </Bottone>
                          {budgetDefault && (
                            <>
                              <Bottone
                                variante="ghost"
                                type="button"
                                onClick={() =>
                                  apriPannello(categoria.id, 'override')
                                }
                              >
                                Override
                              </Bottone>
                              <Bottone
                                variante="ghost"
                                type="button"
                                onClick={() => apriReset(categoria.id)}
                              >
                                Reset
                              </Bottone>
                            </>
                          )}
                        </span>
                      )
                    )}
                    {erroreReset !== null &&
                      categoriaIdDaResettare === categoria.id && (
                        <div style={STILE_ERRORE_CAMPO}>{erroreReset}</div>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabella>
      </section>
    </div>
  );
}
