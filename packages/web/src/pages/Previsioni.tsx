import { formatImporto, parseImporto } from '@conticini/dominio';
import { useEffect, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { dataRiferimentoCiclo, usePrevisioni } from './previsioni/dati.js';
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
      <div style={STILE_CAMPO}>
        <label htmlFor={id}>Importo</label>
        <input
          id={id}
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
        />
        {erroriCampo.amountCents && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
        )}
        {erroriCampo.categoriaId && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.categoriaId}</span>
        )}
      </div>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Salva'}
        </button>
        <button type="button" disabled={salvando} onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export function Previsioni() {
  const {
    categorie,
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
  } = usePrevisioni(dataRiferimento);
  const categorieUscita = categorie.filter(
    (categoria) => categoria.kind === 'uscita',
  );

  function apriPannello(categoriaId: string, modo: PannelloAperto['modo']) {
    setPannelloAperto({ categoriaId, modo });
  }

  return (
    <div style={STILE_PAGINA}>
      <h1>Previsioni</h1>
      <section style={STILE_SEZIONE}>
        <div style={STILE_CAMPO}>
          <label htmlFor="previsioni-ciclo">Ciclo</label>
          <select
            id="previsioni-ciclo"
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
        </div>
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
        <table style={STILE_TABELLA}>
          <thead>
            <tr>
              <th style={STILE_CELLA}>Categoria</th>
              <th style={STILE_CELLA}>Valore predefinito</th>
              <th style={STILE_CELLA}>Previsto nel ciclo</th>
              <th style={STILE_CELLA}>Speso</th>
              <th style={STILE_CELLA}>Residuo</th>
              <th style={STILE_CELLA}>Sforamento</th>
              <th style={STILE_CELLA}>Azioni</th>
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
              const modificaDefault =
                pannelloAperto?.categoriaId === categoria.id &&
                pannelloAperto.modo === 'default';
              const modificaOverride =
                pannelloAperto?.categoriaId === categoria.id &&
                pannelloAperto.modo === 'override';

              return (
                <tr key={categoria.id}>
                  <td style={STILE_CELLA}>{categoria.nome}</td>
                  <td style={STILE_CELLA}>
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
                  <td style={STILE_CELLA}>
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
                  <td style={STILE_CELLA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.speseCents)
                      : '—'}
                  </td>
                  <td style={STILE_CELLA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.residuoCents)
                      : '—'}
                  </td>
                  <td style={STILE_CELLA}>
                    {categoriaCiclo
                      ? formatImporto(categoriaCiclo.sforamentoCents)
                      : '—'}
                  </td>
                  <td style={STILE_CELLA}>
                    {!modificaDefault && !modificaOverride && (
                      <span style={STILE_AZIONI}>
                        <button
                          type="button"
                          onClick={() => apriPannello(categoria.id, 'default')}
                        >
                          Modifica
                        </button>
                        {budgetDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              apriPannello(categoria.id, 'override')
                            }
                          >
                            Override
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
      </section>
    </div>
  );
}
