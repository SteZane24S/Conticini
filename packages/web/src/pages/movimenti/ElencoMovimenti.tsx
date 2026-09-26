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
import {
  Bottone,
  Campo,
  ControlloSegmentato,
  Tabella,
} from '../../components/index.js';
import { ConfermaInline } from '../../components/ConfermaInline.js';
import type { FiltriMovimentiUI } from './dati.js';
import {
  STILE_AZIONI,
  STILE_CELLA_DESTRA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM_MODIFICA,
  STILE_IMPORTO_RIGA,
  STILE_RIGA_FILTRI,
  STILE_RIGA_TOTALI,
  STILE_SEZIONE,
  STILE_VALORE_TOTALE,
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
      ? (movimento.contoId ?? '')
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
  const saldoNettoCents = totaleEntrateCents - totaleUsciteCents;

  function nomeConto(contoId: string | null): string {
    if (contoId === null) {
      return '—';
    }
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
      <div style={STILE_RIGA_FILTRI}>
        <Campo etichetta="Data da" idCampo="filtro-movimenti-data-da">
          <input
            id="filtro-movimenti-data-da"
            className="input"
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
        </Campo>
        <Campo etichetta="Data a" idCampo="filtro-movimenti-data-a">
          <input
            id="filtro-movimenti-data-a"
            className="input"
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
        </Campo>
        <Campo etichetta="Conto" idCampo="filtro-movimenti-conto">
          <select
            id="filtro-movimenti-conto"
            className="input"
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
        </Campo>
        <Campo etichetta="Settore" idCampo="filtro-movimenti-settore">
          <select
            id="filtro-movimenti-settore"
            className="input"
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
        </Campo>
        <Campo etichetta="Categoria" idCampo="filtro-movimenti-categoria">
          <select
            id="filtro-movimenti-categoria"
            className="input"
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
        </Campo>
        <Campo etichetta="Descrizione" idCampo="filtro-movimenti-testo">
          <input
            id="filtro-movimenti-testo"
            className="input"
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
        </Campo>
      </div>

      <div style={STILE_RIGA_TOTALI}>
        <span>{movimenti.length} movimenti</span>
        <span>
          Entrate{' '}
          <span style={{ ...STILE_VALORE_TOTALE, color: 'var(--verde)' }}>
            {formatImporto(totaleEntrateCents)}
          </span>
        </span>
        <span>
          Uscite{' '}
          <span style={{ ...STILE_VALORE_TOTALE, color: 'var(--rosso)' }}>
            {formatImporto(totaleUsciteCents)}
          </span>
        </span>
        <span style={{ marginLeft: 'auto' }}>
          Saldo netto{' '}
          <span
            style={{
              ...STILE_VALORE_TOTALE,
              color: saldoNettoCents >= 0 ? 'var(--verde)' : 'var(--rosso)',
            }}
          >
            {formatImporto(saldoNettoCents)}
          </span>
        </span>
      </div>

      {caricando && <p>Caricamento…</p>}
      {errore !== null && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {!caricando && errore === null && movimenti.length === 0 && (
        <p>Nessun movimento trovato.</p>
      )}
      {!caricando && errore === null && movimenti.length > 0 && (
        <Tabella>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrizione</th>
              <th>Conto</th>
              <th>Categoria</th>
              <th style={STILE_CELLA_DESTRA}>Importo</th>
              <th>Azioni</th>
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
                    <td colSpan={6}>
                      <form
                        style={STILE_FORM_MODIFICA}
                        onSubmit={(evento) =>
                          void gestisciSalvataggio(evento, movimento)
                        }
                      >
                        <Campo
                          etichetta="Data"
                          idCampo={`modifica-${movimento.id}-data`}
                        >
                          <input
                            id={`modifica-${movimento.id}-data`}
                            className="input"
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
                        </Campo>
                        {erroriCampo.data && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroriCampo.data}
                          </span>
                        )}
                        <Campo
                          etichetta="Descrizione"
                          idCampo={`modifica-${movimento.id}-descrizione`}
                        >
                          <input
                            id={`modifica-${movimento.id}-descrizione`}
                            className="input"
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
                        </Campo>
                        {erroriCampo.descrizione && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroriCampo.descrizione}
                          </span>
                        )}
                        <Campo
                          etichetta="Importo"
                          idCampo={`modifica-${movimento.id}-importo`}
                        >
                          <input
                            id={`modifica-${movimento.id}-importo`}
                            className="input"
                            type="text"
                            value={formModifica.importoTesto}
                            onChange={(evento) =>
                              setFormModifica({
                                ...formModifica,
                                importoTesto: evento.target.value,
                              })
                            }
                          />
                        </Campo>
                        {erroriCampo.amountCents && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroriCampo.amountCents}
                          </span>
                        )}
                        <ControlloSegmentato
                          nome={`modifica-${movimento.id}-tipo`}
                          valore={formModifica.tipo}
                          onCambio={(valore) => {
                            const tipo = valore as FormModifica['tipo'];
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
                          opzioni={[
                            { valore: 'entrata', etichetta: 'Entrata' },
                            { valore: 'uscita', etichetta: 'Uscita' },
                          ]}
                        />
                        <Campo
                          etichetta="Conto"
                          idCampo={`modifica-${movimento.id}-conto`}
                        >
                          <select
                            id={`modifica-${movimento.id}-conto`}
                            className="input"
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
                        </Campo>
                        {erroriCampo.contoId && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroriCampo.contoId}
                          </span>
                        )}
                        <Campo
                          etichetta="Categoria"
                          idCampo={`modifica-${movimento.id}-categoria`}
                        >
                          <select
                            id={`modifica-${movimento.id}-categoria`}
                            className="input"
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
                        </Campo>
                        {erroriCampo.categoriaId && (
                          <span style={STILE_ERRORE_CAMPO}>
                            {erroriCampo.categoriaId}
                          </span>
                        )}
                        {erroreGenerale && (
                          <span style={STILE_ERRORE_GENERALE}>
                            {erroreGenerale}
                          </span>
                        )}
                        <div style={STILE_AZIONI}>
                          <Bottone
                            variante="primaria"
                            type="submit"
                            disabled={salvandoModifica}
                          >
                            Salva
                          </Bottone>
                          <Bottone
                            variante="secondaria"
                            onClick={annullaModifica}
                            disabled={salvandoModifica}
                          >
                            Annulla
                          </Bottone>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={movimento.id}>
                  <td>{movimento.data}</td>
                  <td>{movimento.descrizione}</td>
                  <td>{nomeConto(movimento.contoId)}</td>
                  <td>{nomeCategoria(movimento.categoriaId)}</td>
                  <td
                    style={{
                      ...STILE_CELLA_DESTRA,
                      ...STILE_IMPORTO_RIGA,
                      color:
                        movimento.amountCents >= 0
                          ? 'var(--verde)'
                          : 'var(--rosso)',
                    }}
                  >
                    {formatImporto(movimento.amountCents)}
                  </td>
                  <td>
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
                        <Bottone
                          variante="ghost"
                          onClick={() => apriModifica(movimento)}
                        >
                          Modifica
                        </Bottone>
                        <Bottone
                          variante="ghost"
                          onClick={() => {
                            setEliminazioneInCorso(movimento.id);
                            setErroreEliminazione(null);
                          }}
                        >
                          Elimina
                        </Bottone>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabella>
      )}
    </section>
  );
}
