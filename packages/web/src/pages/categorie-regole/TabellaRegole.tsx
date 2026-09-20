import { useEffect, useState, type FormEvent } from 'react';
import type {
  CategoriaDto,
  RegolaCategoriaDto,
  SettoreDto,
} from '@conticini/contratti';
import { formatImporto } from '@conticini/dominio';

import { ErroreApi } from '../../api.js';
import { ConfermaInline } from '../../components/ConfermaInline.js';
import { Bottone, Campo, Tabella } from '../../components/index.js';
import type { AnteprimaRegola, UseRegoleRisultato } from './useRegole.js';
import {
  STILE_ELENCO_ANTEPRIMA,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_PANNELLO_ANTEPRIMA,
  STILE_RIGA_ANTEPRIMA,
  STILE_SEZIONE,
  STILE_TITOLO_SEZIONE,
  messaggioErrore,
} from './stili.js';

interface NomeCategoria {
  nomeCategoria: string;
  nomeSettore: string | null;
}

function risolviNomeCategoria(
  categoriaId: string,
  categorie: CategoriaDto[],
  settori: SettoreDto[],
): NomeCategoria {
  const categoria = categorie.find((c) => c.id === categoriaId);
  if (categoria === undefined) {
    return { nomeCategoria: categoriaId, nomeSettore: null };
  }
  const settore = settori.find((s) => s.id === categoria.settoreId);
  return {
    nomeCategoria: categoria.nome,
    nomeSettore: settore?.nome ?? null,
  };
}

interface PannelloAnteprimaProps {
  pattern: string;
  risultato: AnteprimaRegola | null;
  caricamento: boolean;
  errore: string | null;
}

