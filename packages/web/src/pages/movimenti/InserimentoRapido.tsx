import type {
  CategoriaDto,
  ContoDto,
  CreaMovimentoInput,
  MovimentoDto,
  SettoreDto,
} from '@conticini/contratti';
import {
  formatImporto,
  oggiLocale,
  parseImporto,
  type DataISO,
} from '@conticini/dominio';
import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';

import { ErroreApi } from '../../api.js';
import { useSuggerimenti } from './dati.js';
import {
  STILE_AZIONI,
  STILE_CAMPO,
  STILE_CAMPO_CON_SUGGERIMENTI,
  STILE_ELENCO_SUGGERIMENTI,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_MESSAGGIO_SUCCESSO,
  STILE_SEZIONE,
} from './stili.js';

export interface InserimentoRapidoProps {
  conti: ContoDto[];
  settori: SettoreDto[];
  categorie: CategoriaDto[];
  creaMovimento: (dati: CreaMovimentoInput) => Promise<MovimentoDto>;
  creaSettore: (nome: string) => Promise<SettoreDto>;
  creaCategoria: (input: {
    nome: string;
    kind: 'entrata' | 'uscita';
    settoreId: string;
  }) => Promise<CategoriaDto>;
}

export function InserimentoRapido({
  conti,
  settori,
  categorie,
  creaMovimento,
  creaSettore,
  creaCategoria,
}: InserimentoRapidoProps): JSX.Element {
  const contiAttivi = conti.filter((conto) => !conto.archiviato);
  const [data, setData] = useState<string>(oggiLocale(new Date()));
  const [descrizioneTesto, setDescrizioneTesto] = useState('');
  const [importoTesto, setImportoTesto] = useState('0,00');
  const [tipo, setTipo] = useState<'entrata' | 'uscita'>('uscita');
  const [contoId, setContoId] = useState(contiAttivi[0]?.id ?? '');
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaSceltaManualmente, setCategoriaSceltaManualmente] =
    useState(false);
  const [suggerimentiAperti, setSuggerimentiAperti] = useState(false);
  const [formCategoriaAperto, setFormCategoriaAperto] = useState(false);
  const [nomeCategoria, setNomeCategoria] = useState('');
  const [kindNuovaCategoria, setKindNuovaCategoria] = useState<
    'entrata' | 'uscita'
  >('uscita');
  const [modalitaSettore, setModalitaSettore] = useState<'esistente' | 'nuovo'>(
    'esistente',
  );
  const [settoreId, setSettoreId] = useState(settori[0]?.id ?? '');
  const [nomeSettoreNuovo, setNomeSettoreNuovo] = useState('');
  const [erroriCampo, setErroriCampo] = useState<Record<string, string>>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [messaggioSuccesso, setMessaggioSuccesso] = useState<string | null>(
    null,
  );
  const [salvando, setSalvando] = useState(false);
  const [erroriCategoria, setErroriCategoria] = useState<
    Record<string, string>
  >({});
  const [erroreCategoria, setErroreCategoria] = useState<string | null>(null);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const descrizioneRef = useRef<HTMLInputElement>(null);
  const { suggerimenti, categoriaSuggerita } =
    useSuggerimenti(descrizioneTesto);

  const categorieDelTipo = categorie.filter(
    (categoria) => categoria.kind === tipo,
  );
  const suggerimentiUnivoci = suggerimenti.filter(
    (suggerimento, indice) =>
      suggerimenti.findIndex(
        (corrente) => corrente.descrizione === suggerimento.descrizione,
      ) === indice,
  );

  useEffect(() => {
    if (categoriaSceltaManualmente) {
      return;
    }
    if (categoriaSuggerita === null) {
      setCategoriaId('');
      return;
    }
    const categoriaValida = categorie.some(
      (categoria) =>
        categoria.id === categoriaSuggerita && categoria.kind === tipo,
    );
    setCategoriaId(categoriaValida ? categoriaSuggerita : '');
  }, [categoriaSceltaManualmente, categoriaSuggerita, categorie, tipo]);

  useEffect(() => {
    if (contoId === '' && contiAttivi.length > 0) {
      setContoId(contiAttivi[0]!.id);
    }
  }, [contiAttivi, contoId]);

  function gestisciErrore(
    errore: unknown,
    impostaErrori: (errori: Record<string, string>) => void,
    impostaErroreGenerale: (messaggio: string | null) => void,
  ) {
    if (errore instanceof ErroreApi) {
      if (errore.campo) {
        impostaErrori({ [errore.campo]: errore.message });
      } else {
        impostaErroreGenerale(errore.message);
      }
    } else {
      impostaErroreGenerale('Errore imprevisto.');
    }
  }

  function selezionaSuggerimento(suggerimento: (typeof suggerimenti)[number]) {
    setDescrizioneTesto(suggerimento.descrizione);
    setImportoTesto(
      formatImporto(Math.abs(suggerimento.amountCentsRecente)).replace(
        /\s?€$/,
        '',
      ),
    );
    setTipo(suggerimento.amountCentsRecente > 0 ? 'entrata' : 'uscita');
    if (suggerimento.categoriaId !== null) {
      setCategoriaId(suggerimento.categoriaId);
      setCategoriaSceltaManualmente(true);
    }
    setSuggerimentiAperti(false);
  }

  async function gestisciSalva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCampo({});
    setErroreGenerale(null);
    setMessaggioSuccesso(null);

    let valore: number;
    try {
      valore = parseImporto(importoTesto);
    } catch {
      setErroriCampo({ amountCents: 'Importo non valido.' });
      return;
    }

    setSalvando(true);
    try {
      await creaMovimento({
        data: data as DataISO,
        amountCents: tipo === 'entrata' ? Math.abs(valore) : -Math.abs(valore),
        contoId,
        categoriaId,
        descrizione: descrizioneTesto,
      });
      setDescrizioneTesto('');
      setImportoTesto('0,00');
      setCategoriaId('');
      setCategoriaSceltaManualmente(false);
      descrizioneRef.current?.focus();
      setMessaggioSuccesso('Movimento salvato.');
    } catch (errore) {
      gestisciErrore(errore, setErroriCampo, setErroreGenerale);
    } finally {
      setSalvando(false);
    }
  }

  function apriFormCategoria() {
    setKindNuovaCategoria(tipo);
    setFormCategoriaAperto(true);
  }

  async function gestisciCreaCategoria(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroriCategoria({});
    setErroreCategoria(null);
    setSalvandoCategoria(true);

    let settoreCreato: SettoreDto | undefined;
    try {
      settoreCreato =
        modalitaSettore === 'nuovo'
          ? await creaSettore(nomeSettoreNuovo)
          : undefined;
      const categoria = await creaCategoria({
        nome: nomeCategoria,
        kind: kindNuovaCategoria,
        settoreId: settoreCreato?.id ?? settoreId,
      });
      if (categoria.kind === tipo) {
        setCategoriaId(categoria.id);
        setCategoriaSceltaManualmente(true);
      }
      setFormCategoriaAperto(false);
      setNomeCategoria('');
      setNomeSettoreNuovo('');
    } catch (errore) {
      if (settoreCreato !== undefined) {
        setModalitaSettore('esistente');
        setSettoreId(settoreCreato.id);
      }
      gestisciErrore(errore, setErroriCategoria, setErroreCategoria);
    } finally {
      setSalvandoCategoria(false);
    }
  }

  return (
    <section style={STILE_SEZIONE}>
      <h2>Inserimento rapido</h2>
      <form
        style={STILE_FORM}
        onSubmit={(evento) => void gestisciSalva(evento)}
      >
        <div style={STILE_CAMPO}>
          <label htmlFor="movimento-data">Data</label>
          <input
            id="movimento-data"
            type="date"
            value={data}
            onChange={(evento) => setData(evento.target.value)}
            required
          />
          {erroriCampo.data && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCampo.data}</span>
          )}
        </div>
        <div style={STILE_CAMPO_CON_SUGGERIMENTI}>
          <label htmlFor="movimento-descrizione">Descrizione</label>
          <input
            ref={descrizioneRef}
            id="movimento-descrizione"
            type="text"
            value={descrizioneTesto}
            onChange={(evento) => setDescrizioneTesto(evento.target.value)}
            onFocus={() => setSuggerimentiAperti(true)}
            onBlur={() => setSuggerimentiAperti(false)}
            required
          />
          {suggerimentiAperti && suggerimentiUnivoci.length > 0 && (
            <ul style={STILE_ELENCO_SUGGERIMENTI}>
              {suggerimentiUnivoci.map((suggerimento) => (
                <li
                  key={suggerimento.descrizione}
                  onMouseDown={(evento) => {
                    evento.preventDefault();
                    selezionaSuggerimento(suggerimento);
                  }}
                >
                  {suggerimento.descrizione}
                </li>
              ))}
            </ul>
          )}
          {erroriCampo.descrizione && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCampo.descrizione}</span>
          )}
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="movimento-importo">Importo</label>
          <input
            id="movimento-importo"
            type="text"
            value={importoTesto}
            onChange={(evento) => setImportoTesto(evento.target.value)}
          />
          {erroriCampo.amountCents && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
          )}
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="movimento-tipo">Entrata/Uscita</label>
          <select
            id="movimento-tipo"
            value={tipo}
            onChange={(evento) => {
              const nuovoTipo = evento.target.value as typeof tipo;
              setTipo(nuovoTipo);
              if (
                !categorie.some(
                  (categoria) =>
                    categoria.id === categoriaId &&
                    categoria.kind === nuovoTipo,
                )
              ) {
                setCategoriaId('');
              }
            }}
          >
            <option value="entrata">Entrata</option>
            <option value="uscita">Uscita</option>
          </select>
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="movimento-conto">Conto</label>
          <select
            id="movimento-conto"
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
          {erroriCampo.contoId && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCampo.contoId}</span>
          )}
        </div>
        <div style={STILE_CAMPO}>
          <label htmlFor="movimento-categoria">Categoria</label>
          <select
            id="movimento-categoria"
            value={categoriaId}
            onChange={(evento) => {
              setCategoriaId(evento.target.value);
              setCategoriaSceltaManualmente(true);
            }}
            required
          >
            <option value="">Seleziona una categoria</option>
            {categorieDelTipo.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
          {erroriCampo.categoriaId && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCampo.categoriaId}</span>
          )}
        </div>
        <div style={STILE_AZIONI}>
          <button type="button" onClick={apriFormCategoria}>
            + nuova categoria
          </button>
          <button type="submit" disabled={salvando}>
            {salvando ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
        {erroreGenerale && (
          <div style={STILE_ERRORE_GENERALE}>{erroreGenerale}</div>
        )}
        {messaggioSuccesso && (
          <span style={STILE_MESSAGGIO_SUCCESSO}>{messaggioSuccesso}</span>
        )}
      </form>

      {formCategoriaAperto && (
        <form
          style={STILE_FORM}
          onSubmit={(evento) => void gestisciCreaCategoria(evento)}
        >
          <div style={STILE_CAMPO}>
            <label htmlFor="nuova-categoria-nome">Nome categoria</label>
            <input
              id="nuova-categoria-nome"
              value={nomeCategoria}
              onChange={(evento) => setNomeCategoria(evento.target.value)}
              required
            />
            {erroriCategoria.nome && (
              <span style={STILE_ERRORE_CAMPO}>{erroriCategoria.nome}</span>
            )}
          </div>
          <div style={STILE_CAMPO}>
            <span>Settore</span>
            <label>
              <input
                type="radio"
                checked={modalitaSettore === 'esistente'}
                onChange={() => setModalitaSettore('esistente')}
              />
              Settore esistente
            </label>
            <label>
              <input
                type="radio"
                checked={modalitaSettore === 'nuovo'}
                onChange={() => setModalitaSettore('nuovo')}
              />
              Nuovo settore
            </label>
            {modalitaSettore === 'esistente' ? (
              <select
                value={settoreId}
                onChange={(evento) => setSettoreId(evento.target.value)}
                required
              >
                <option value="">Seleziona un settore</option>
                {settori.map((settore) => (
                  <option key={settore.id} value={settore.id}>
                    {settore.nome}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={nomeSettoreNuovo}
                onChange={(evento) => setNomeSettoreNuovo(evento.target.value)}
                placeholder="Nome nuovo settore"
                required
              />
            )}
            {(erroriCategoria.settoreId ||
              erroriCategoria.nomeSettoreNuovo) && (
              <span style={STILE_ERRORE_CAMPO}>
                {erroriCategoria.settoreId ?? erroriCategoria.nomeSettoreNuovo}
              </span>
            )}
          </div>
          <div style={STILE_CAMPO}>
            <label htmlFor="nuova-categoria-kind">Tipo</label>
            <select
              id="nuova-categoria-kind"
              value={kindNuovaCategoria}
              onChange={(evento) =>
                setKindNuovaCategoria(
                  evento.target.value as 'entrata' | 'uscita',
                )
              }
            >
              <option value="entrata">Entrata</option>
              <option value="uscita">Uscita</option>
            </select>
          </div>
          {erroreCategoria && (
            <div style={STILE_ERRORE_GENERALE}>{erroreCategoria}</div>
          )}
          <div style={STILE_AZIONI}>
            <button type="submit" disabled={salvandoCategoria}>
              {salvandoCategoria ? 'Salvataggio…' : 'Crea categoria'}
            </button>
            <button type="button" onClick={() => setFormCategoriaAperto(false)}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
