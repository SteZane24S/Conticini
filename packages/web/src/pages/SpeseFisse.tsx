import type {
  CategoriaDto,
  ContoDto,
  CreaSpesaFissaInput,
  RicorrenzaFissaDto,
} from '@conticini/contratti';
import {
  aggiungiMesi,
  formatImporto,
  occorrenzeTra,
  oggiLocale,
  parseImporto,
  type DataISO,
  type RegolaRicorrenza,
} from '@conticini/dominio';
import { useEffect, useState, type FormEvent } from 'react';

import { ErroreApi } from '../api.js';
import {
  Bottone,
  Campo,
  ControlloSegmentato,
  Dialogo,
  Etichetta,
  Scheda,
} from '../components/index.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useSpeseFisse } from './spese-fisse/dati.js';
import {
  STILE_AZIONI,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_GRID_SEZIONI,
  STILE_IMPORTO_SPESA,
  STILE_INTESTAZIONE,
  STILE_META_SPESA,
  STILE_NOME_SPESA,
  STILE_NOTA_ATTENUATA,
  STILE_PAGINA,
  STILE_RIGA_SPESA,
} from './spese-fisse/stili.js';

function formatImportoPerCampo(cents: number): string {
  return formatImporto(cents).replace(/\s?€$/, '');
}