function PannelloAnteprima({
  pattern,
  risultato,
  caricamento,
  errore,
}: PannelloAnteprimaProps) {
  return (
    <div style={STILE_PANNELLO_ANTEPRIMA}>
      <strong>Anteprima per «{pattern}»</strong>
      {caricamento ? <p>Caricamento…</p> : null}
      {errore !== null ? <p style={STILE_ERRORE_GENERALE}>{errore}</p> : null}
      {risultato !== null ? (
        risultato.movimenti.length === 0 ? (
          <p>Nessun movimento colpito.</p>
        ) : (
          <>
            <ul style={STILE_ELENCO_ANTEPRIMA}>
              {risultato.movimenti.map((movimento) => (
                <li key={movimento.id} style={STILE_RIGA_ANTEPRIMA}>
                  <span>
                    {movimento.data} — {movimento.descrizione}
                  </span>
                  <span>{formatImporto(movimento.amountCents)}</span>
                </li>
              ))}
            </ul>
            {risultato.altri > 0 ? (
              <p>e altri {risultato.altri} movimenti</p>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

interface FormNuovaRegolaProps {
  categorie: CategoriaDto[];
  settori: SettoreDto[];
  creaRegola: UseRegoleRisultato['creaRegola'];
  anteprima: UseRegoleRisultato['anteprima'];
}

function FormNuovaRegola({
  categorie,
  settori,
  creaRegola,
  anteprima,
}: FormNuovaRegolaProps) {
  const [pattern, setPattern] = useState('');
  const [categoriaId, setCategoriaId] = useState(categorie[0]?.id ?? '');
  const [priority, setPriority] = useState(0);
  const [erroreCampo, setErroreCampo] = useState<{
    campo: string;
    messaggio: string;
  } | null>(null);
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const [anteprimaPattern, setAnteprimaPattern] = useState<string | null>(null);
  const [anteprimaRisultato, setAnteprimaRisultato] =
    useState<AnteprimaRegola | null>(null);
  const [anteprimaCaricamento, setAnteprimaCaricamento] = useState(false);
  const [anteprimaErrore, setAnteprimaErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!categorie.some((categoria) => categoria.id === categoriaId)) {
      setCategoriaId(categorie[0]?.id ?? '');
    }
  }, [categorie, categoriaId]);

  const gestisciAnteprima = async () => {
    setAnteprimaPattern(pattern);
    setAnteprimaRisultato(null);
    setAnteprimaErrore(null);
    setAnteprimaCaricamento(true);
    try {
      const risultato = await anteprima(pattern);
      setAnteprimaRisultato(risultato);
    } catch (errore) {
      setAnteprimaErrore(messaggioErrore(errore));
    } finally {
      setAnteprimaCaricamento(false);
    }
  };

  const gestisciCreazioneRegola = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroreCampo(null);
    setErroreGenerale(null);
    setInvio(true);
    try {
      await creaRegola({ pattern, categoriaId, priority });
      setPattern('');
      setPriority(0);
      setAnteprimaPattern(null);
      setAnteprimaRisultato(null);
    } catch (errore) {
      if (errore instanceof ErroreApi && errore.campo !== undefined) {
        setErroreCampo({ campo: errore.campo, messaggio: errore.message });
      } else {
        setErroreGenerale(messaggioErrore(errore));
      }
    } finally {
      setInvio(false);
    }
  };

  return (
    <div>
      <form onSubmit={(evento) => void gestisciCreazioneRegola(evento)}>
        <div style={STILE_FORM}>
          <div>
            <Campo etichetta="Pattern" idCampo="regola-pattern">
              <input
                id="regola-pattern"
                className="input"
                type="text"
                value={pattern}
                onChange={(evento) => setPattern(evento.target.value)}
                placeholder="Testo da riconoscere (es. esselunga)"
                aria-label="Pattern della regola"
              />
            </Campo>
            {erroreCampo?.campo === 'pattern' ? (
              <p style={STILE_ERRORE_CAMPO}>{erroreCampo.messaggio}</p>
            ) : null}
          </div>
          <div>
            <Campo etichetta="Categoria" idCampo="regola-categoria">
              <select
                id="regola-categoria"
                className="input"
                value={categoriaId}
                onChange={(evento) => setCategoriaId(evento.target.value)}
                aria-label="Categoria della regola"
              >
                {categorie.map((categoria) => {
                  const settore = settori.find(
                    (s) => s.id === categoria.settoreId,
                  );
                  return (
                    <option key={categoria.id} value={categoria.id}>
                      {settore !== undefined
                        ? `${settore.nome} — ${categoria.nome}`
                        : categoria.nome}
                    </option>
                  );
                })}
              </select>
            </Campo>
            {erroreCampo?.campo === 'categoriaId' ? (
              <p style={STILE_ERRORE_CAMPO}>{erroreCampo.messaggio}</p>
            ) : null}
          </div>
          <div>
            <Campo etichetta="Priorità" idCampo="regola-priorita">
              <input
                id="regola-priorita"
                className="input"
                type="number"
                value={priority}
                onChange={(evento) =>
                  setPriority(Number.parseInt(evento.target.value, 10) || 0)
                }
                aria-label="Priorità della regola"
                style={{ width: '5rem' }}
              />
            </Campo>
            {erroreCampo?.campo === 'priority' ? (
              <p style={STILE_ERRORE_CAMPO}>{erroreCampo.messaggio}</p>
            ) : null}
          </div>
          <Bottone
            variante="ghost"
            disabled={pattern.trim() === ''}
            onClick={() => void gestisciAnteprima()}
          >
            Anteprima
          </Bottone>
          <Bottone
            variante="primaria"
            type="submit"
            disabled={invio || categoriaId === ''}
          >
            Salva regola
          </Bottone>
        </div>
        {erroreGenerale !== null ? (
          <p style={STILE_ERRORE_GENERALE}>{erroreGenerale}</p>
        ) : null}
      </form>
      {anteprimaPattern !== null ? (
        <PannelloAnteprima
          pattern={anteprimaPattern}
          risultato={anteprimaRisultato}
          caricamento={anteprimaCaricamento}
          errore={anteprimaErrore}
        />
      ) : null}
    </div>
  );
}

interface RigaRegolaProps {
  regola: RegolaCategoriaDto;
  categorie: CategoriaDto[];
  settori: SettoreDto[];
  attivaDisattivaRegola: UseRegoleRisultato['attivaDisattivaRegola'];
  eliminaRegola: UseRegoleRisultato['eliminaRegola'];
  onAnteprima: (pattern: string) => void;
}

function RigaRegola({
  regola,
  categorie,
  settori,
  attivaDisattivaRegola,
  eliminaRegola,
  onAnteprima,
}: RigaRegolaProps) {
  const [inConferma, setInConferma] = useState(false);
  const [erroreAzione, setErroreAzione] = useState<string | null>(null);

  const { nomeCategoria, nomeSettore } = risolviNomeCategoria(
    regola.categoriaId,
    categorie,
    settori,
  );

  const gestisciAttivaDisattiva = async () => {
    setErroreAzione(null);
    try {
      await attivaDisattivaRegola(regola);
    } catch (errore) {
      setErroreAzione(messaggioErrore(errore));
    }
  };

  const gestisciEliminazione = async () => {
    setErroreAzione(null);
    try {
      await eliminaRegola(regola.id);
    } catch (errore) {
      setErroreAzione(messaggioErrore(errore));
    }
  };

  return (
    <tr>
      <td>{regola.pattern}</td>
      <td>
        {nomeSettore !== null
          ? `${nomeSettore} — ${nomeCategoria}`
          : nomeCategoria}
      </td>
      <td>{regola.priority}</td>
      <td>
        <Bottone
          variante="ghost"
          onClick={() => void gestisciAttivaDisattiva()}
        >
          {regola.active ? 'Attiva' : 'Disattiva'}
        </Bottone>
      </td>
      <td>
        <Bottone variante="ghost" onClick={() => onAnteprima(regola.pattern)}>
          Anteprima
        </Bottone>
      </td>
      <td>
        {inConferma ? (
          <ConfermaInline
            domanda="Confermi?"
            onConferma={() => void gestisciEliminazione()}
            onAnnulla={() => setInConferma(false)}
          />
        ) : (
          <Bottone variante="ghost" onClick={() => setInConferma(true)}>
            Elimina
          </Bottone>
        )}
        {erroreAzione !== null ? (
          <p style={STILE_ERRORE_CAMPO}>{erroreAzione}</p>
        ) : null}
      </td>
    </tr>
  );
}

interface TabellaRegoleProps extends UseRegoleRisultato {
  categorie: CategoriaDto[];
  settori: SettoreDto[];
}

export function TabellaRegole(props: TabellaRegoleProps) {
  const {
    regole,
    caricamento,
    erroreCaricamento,
    categorie,
    settori,
    creaRegola,
    attivaDisattivaRegola,
    eliminaRegola,
    anteprima,
  } = props;

  const [anteprimaRigaPattern, setAnteprimaRigaPattern] = useState<
    string | null
  >(null);
  const [anteprimaRigaRisultato, setAnteprimaRigaRisultato] =
    useState<AnteprimaRegola | null>(null);
  const [anteprimaRigaCaricamento, setAnteprimaRigaCaricamento] =
    useState(false);
  const [anteprimaRigaErrore, setAnteprimaRigaErrore] = useState<string | null>(
    null,
  );

  const gestisciAnteprimaRiga = (pattern: string) => {
    setAnteprimaRigaPattern(pattern);
    setAnteprimaRigaRisultato(null);
    setAnteprimaRigaErrore(null);
    setAnteprimaRigaCaricamento(true);
    anteprima(pattern)
      .then(setAnteprimaRigaRisultato)
      .catch((errore: unknown) => {
        setAnteprimaRigaErrore(messaggioErrore(errore));
      })
      .finally(() => setAnteprimaRigaCaricamento(false));
  };

  return (
    <section style={STILE_SEZIONE}>
      <div style={STILE_TITOLO_SEZIONE}>
        <h2 style={{ margin: 0 }}>Regole di categorizzazione</h2>
      </div>
      {categorie.length === 0 ? (
        <p>Crea prima almeno una categoria per poter creare regole.</p>
      ) : (
        <FormNuovaRegola
          categorie={categorie}
          settori={settori}
          creaRegola={creaRegola}
          anteprima={anteprima}
        />
      )}
      {caricamento ? <p>Caricamento…</p> : null}
      {erroreCaricamento !== null ? (
        <p style={STILE_ERRORE_GENERALE}>{erroreCaricamento}</p>
      ) : null}
      {!caricamento && erroreCaricamento === null ? (
        regole.length === 0 ? (
          <p>Nessuna regola ancora creata.</p>
        ) : (
          <Tabella>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Categoria</th>
                <th>Priorità</th>
                <th>Stato</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {regole.map((regola) => (
                <RigaRegola
                  key={regola.id}
                  regola={regola}
                  categorie={categorie}
                  settori={settori}
                  attivaDisattivaRegola={attivaDisattivaRegola}
                  eliminaRegola={eliminaRegola}
                  onAnteprima={gestisciAnteprimaRiga}
                />
              ))}
            </tbody>
          </Tabella>
        )
      ) : null}
      {anteprimaRigaPattern !== null ? (
        <PannelloAnteprima
          pattern={anteprimaRigaPattern}
          risultato={anteprimaRigaRisultato}
          caricamento={anteprimaRigaCaricamento}
          errore={anteprimaRigaErrore}
        />
      ) : null}
    </section>
  );
}
