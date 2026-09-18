import type {
  AggiornaMovimentoInput,
  CategoriaDto,
  ContoDto,
  MovimentoDto,
  SettoreDto,
} from '@conticini/contratti';
import { formatImporto, parseImporto, type DataISO } from '@conticini/dominio';
import { useState, type FormEvent, type JSX } from 'react';

import { ErroreApi } from '../../api.js';
import { ConfermaInline } from '../../components/ConfermaInline.js';
import type { FiltriMovimentiUI } from './dati.js';
import {
  STILE_AZIONI,
  STILE_CAMPO,
  STILE_CELLA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_RIGA_TOTALI,
  STILE_SEZIONE,
  STILE_TABELLA,
} from './stili.js';

export interface ElencoMovimentiProps {
  conti: ContoDto[];
  settori: SettoreDto[];
  categorie: CategoriaDto[];
  filtri: FiltriMovimentiUI;
  onCambiaFiltri: (filtri: FiltriMovimentiUI) => void;
  movimenti: MovimentoDto[];
  totaleEntrateCents: number;
  totaleUsciteCents: number;
  caricando: boolean;
  errore: string | null;
  aggiorna: (id: string, dati: AggiornaMovimentoInput) => Promise<MovimentoDto>;
  elimina: (id: string) => Promise<void>;
}

interface FormModifica {
  data: string;
  descrizione: string;
  importoTesto: string;
  tipo: 'entrata' | 'uscita';
  contoId: string;
  categoriaId: string;
}

function creaFormModifica(
  movimento: MovimentoDto,
  contiAttivi: ContoDto[],
): FormModifica {
  return {
    data: movimento.data,
    descrizione: movimento.descrizione,
    importoTesto: formatImporto(Math.abs(movimento.amountCents)).replace(
      /\s?€$/,
      '',
    ),
    tipo: movimento.amountCents > 0 ? 'entrata' : 'uscita',
    contoId: contiAttivi.some((conto) => conto.id === movimento.contoId)
      ? movimento.contoId
      : '',
    categoriaId: movimento.categoriaId ?? '',
  };
}

