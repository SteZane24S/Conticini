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
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useStipendio } from './stipendio/dati.js';
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
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-data">Data</label>
        <input
          id="stipendio-data"
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
        <label htmlFor="stipendio-importo">Importo</label>
        <input
          id="stipendio-importo"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
        />
        {erroriCampo.amountCents && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-conto">Conto</label>
        <select
          id="stipendio-conto"
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
        {erroriCampo.contoId && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.contoId}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-categoria">Categoria di entrata</label>
        <select
          id="stipendio-categoria"
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
        {erroriCampo.categoriaId && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.categoriaId}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-descrizione">Descrizione</label>
        <input
          id="stipendio-descrizione"
          value={descrizione}
          onChange={(evento) => setDescrizione(evento.target.value)}
          required
        />
        {erroriCampo.descrizione && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.descrizione}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-data-prevista">
          Data prevista del prossimo stipendio
        </label>
        <input
          id="stipendio-data-prevista"
          type="date"
          value={dataPrevista}
          onChange={(evento) => setDataPrevista(evento.target.value)}
          required
        />
        {erroriCampo.expectedNextDate && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.expectedNextDate}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="stipendio-importo-previsto">
          Importo previsto del prossimo stipendio
        </label>
        <input
          id="stipendio-importo-previsto"
          value={importoPrevistoTesto}
          onChange={(evento) => setImportoPrevistoTesto(evento.target.value)}
        />
        {erroriCampo.expectedAmountCents && (
          <span style={STILE_ERRORE_CAMPO}>
            {erroriCampo.expectedAmountCents}
          </span>
        )}
      </div>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <button type="submit" disabled={salvando}>
          {salvando ? 'Salvataggio…' : 'Registra stipendio'}
        </button>
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
      <div style={STILE_CAMPO}>
        <label htmlFor="ciclo-data-prevista">
          Data prevista del prossimo stipendio
        </label>
        <input
          id="ciclo-data-prevista"
          type="date"
          value={dataPrevista}
          onChange={(evento) => setDataPrevista(evento.target.value)}
          required
        />
        {erroriCampo.expectedNextDate && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.expectedNextDate}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="ciclo-importo-previsto">Importo previsto</label>
        <input
          id="ciclo-importo-previsto"
          value={importoPrevistoTesto}
          onChange={(evento) => setImportoPrevistoTesto(evento.target.value)}
          required
        />
        {erroriCampo.expectedAmountCents && (
          <span style={STILE_ERRORE_CAMPO}>
            {erroriCampo.expectedAmountCents}
          </span>
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
      <h1>Stipendio</h1>
      <section style={STILE_SEZIONE}>
        <h2>Registra stipendio</h2>
        {messaggio && <p>{messaggio}</p>}
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
      </section>
      <section style={STILE_SEZIONE}>
        <h2>Storico cicli</h2>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {!caricando && cicli.length === 0 && (
          <p>Nessuno stipendio registrato.</p>
        )}
        {!caricando && cicli.length > 0 && (
          <table style={STILE_TABELLA}>
            <thead>
              <tr>
                <th style={STILE_CELLA}>Data inizio</th>
                <th style={STILE_CELLA}>Prossimo previsto</th>
                <th style={STILE_CELLA}>Importo previsto</th>
                <th style={STILE_CELLA}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {cicli.map((ciclo, indice) => (
                <tr key={ciclo.id}>
                  <td style={STILE_CELLA}>{ciclo.startDate}</td>
                  <td style={STILE_CELLA}>{ciclo.expectedNextDate ?? '—'}</td>
                  <td style={STILE_CELLA}>
                    {ciclo.expectedAmountCents === null
                      ? '—'
                      : formatImporto(ciclo.expectedAmountCents)}
                  </td>
                  <td style={STILE_CELLA}>
                    {indice === 0 && (
                      <button
                        type="button"
                        onClick={() => setFormPrevisioneAperto(true)}
                      >
                        Modifica previsione
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  );
}
