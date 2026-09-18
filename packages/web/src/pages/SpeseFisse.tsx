import type {
  CategoriaDto,
  ContoDto,
  CreaSpesaFissaInput,
  RicorrenzaFissaDto,
} from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import { ConfermaInline } from '../components/ConfermaInline.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useSpeseFisse } from './spese-fisse/dati.js';
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
} from './spese-fisse/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

interface SpesaFissaFormProps {
  conti: ContoDto[];
  categorie: CategoriaDto[];
  spesaFissaIniziale?: RicorrenzaFissaDto;
  onSalva: (dati: CreaSpesaFissaInput) => Promise<unknown>;
  onAnnulla: () => void;
}

function SpesaFissaForm({
  conti,
  categorie,
  spesaFissaIniziale,
  onSalva,
  onAnnulla,
}: SpesaFissaFormProps) {
  const regolaIniziale = spesaFissaIniziale?.regola;
  const [nome, setNome] = useState(spesaFissaIniziale?.nome ?? '');
  const [importoTesto, setImportoTesto] = useState(
    spesaFissaIniziale
      ? formatImportoPerCampo(spesaFissaIniziale.amountCents)
      : '0,00',
  );
  const [contoId, setContoId] = useState(
    spesaFissaIniziale?.contoId ?? conti[0]?.id ?? '',
  );
  const [categoriaId, setCategoriaId] = useState(
    spesaFissaIniziale?.categoriaId ?? categorie[0]?.id ?? '',
  );
  const [tipo, setTipo] = useState(regolaIniziale?.tipo ?? 'monthly');
  const [anchorDay, setAnchorDay] = useState(
    String(regolaIniziale?.anchorDay ?? 1),
  );
  const [anchorMonth, setAnchorMonth] = useState(
    String(
      regolaIniziale?.tipo === 'monthly'
        ? 1
        : (regolaIniziale?.anchorMonth ?? 1),
    ),
  );
  const [n, setN] = useState(
    String(regolaIniziale?.tipo === 'every_n_months' ? regolaIniziale.n : 1),
  );
  const [startDate, setStartDate] = useState<string>(
    regolaIniziale?.startDate ?? oggiLocale(new Date()),
  );
  const [endDate, setEndDate] = useState<string>(regolaIniziale?.endDate ?? '');
  const [mode, setMode] = useState(spesaFissaIniziale?.mode ?? 'auto');
  const [active, setActive] = useState(spesaFissaIniziale?.active ?? true);
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
    const base = {
      anchorDay: Number(anchorDay),
      startDate: startDate as DataISO,
      ...(endDate === '' ? {} : { endDate: endDate as DataISO }),
    };
    const regola =
      tipo === 'monthly'
        ? { tipo, ...base }
        : tipo === 'every_n_months'
          ? { tipo, ...base, n: Number(n), anchorMonth: Number(anchorMonth) }
          : { tipo, ...base, anchorMonth: Number(anchorMonth) };
    setSalvando(true);
    try {
      await onSalva({
        nome,
        regola,
        amountCents,
        contoId,
        categoriaId,
        mode,
        active,
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
        <label htmlFor="spesa-fissa-nome">Nome</label>
        <input
          id="spesa-fissa-nome"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
        />
        {erroriCampo.nome && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.nome}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-importo">Importo</label>
        <input
          id="spesa-fissa-importo"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
        />
        {erroriCampo.amountCents && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-conto">Conto</label>
        <select
          id="spesa-fissa-conto"
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
        <label htmlFor="spesa-fissa-categoria">Categoria</label>
        <select
          id="spesa-fissa-categoria"
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
        <label htmlFor="spesa-fissa-tipo">Tipo di ricorrenza</label>
        <select
          id="spesa-fissa-tipo"
          value={tipo}
          onChange={(evento) =>
            setTipo(evento.target.value as RicorrenzaFissaDto['regola']['tipo'])
          }
        >
          <option value="monthly">Mensile</option>
          <option value="every_n_months">Ogni N mesi</option>
          <option value="yearly">Annuale</option>
        </select>
        {erroriCampo.regola && (
          <span style={STILE_ERRORE_CAMPO}>{erroriCampo.regola}</span>
        )}
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-giorno">Giorno del mese</label>
        <input
          id="spesa-fissa-giorno"
          type="number"
          min="1"
          max="31"
          value={anchorDay}
          onChange={(evento) => setAnchorDay(evento.target.value)}
          required
        />
      </div>
      {tipo === 'every_n_months' && (
        <div style={STILE_CAMPO}>
          <label htmlFor="spesa-fissa-n">N mesi</label>
          <input
            id="spesa-fissa-n"
            type="number"
            min="1"
            value={n}
            onChange={(evento) => setN(evento.target.value)}
            required
          />
        </div>
      )}
      {tipo !== 'monthly' && (
        <div style={STILE_CAMPO}>
          <label htmlFor="spesa-fissa-mese">Mese di ancoraggio</label>
          <input
            id="spesa-fissa-mese"
            type="number"
            min="1"
            max="12"
            value={anchorMonth}
            onChange={(evento) => setAnchorMonth(evento.target.value)}
            required
          />
        </div>
      )}
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-inizio">Data di inizio</label>
        <input
          id="spesa-fissa-inizio"
          type="date"
          value={startDate}
          onChange={(evento) => setStartDate(evento.target.value)}
          required
        />
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-fine">Data di fine</label>
        <input
          id="spesa-fissa-fine"
          type="date"
          value={endDate}
          onChange={(evento) => setEndDate(evento.target.value)}
        />
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-modalita">Modalità</label>
        <select
          id="spesa-fissa-modalita"
          value={mode}
          onChange={(evento) =>
            setMode(evento.target.value as 'auto' | 'manual')
          }
        >
          <option value="auto">Automatica</option>
          <option value="manual">Manuale</option>
        </select>
      </div>
      <div style={STILE_CAMPO}>
        <label htmlFor="spesa-fissa-attiva">
          <input
            id="spesa-fissa-attiva"
            type="checkbox"
            checked={active}
            onChange={(evento) => setActive(evento.target.checked)}
          />{' '}
          Attiva
        </label>
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

function descriviRicorrenza(regola: RicorrenzaFissaDto['regola']): string {
  switch (regola.tipo) {
    case 'monthly':
      return `Mensile, giorno ${regola.anchorDay}`;
    case 'every_n_months':
      return `Ogni ${regola.n} mesi, giorno ${regola.anchorDay} (ancora al mese ${regola.anchorMonth})`;
    case 'yearly':
      return `Annuale, giorno ${regola.anchorDay} del mese ${regola.anchorMonth}`;
  }
}

export function SpeseFisse() {
  const { speseFisse, caricando, errore, crea, aggiorna, elimina } =
    useSpeseFisse();
  const { conti } = useConti();
  const { categorie } = useAlbero();
  const categorieUscita = categorie.filter(
    (categoria) => categoria.kind === 'uscita',
  );
  const [formAperto, setFormAperto] = useState<string | null>(null);
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState<string | null>(
    null,
  );
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const spesaFissaInModifica =
    formAperto !== null && formAperto !== 'nuovo'
      ? speseFisse.find((spesaFissa) => spesaFissa.id === formAperto)
      : undefined;
  const nomeConto = (id: string) =>
    conti.find((conto) => conto.id === id)?.nome ?? id;
  const nomeCategoria = (id: string) =>
    categorie.find((categoria) => categoria.id === id)?.nome ?? id;

  async function gestisciAttivazione(spesaFissa: RicorrenzaFissaDto) {
    setErroreAzione(null);
    try {
      await aggiorna(spesaFissa.id, { active: !spesaFissa.active });
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    }
  }
  async function gestisciEliminazione(id: string) {
    setErroreAzione(null);
    try {
      await elimina(id);
    } catch (err) {
      setErroreAzione(
        err instanceof ErroreApi ? err.message : 'Errore imprevisto.',
      );
    } finally {
      setEliminazioneInCorso(null);
    }
  }

  return (
    <div style={STILE_PAGINA}>
      <h1>Spese fisse</h1>
      <section style={STILE_SEZIONE}>
        {caricando && <p>Caricamento…</p>}
        {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
        {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
        {!caricando && speseFisse.length > 0 && (
          <table style={STILE_TABELLA}>
            <thead>
              <tr>
                {[
                  'Nome',
                  'Importo',
                  'Conto',
                  'Categoria',
                  'Ricorrenza',
                  'Modalità',
                  'Stato',
                  'Azioni',
                ].map((titolo) => (
                  <th key={titolo} style={STILE_CELLA}>
                    {titolo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {speseFisse.map((spesaFissa) => (
                <tr key={spesaFissa.id}>
                  <td style={STILE_CELLA}>{spesaFissa.nome}</td>
                  <td style={STILE_CELLA}>
                    {formatImporto(spesaFissa.amountCents)}
                  </td>
                  <td style={STILE_CELLA}>{nomeConto(spesaFissa.contoId)}</td>
                  <td style={STILE_CELLA}>
                    {nomeCategoria(spesaFissa.categoriaId)}
                  </td>
                  <td style={STILE_CELLA}>
                    {descriviRicorrenza(spesaFissa.regola)}
                  </td>
                  <td style={STILE_CELLA}>
                    {spesaFissa.mode === 'auto' ? 'Automatica' : 'Manuale'}
                  </td>
                  <td style={STILE_CELLA}>
                    {spesaFissa.active ? 'Attiva' : 'Disattivata'}
                  </td>
                  <td style={STILE_CELLA}>
                    {eliminazioneInCorso === spesaFissa.id ? (
                      <ConfermaInline
                        domanda="Eliminare la spesa fissa?"
                        onConferma={() =>
                          void gestisciEliminazione(spesaFissa.id)
                        }
                        onAnnulla={() => setEliminazioneInCorso(null)}
                      />
                    ) : (
                      <span style={STILE_AZIONI}>
                        <button
                          type="button"
                          onClick={() => setFormAperto(spesaFissa.id)}
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => void gestisciAttivazione(spesaFissa)}
                        >
                          {spesaFissa.active ? 'Disattiva' : 'Attiva'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEliminazioneInCorso(spesaFissa.id)}
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
        {!caricando && speseFisse.length === 0 && (
          <p>Nessuna spesa fissa presente.</p>
        )}
        {formAperto === null && (
          <button type="button" onClick={() => setFormAperto('nuovo')}>
            Nuova spesa fissa
          </button>
        )}
        {formAperto === 'nuovo' && (
          <SpesaFissaForm
            conti={conti}
            categorie={categorieUscita}
            onSalva={async (dati) => {
              await crea(dati);
              setFormAperto(null);
            }}
            onAnnulla={() => setFormAperto(null)}
          />
        )}
        {spesaFissaInModifica && (
          <SpesaFissaForm
            key={spesaFissaInModifica.id}
            conti={conti}
            categorie={categorieUscita}
            spesaFissaIniziale={spesaFissaInModifica}
            onSalva={async (dati) => {
              await aggiorna(spesaFissaInModifica.id, dati);
              setFormAperto(null);
            }}
            onAnnulla={() => setFormAperto(null)}
          />
        )}
      </section>
    </div>
  );
}