export function ElencoMovimenti({
  conti,
  settori,
  categorie,
  filtri,
  onCambiaFiltri,
  movimenti,
  totaleEntrateCents,
  totaleUsciteCents,
  caricando,
  errore,
  aggiorna,
  elimina,
}: ElencoMovimentiProps): JSX.Element {
  const [movimentoInModifica, setMovimentoInModifica] = useState<string | null>(
    null,
  );
  const [formModifica, setFormModifica] = useState<FormModifica | null>(null);
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState<string | null>(
    null,
  );
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(
    null,
  );
  const [salvandoModifica, setSalvandoModifica] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const categorieFiltrate = categorie.filter(
    (categoria) =>
      !filtri.settoreId || categoria.settoreId === filtri.settoreId,
  );
  const contiAttivi = conti.filter((conto) => !conto.archiviato);

  function nomeConto(contoId: string): string {
    return conti.find((conto) => conto.id === contoId)?.nome ?? contoId;
  }

  function nomeCategoria(categoriaId: string | null): string {
    if (categoriaId === null) {
      return '—';
    }
    return (
      categorie.find((categoria) => categoria.id === categoriaId)?.nome ??
      categoriaId
    );
  }

  function apriModifica(movimento: MovimentoDto) {
    setMovimentoInModifica(movimento.id);
    setFormModifica(creaFormModifica(movimento, contiAttivi));
    setErroriCampo({});
    setErroreGenerale(null);
  }

  function annullaModifica() {
    setMovimentoInModifica(null);
    setFormModifica(null);
    setErroriCampo({});
    setErroreGenerale(null);
  }

  async function gestisciEliminazione(id: string) {
    setEliminandoId(id);
    setErroreEliminazione(null);
    try {
      await elimina(id);
      setEliminazioneInCorso(null);
    } catch (err) {
      setErroreEliminazione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setEliminandoId(null);
    }
  }

  async function gestisciSalvataggio(
    evento: FormEvent<HTMLFormElement>,
    movimento: MovimentoDto,
  ) {
    evento.preventDefault();
    if (formModifica === null || movimentoInModifica !== movimento.id) {
      return;
    }

    setErroriCampo({});
    setErroreGenerale(null);

    if (formModifica.contoId === '') {
      setErroriCampo({ contoId: 'Il conto è obbligatorio.' });
      return;
    }

    if (formModifica.categoriaId === '') {
      setErroriCampo({ categoriaId: 'La categoria è obbligatoria.' });
      return;
    }

    let valore: number;
    try {
      valore = parseImporto(formModifica.importoTesto);
    } catch {
      setErroriCampo({ amountCents: 'Importo non valido.' });
      return;
    }

    setSalvandoModifica(true);
    try {
      await aggiorna(movimento.id, {
        data: formModifica.data as DataISO,
        amountCents:
          formModifica.tipo === 'entrata'
            ? Math.abs(valore)
            : -Math.abs(valore),
        contoId: formModifica.contoId,
        categoriaId: formModifica.categoriaId,
        descrizione: formModifica.descrizione,
      });
      annullaModifica();
    } catch (err) {
      if (err instanceof ErroreApi && err.campo) {
        setErroriCampo({ [err.campo]: err.message });
      } else {
        setErroreGenerale(
          err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
        );
      }
    } finally {
      setSalvandoModifica(false);
    }
  }

  return (
    <section style={STILE_SEZIONE}>
      <div style={STILE_FORM}>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-data-da">Data da</label>
          <input
            id="filtro-movimenti-data-da"
            type="date"
            value={filtri.dataDa ?? ''}
            onChange={(evento) =>
              onCambiaFiltri({
                ...filtri,
                dataDa:
                  evento.target.value === '' ? undefined : evento.target.value,
              })
            }
          />
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-data-a">Data a</label>
          <input
            id="filtro-movimenti-data-a"
            type="date"
            value={filtri.dataA ?? ''}
            onChange={(evento) =>
              onCambiaFiltri({
                ...filtri,
                dataA:
                  evento.target.value === '' ? undefined : evento.target.value,
              })
            }
          />
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-conto">Conto</label>
          <select
            id="filtro-movimenti-conto"
            value={filtri.contoId ?? ''}
            onChange={(evento) =>
              onCambiaFiltri({
                ...filtri,
                contoId:
                  evento.target.value === '' ? undefined : evento.target.value,
              })
            }
          >
            <option value="">Tutti i conti</option>
            {conti.map((conto) => (
              <option key={conto.id} value={conto.id}>
                {conto.nome}
              </option>
            ))}
          </select>
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-settore">Settore</label>
          <select
            id="filtro-movimenti-settore"
            value={filtri.settoreId ?? ''}
            onChange={(evento) => {
              const nuovoSettoreId =
                evento.target.value === '' ? undefined : evento.target.value;
              const categoriaCorrenteValida =
                filtri.categoriaId === undefined ||
                categorie.some(
                  (categoria) =>
                    categoria.id === filtri.categoriaId &&
                    (nuovoSettoreId === undefined ||
                      categoria.settoreId === nuovoSettoreId),
                );
              onCambiaFiltri({
                ...filtri,
                settoreId: nuovoSettoreId,
                categoriaId: categoriaCorrenteValida
                  ? filtri.categoriaId
                  : undefined,
              });
            }}
          >
            <option value="">Tutti i settori</option>
            {settori.map((settore) => (
              <option key={settore.id} value={settore.id}>
                {settore.nome}
              </option>
            ))}
          </select>
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-categoria">Categoria</label>
          <select
            id="filtro-movimenti-categoria"
            value={filtri.categoriaId ?? ''}
            onChange={(evento) =>
              onCambiaFiltri({
                ...filtri,
                categoriaId:
                  evento.target.value === '' ? undefined : evento.target.value,
              })
            }
          >
            <option value="">Tutte le categorie</option>
            {categorieFiltrate.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="filtro-movimenti-testo">Descrizione</label>
          <input
            id="filtro-movimenti-testo"
            type="text"
            value={filtri.testo ?? ''}
            placeholder="Cerca nella descrizione"
            onChange={(evento) =>
              onCambiaFiltri({
                ...filtri,
                testo:
                  evento.target.value === '' ? undefined : evento.target.value,
              })
            }
          />
        </div>
      </div>

      <div style={STILE_RIGA_TOTALI}>
        <span>Entrate: {formatImporto(totaleEntrateCents)}</span>
        <span>Uscite: {formatImporto(totaleUsciteCents)}</span>
        <span>
          Saldo netto: {formatImporto(totaleEntrateCents - totaleUsciteCents)}
        </span>
        <span>Movimenti: {movimenti.length}</span>
      </div>

      {caricando && <p>Caricamento…</p>}
      {errore !== null && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {!caricando && errore === null && movimenti.length === 0 && (
        <p>Nessun movimento trovato.</p>
      )}
      {!caricando && errore === null && movimenti.length > 0 && (
        <table style={STILE_TABELLA}>
          <thead>
            <tr>
              <th style={STILE_CELLA}>Data</th>
              <th style={STILE_CELLA}>Descrizione</th>
              <th style={STILE_CELLA}>Conto</th>
              <th style={STILE_CELLA}>Categoria</th>
              <th style={STILE_CELLA}>Importo</th>
              <th style={STILE_CELLA}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {movimenti.map((movimento) => {
              if (
                movimentoInModifica === movimento.id &&
                formModifica !== null
              ) {
                const categorieDelTipo = categorie.filter(
                  (categoria) => categoria.kind === formModifica.tipo,
                );
                return (
                  <tr key={movimento.id}>
                    <td colSpan={6} style={STILE_CELLA}>
                      <form
                        style={STILE_FORM}
                        onSubmit={(evento) =>
                          void gestisciSalvataggio(evento, movimento)
                        }
                      >
                        <div style={STILE_CAMPO}>
                          <label htmlFor={`modifica-${movimento.id}-data`}>
                            Data
                          </label>
                          <input
                            id={`modifica-${movimento.id}-data`}
                            type="date"
                            value={formModifica.data}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                data: evento.target.value,
                              })
                            }
                            required
                          />
                          {erroriCampo.data && (
                            <span style={STILE_ERRORE_CAMPO}>
                              {erroriCampo.data}
                            </span>
                          )}
                        </div>
                        <div style={STILE_CAMPO}>
                          <label
                            htmlFor={`modifica-${movimento.id}-descrizione`}
                          >
                            Descrizione
                          </label>
                          <input
                            id={`modifica-${movimento.id}-descrizione`}
                            type="text"
                            value={formModifica.descrizione}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                descrizione: evento.target.value,
                              })
                            }
                            required
                          />
                          {erroriCampo.descrizione && (
                            <span style={STILE_ERRORE_CAMPO}>
                              {erroriCampo.descrizione}
                            </span>
                          )}
                        </div>
                        <div style={STILE_CAMPO}>
                          <label htmlFor={`modifica-${movimento.id}-importo`}>
                            Importo
                          </label>
                          <input
                            id={`modifica-${movimento.id}-importo`}
                            type="text"
                            value={formModifica.importoTesto}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                importoTesto: evento.target.value,
                              })
                            }
                          />
                          {erroriCampo.amountCents && (
                            <span style={STILE_ERRORE_CAMPO}>
                              {erroriCampo.amountCents}
                            </span>
                          )}
                        </div>
                        <div style={STILE_CAMPO}>
                          <label htmlFor={`modifica-${movimento.id}-tipo`}>
                            Entrata/Uscita
                          </label>
                          <select
                            id={`modifica-${movimento.id}-tipo`}
                            value={formModifica.tipo}
                            onChange={(evento) => {
                              const tipo = evento.target
                                .value as FormModifica['tipo'];
                              setFormModifica({
                                ...formModifica,
                                tipo,
                                categoriaId: categorie.some(
                                  (categoria) =>
                                    categoria.id === formModifica.categoriaId &&
                                    categoria.kind === tipo,
                                )
                                  ? formModifica.categoriaId
                                  : '',
                              });
                            }}
                          >
                            <option value="entrata">Entrata</option>
                            <option value="uscita">Uscita</option>
                          </select>
                        </div>
                        <div style={STILE_CAMPO}>
                          <label htmlFor={`modifica-${movimento.id}-conto`}>
                            Conto
                          </label>
                          <select
                            id={`modifica-${movimento.id}-conto`}
                            value={formModifica.contoId}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                contoId: evento.target.value,
                              })
                            }
                          >
                            <option value="">Seleziona un conto</option>
                            {contiAttivi.map((conto) => (
                              <option key={conto.id} value={conto.id}>
                                {conto.nome}
                              </option>
                            ))}
                          </select>
                          {erroriCampo.contoId && (
                            <span style={STILE_ERRORE_CAMPO}>
                              {erroriCampo.contoId}
                            </span>
                          )}
                        </div>
                        <div style={STILE_CAMPO}>
                          <label htmlFor={`modifica-${movimento.id}-categoria`}>
                            Categoria
                          </label>
                          <select
                            id={`modifica-${movimento.id}-categoria`}
                            value={formModifica.categoriaId}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                categoriaId: evento.target.value,
                              })
                            }
                          >
                            <option value="">Seleziona una categoria</option>
                            {categorieDelTipo.map((categoria) => (
                              <option key={categoria.id} value={categoria.id}>
                                {categoria.nome}
                              </option>
                            ))}
                          </select>
                          {erroriCampo.categoriaId && (
                            <span style={STILE_ERRORE_CAMPO}>
                              {erroriCampo.categoriaId}
                            </span>
                          )}
                        </div>
                        {erroreGenerale && (
                          <span style={STILE_ERRORE_GENERALE}>
                            {erroreGenerale}
                          </span>
                        )}
                        <div style={STILE_AZIONI}>
                          <button type="submit" disabled={salvandoModifica}>
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={annullaModifica}
                            disabled={salvandoModifica}
                          >
                            Annulla
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={movimento.id}>
                  <td style={STILE_CELLA}>{movimento.data}</td>
                  <td style={STILE_CELLA}>{movimento.descrizione}</td>
                  <td style={STILE_CELLA}>{nomeConto(movimento.contoId)}</td>
                  <td style={STILE_CELLA}>
                    {nomeCategoria(movimento.categoriaId)}
                  </td>
                  <td style={STILE_CELLA}>
                    {formatImporto(movimento.amountCents)}
                  </td>
                  <td style={STILE_CELLA}>
                    {movimento.transferGroupId !== null ? (
                      'Fa parte di un trasferimento'
                    ) : eliminandoId === movimento.id ? (
                      'Eliminazione…'
                    ) : eliminazioneInCorso === movimento.id ? (
                      <>
                        <ConfermaInline
                          domanda="Eliminare il movimento?"
                          onConferma={() =>
                            void gestisciEliminazione(movimento.id)
                          }
                          onAnnulla={() => {
                            setEliminazioneInCorso(null);
                            setErroreEliminazione(null);
                          }}
                        />
                        {erroreEliminazione !== null && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroreEliminazione}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={STILE_AZIONI}>
                        <button
                          type="button"
                          onClick={() => apriModifica(movimento)}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEliminazioneInCorso(movimento.id);
                            setErroreEliminazione(null);
                          }}
                        >
                          Elimina
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