function prossimaScadenzaDi(
  regola: RicorrenzaFissaDto['regola'],
): string | null {
  const oggi = oggiLocale(new Date());
  const orizzonte = aggiungiMesi(oggi, 14);
  const occorrenze = occorrenzeTra(regola as RegolaRicorrenza, oggi, orizzonte);
  return occorrenze[0]?.scadenza ?? null;
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

  useEffect(() => {
    if (
      spesaFissaIniziale === undefined &&
      contoId === '' &&
      conti[0] !== undefined
    ) {
      setContoId(conti[0].id);
    }
  }, [contoId, conti, spesaFissaIniziale]);

  useEffect(() => {
    if (
      spesaFissaIniziale === undefined &&
      categoriaId === '' &&
      categorie[0] !== undefined
    ) {
      setCategoriaId(categorie[0].id);
    }
  }, [categorie, categoriaId, spesaFissaIniziale]);

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
      <Campo
        etichetta="Nome"
        idCampo="spesa-fissa-nome"
        errore={erroriCampo.nome}
      >
        <input
          id="spesa-fissa-nome"
          className="input"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
        />
      </Campo>
      <Campo
        etichetta="Importo"
        idCampo="spesa-fissa-importo"
        errore={erroriCampo.amountCents}
      >
        <input
          id="spesa-fissa-importo"
          className="input"
          type="text"
          inputMode="decimal"
          value={importoTesto}
          onChange={(evento) => setImportoTesto(evento.target.value)}
          style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        />
      </Campo>
      <Campo
        etichetta="Conto"
        idCampo="spesa-fissa-conto"
        errore={erroriCampo.contoId}
      >
        <select
          id="spesa-fissa-conto"
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
        etichetta="Categoria"
        idCampo="spesa-fissa-categoria"
        errore={erroriCampo.categoriaId}
      >
        <select
          id="spesa-fissa-categoria"
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
        etichetta="Tipo di ricorrenza"
        idCampo="spesa-fissa-tipo"
        errore={erroriCampo.regola}
      >
        <select
          id="spesa-fissa-tipo"
          className="input"
          value={tipo}
          onChange={(evento) =>
            setTipo(evento.target.value as RicorrenzaFissaDto['regola']['tipo'])
          }
        >
          <option value="monthly">Mensile</option>
          <option value="every_n_months">Ogni N mesi</option>
          <option value="yearly">Annuale</option>
        </select>
      </Campo>
      <Campo etichetta="Giorno del mese" idCampo="spesa-fissa-giorno">
        <input
          id="spesa-fissa-giorno"
          className="input"
          type="number"
          min="1"
          max="31"
          value={anchorDay}
          onChange={(evento) => setAnchorDay(evento.target.value)}
          required
        />
      </Campo>
      {tipo === 'every_n_months' && (
        <Campo etichetta="N mesi" idCampo="spesa-fissa-n">
          <input
            id="spesa-fissa-n"
            className="input"
            type="number"
            min="1"
            value={n}
            onChange={(evento) => setN(evento.target.value)}
            required
          />
        </Campo>
      )}
      {tipo !== 'monthly' && (
        <Campo etichetta="Mese di ancoraggio" idCampo="spesa-fissa-mese">
          <input
            id="spesa-fissa-mese"
            className="input"
            type="number"
            min="1"
            max="12"
            value={anchorMonth}
            onChange={(evento) => setAnchorMonth(evento.target.value)}
            required
          />
        </Campo>
      )}
      <Campo etichetta="Data di inizio" idCampo="spesa-fissa-inizio">
        <input
          id="spesa-fissa-inizio"
          className="input"
          type="date"
          value={startDate}
          onChange={(evento) => setStartDate(evento.target.value)}
          required
        />
      </Campo>
      <Campo etichetta="Data di fine" idCampo="spesa-fissa-fine">
        <input
          id="spesa-fissa-fine"
          className="input"
          type="date"
          value={endDate}
          onChange={(evento) => setEndDate(evento.target.value)}
        />
      </Campo>
      <div className="field">
        <span>Modalità</span>
        <ControlloSegmentato
          nome="spesa-fissa-modalita"
          valore={mode}
          onCambio={(valore) => setMode(valore as 'auto' | 'manual')}
          opzioni={[
            { valore: 'auto', etichetta: 'Automatica' },
            { valore: 'manual', etichetta: 'Manuale' },
          ]}
        />
        {erroriCampo.mode && <span>{erroriCampo.mode}</span>}
      </div>
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
      >
        <input
          id="spesa-fissa-attiva"
          type="checkbox"
          checked={active}
          onChange={(evento) => setActive(evento.target.checked)}
        />
        Attiva
      </label>
      {erroreGenerale && (
        <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
      )}
      <div style={STILE_AZIONI}>
        <Bottone variante="primaria" type="submit" disabled={salvando}>
          {salvando
            ? 'Salvataggio…'
            : spesaFissaIniziale
              ? 'Salva modifiche'
              : 'Crea spesa fissa'}
        </Bottone>
        {spesaFissaIniziale !== undefined && (
          <Bottone variante="secondaria" type="button" onClick={onAnnulla}>
            Annulla
          </Bottone>
        )}
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
  const [spesaFissaInModificaId, setSpesaFissaInModificaId] = useState<
    string | null
  >(null);
  const [formNuovaVersione, setFormNuovaVersione] = useState(0);
  const [eliminazioneInCorso, setEliminazioneInCorso] = useState<string | null>(
    null,
  );
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);
  const spesaFissaInModifica =
    spesaFissaInModificaId === null
      ? undefined
      : speseFisse.find(
          (spesaFissa) => spesaFissa.id === spesaFissaInModificaId,
        );
  const spesaFissaDaEliminare =
    eliminazioneInCorso === null
      ? undefined
      : speseFisse.find((spesaFissa) => spesaFissa.id === eliminazioneInCorso);
  const speseFisseOrdinate = speseFisse
    .map((spesaFissa) => ({
      spesaFissa,
      prossimaScadenza: prossimaScadenzaDi(spesaFissa.regola),
    }))
    .sort((a, b) => {
      if (a.prossimaScadenza === null) {
        return b.prossimaScadenza === null ? 0 : 1;
      }
      if (b.prossimaScadenza === null) {
        return -1;
      }
      return a.prossimaScadenza.localeCompare(b.prossimaScadenza);
    });
  const nomeConto = (id: string | null) => {
    if (id === null) {
      return '—';
    }
    return conti.find((conto) => conto.id === id)?.nome ?? id;
  };
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
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Spese fisse</h1>
      </div>
      <div style={STILE_GRID_SEZIONI}>
        <div>
          {caricando && <p>Caricamento…</p>}
          {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
          {erroreAzione && <p style={STILE_ERRORE_GENERALE}>{erroreAzione}</p>}
          {!caricando && speseFisseOrdinate.length > 0 && (
            <div>
              {speseFisseOrdinate.map(({ spesaFissa, prossimaScadenza }) => (
                <div key={spesaFissa.id} style={STILE_RIGA_SPESA}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={STILE_NOME_SPESA}>
                      {spesaFissa.nome}
                      <span
                        style={{
                          background:
                            spesaFissa.mode === 'auto'
                              ? 'var(--neu-bg)'
                              : 'var(--ambra-bg)',
                          color:
                            spesaFissa.mode === 'auto'
                              ? 'var(--neu)'
                              : 'var(--ambra)',
                          fontSize: '10px',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '2px 7px',
                        }}
                      >
                        {spesaFissa.mode === 'auto' ? 'Automatica' : 'Manuale'}
                      </span>
                      {!spesaFissa.active && (
                        <Etichetta variante="outline">Disattivata</Etichetta>
                      )}
                    </div>
                    <div style={STILE_META_SPESA}>
                      {`${descriviRicorrenza(spesaFissa.regola)} · prossima ${prossimaScadenza ?? '—'} · ${nomeCategoria(spesaFissa.categoriaId)} · ${nomeConto(spesaFissa.contoId)}`}
                    </div>
                  </div>
                  <div
                    style={{ ...STILE_IMPORTO_SPESA, color: 'var(--rosso)' }}
                  >
                    {formatImporto(spesaFissa.amountCents)}
                  </div>
                  <Bottone
                    variante="ghost"
                    onClick={() => setSpesaFissaInModificaId(spesaFissa.id)}
                  >
                    Modifica
                  </Bottone>
                  <Bottone
                    variante="ghost"
                    onClick={() => void gestisciAttivazione(spesaFissa)}
                  >
                    {spesaFissa.active ? 'Disattiva' : 'Attiva'}
                  </Bottone>
                  <Bottone
                    variante="ghost"
                    onClick={() => setEliminazioneInCorso(spesaFissa.id)}
                  >
                    Elimina
                  </Bottone>
                </div>
              ))}
            </div>
          )}
          {!caricando && speseFisseOrdinate.length === 0 && (
            <p style={STILE_NOTA_ATTENUATA}>Nessuna spesa fissa presente.</p>
          )}
        </div>
        <Scheda
          titolo={
            spesaFissaInModifica === undefined
              ? 'Nuova spesa fissa'
              : 'Modifica spesa fissa'
          }
        >
          {spesaFissaInModifica === undefined ? (
            <SpesaFissaForm
              key={`nuova-${formNuovaVersione}`}
              conti={conti}
              categorie={categorieUscita}
              onSalva={async (dati) => {
                await crea(dati);
                setSpesaFissaInModificaId(null);
                setFormNuovaVersione((versione) => versione + 1);
              }}
              onAnnulla={() => setSpesaFissaInModificaId(null)}
            />
          ) : (
            <SpesaFissaForm
              key={spesaFissaInModifica.id}
              conti={conti}
              categorie={categorieUscita}
              spesaFissaIniziale={spesaFissaInModifica}
              onSalva={async (dati) => {
                await aggiorna(spesaFissaInModifica.id, dati);
                setSpesaFissaInModificaId(null);
              }}
              onAnnulla={() => setSpesaFissaInModificaId(null)}
            />
          )}
        </Scheda>
      </div>
      {spesaFissaDaEliminare && (
        <Dialogo
          aperto={eliminazioneInCorso !== null}
          titolo="Eliminare la spesa fissa?"
          onChiudi={() => setEliminazioneInCorso(null)}
          azioni={
            <>
              <Bottone
                variante="primaria"
                onClick={() => void gestisciEliminazione(eliminazioneInCorso!)}
              >
                Elimina
              </Bottone>
              <Bottone
                variante="secondaria"
                onClick={() => setEliminazioneInCorso(null)}
              >
                Annulla
              </Bottone>
            </>
          }
        >
          <p>
            «{spesaFissaDaEliminare.nome}»,{' '}
            {formatImporto(spesaFissaDaEliminare.amountCents)}. Sparisce dal
            prospetto e dalle occorrenze future.
          </p>
        </Dialogo>
      )}
    </div>
  );
}
