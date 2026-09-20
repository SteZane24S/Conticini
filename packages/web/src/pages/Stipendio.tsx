import type {
  CategoriaDto,
  CicloDto,
  ContoDto,
  CreaStipendioInput,
} from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useEffect, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { Bottone, Campo, Scheda, Tabella } from '../components/index.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useStipendio } from './stipendio/dati.js';
import {
  STILE_AZIONI,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_GRID_SEZIONI,
  STILE_INTESTAZIONE,
  STILE_PAGINA,
  STILE_MESSAGGIO_SUCCESSO,
  STILE_TITOLO_SEZIONE,
} from './stipendio/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

interface StipendioFormProps {
  conti: ContoDto[];
  categorie: CategoriaDto[];
  onSalva: (dati: CreaStipendioInput) => Promise<unknown>;
}

function StipendioForm({ conti, categorie, onSalva }: StipendioFormProps) {
  const [data, setData] = useState<string>(oggiLocale(new Date()));
  const [importoTesto, setImportoTesto] = useState('0,00');
  const [contoId, setContoId] = useState(conti[0]?.id ?? '');
  const [categoriaId, setCategoriaId] = useState(categorie[0]?.id ?? '');
  const [descrizione, setDescrizione] = useState('Stipendio');
  const [dataPrevista, setDataPrevista] = useState('');
  const [importoPrevistoTesto, setImportoPrevistoTesto] = useState('');
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (contoId === '' && conti[0]) {
      setContoId(conti[0].id);
    }
  }, [contoId, conti]);

  useEffect(() => {
    if (categoriaId === '' && categorie[0]) {
      setCategoriaId(categorie[0].id);
    }
  }, [categoriaId, categorie]);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);

    let amountCents: number;
    let expectedAmountCents: number | undefined;
    try {
      amountCents = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ amountCents: 'Importo non valido.' });
      return;
    }

    if (importoPrevistoTesto !== '') {
      try {
        expectedAmountCents = parseImporto(importoPrevistoTesto);
      } catch {
        setErroriCampo({ expectedAmountCents: 'Importo non valido.' });
        return;
      }
    }

    setSalvando(true);
    try {
      await onSalva({
        data: data as DataISO,
        amountCents,
        contoId,
        categoriaId,
        descrizione,
        expectedNextDate: dataPrevista as DataISO,
        ...(expectedAmountCents === undefined ? {} : { expectedAmountCents }),
      });
      setData(oggiLocale(new Date()));
      setImportoTesto('0,00');
      setDescrizione('Stipendio');
      setDataPrevista('');
      setImportoPrevistoTesto('');
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
      <Campo
        etichetta="Data"
        idCampo="stipendio-data"
        errore={erroriCampo.data}
      >
        <input
          id="stipendio-data"
          className="input"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Importo"
        idCampo="stipendio-importo"
        errore={erroriCampo.amountCents}
      >
        <input
          id="stipendio-importo"
          className="input"
          type="text"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      <Campo
        etichetta="Conto"
        idCampo="stipendio-conto"
        errore={erroriCampo.contoId}
      >
        <select
          id="stipendio-conto"
          className="input"
          value={contoId}
          onChange={(evento) => setContoId(evento.target.value)}
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
        etichetta="Categoria di entrata"
        idCampo="stipendio-categoria"
        errore={erroriCampo.categoriaId}
      >
        <select
          id="stipendio-categoria"
          className="input"
          value={categoriaId}
          onChange={(evento) => setCategoriaId(evento.target.value)}
          required
        >
          {categorie.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo
        etichetta="Descrizione"
        idCampo="stipendio-descrizione"
        errore={erroriCampo.descrizione}
      >
        <input
          id="stipendio-descrizione"
          className="input"
          value={descrizione}
          onChange={(evento) => setDescrizione(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Data prevista del prossimo stipendio"
        idCampo="stipendio-data-prevista"
        errore={erroriCampo.expectedNextDate}
      >
        <input
          id="stipendio-data-prevista"
          className="input"
          type="date"
          value={dataPrevista}
          onChange={(evento) => setDataPrevista(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Importo previsto del prossimo stipendio"
        idCampo="stipendio-importo-previsto"
        errore={erroriCampo.expectedAmountCents}
      >
        <input
          id="stipendio-importo-previsto"
          className="input"
          type="text"
          value={importoPrevistoTesto}
          onChange={(evento) => setImportoPrevistoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Registra stipendio'}
        </Bottone>
      </div>
    </form>
  );
}

interface PrevisioneFormProps {
  ciclo: CicloDto;
  onSalva: (dati: {
    expectedNextDate: DataISO;
    expectedAmountCents: number;
  }) => Promise<unknown>;
  onAnnulla: () => void;
}

function PrevisioneForm({ ciclo, onSalva, onAnnulla }: PrevisioneFormProps) {
  const [dataPrevista, setDataPrevista] = useState(
    ciclo.expectedNextDate ?? '',
  );
  const [importoPrevistoTesto, setImportoPrevistoTesto] = useState(
    ciclo.expectedAmountCents === null
      ? ''
      : formatImportoPerCampo(ciclo.expectedAmountCents),
  );
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);

    let expectedAmountCents: number;
    try {
      expectedAmountCents = parseImporto(importoPrevistoTesto);
    } catch {
      setErroriCampo({ expectedAmountCents: 'Importo non valido.' });
      return;
    }

    setSalvando(true);
    try {
      await onSalva({
        expectedNextDate: dataPrevista as DataISO,
        expectedAmountCents,
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
      <Campo
        etichetta="Data prevista del prossimo stipendio"
        idCampo="ciclo-data-prevista"
        errore={erroriCampo.expectedNextDate}
      >
        <input
          id="ciclo-data-prevista"
          className="input"
          type="date"
          value={dataPrevista}
          onChange={(evento) => setDataPrevista(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Importo previsto"
        idCampo="ciclo-importo-previsto"
        errore={erroriCampo.expectedAmountCents}
      >
        <input
          id="ciclo-importo-previsto"
          className="input"
          type="text"
          value={importoPrevistoTesto}
          onChange={(evento) => setImportoPrevistoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
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
        <Bottone variante="secondaria" type="button" onClick={onAnnulla}>
          Annulla
        </Bottone>
      </div>
    </form>
  );
}

export function Stipendio() {
  const { conti, errore: erroreConti } = useConti();
  const { categorie, erroreCaricamento: erroreCategorie } = useAlbero();
  const { cicli, caricando, errore, crea, aggiorna } = useStipendio();
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [formPrevisioneAperto, setFormPrevisioneAperto] = useState(false);
  const categorieEntrata = categorie.filter(
    (categoria) => categoria.kind === 'entrata',
  );
  const cicloAperto = cicli[0];

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Stipendio</h1>
      </div>
      <div style={STILE_GRID_SEZIONI}>
        <Scheda titolo="Registra stipendio">
          {messaggio && <p style={STILE_MESSAGGIO_SUCCESSO}>{messaggio}</p>}
          {erroreConti && <p style={STILE_ERRORE_GENERALE}>{erroreConti}</p>}
          {erroreCategorie && (
            <p style={STILE_ERRORE_GENERALE}>{erroreCategorie}</p>
          )}
          <StipendioForm
            conti={conti}
            categorie={categorieEntrata}
            onSalva={async (dati) => {
              setMessaggio(null);
              await crea(dati);
              setMessaggio('Stipendio registrato.');
            }}
          />
        </Scheda>
        <section>
          <div style={STILE_TITOLO_SEZIONE}>
            <h2 style={{ margin: 0 }}>Storico cicli</h2>
          </div>
          {caricando && <p>Caricamento…</p>}
          {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
          {!caricando && cicli.length === 0 && (
            <p>Nessuno stipendio registrato.</p>
          )}
          {!caricando && cicli.length > 0 && (
            <Tabella>
              <thead>
                <tr>
                  <th>Data inizio</th>
                  <th>Prossimo previsto</th>
                  <th>Importo previsto</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {cicli.map((ciclo, indice) => (
                  <tr key={ciclo.id}>
                    <td>{ciclo.startDate}</td>
                    <td>{ciclo.expectedNextDate ?? '—'}</td>
                    <td>
                      {ciclo.expectedAmountCents === null
                        ? '—'
                        : formatImporto(ciclo.expectedAmountCents)}
                    </td>
                    <td>
                      {indice === 0 && (
                        <Bottone
                          variante="ghost"
                          type="button"
                          onClick={() => setFormPrevisioneAperto(true)}
                        >
                          Modifica previsione
                        </Bottone>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabella>
          )}
          {formPrevisioneAperto && cicloAperto && (
            <PrevisioneForm
              key={cicloAperto.id}
              ciclo={cicloAperto}
              onSalva={async (dati) => {
                await aggiorna(cicloAperto.id, dati);
                setFormPrevisioneAperto(false);
              }}
              onAnnulla={() => setFormPrevisioneAperto(false)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
