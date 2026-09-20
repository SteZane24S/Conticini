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
import { Bottone, Campo, ControlloSegmentato } from '../../components/index.js';
import { useSuggerimenti } from './dati.js';
import {
  STILE_AZIONI,
  STILE_BARRA_INSERIMENTO,
  STILE_CAMPO_CON_SUGGERIMENTI,
  STILE_CAMPO_STRETTO,
  STILE_ELENCO_SUGGERIMENTI,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM_CATEGORIA,
  STILE_GRUPPO_RADIO,
  STILE_MESSAGGIO_SUCCESSO,
  STILE_RIGA_CAMPI,
  STILE_SEZIONE,
  STILE_VOCE_SUGGERIMENTO,
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

  function cambiaTipo(nuovoTipo: string) {
    const tipoValido = nuovoTipo as 'entrata' | 'uscita';
    setTipo(tipoValido);
    if (
      !categorie.some(
        (categoria) =>
          categoria.id === categoriaId && categoria.kind === tipoValido,
      )
    ) {
      setCategoriaId('');
    }
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
        style={STILE_BARRA_INSERIMENTO}
        onSubmit={(evento) => void gestisciSalva(evento)}
      >
        <div style={STILE_RIGA_CAMPI}>
          <div style={STILE_CAMPO_STRETTO}>
            <Campo etichetta="Data" idCampo="movimento-data">
              <input
                id="movimento-data"
                className="input"
                type="date"
                value={data}
                onChange={(evento) => setData(evento.target.value)}
                required
              />
            </Campo>
            {erroriCampo.data && (
              <span style={STILE_ERRORE_CAMPO}>{erroriCampo.data}</span>
            )}
          </div>
          <div style={STILE_CAMPO_CON_SUGGERIMENTI}>
            <Campo etichetta="Descrizione" idCampo="movimento-descrizione">
              <input
                ref={descrizioneRef}
                id="movimento-descrizione"
                className="input"
                type="text"
                value={descrizioneTesto}
                onChange={(evento) => setDescrizioneTesto(evento.target.value)}
                onFocus={() => setSuggerimentiAperti(true)}
                onBlur={() => setSuggerimentiAperti(false)}
                placeholder="Esselunga, Bar Centrale…"
                required
              />
            </Campo>
            {suggerimentiAperti && suggerimentiUnivoci.length > 0 && (
              <ul style={STILE_ELENCO_SUGGERIMENTI}>
                {suggerimentiUnivoci.map((suggerimento) => (
                  <li
                    key={suggerimento.descrizione}
                    style={STILE_VOCE_SUGGERIMENTO}
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
          <div style={STILE_CAMPO_STRETTO}>
            <Campo etichetta="Importo" idCampo="movimento-importo">
              <input
                id="movimento-importo"
                className="input"
                type="text"
                value={importoTesto}
                onChange={(evento) => setImportoTesto(evento.target.value)}
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </Campo>
            {erroriCampo.amountCents && (
              <span style={STILE_ERRORE_CAMPO}>{erroriCampo.amountCents}</span>
            )}
          </div>
          <ControlloSegmentato
            nome="movimento-tipo"
            valore={tipo}
            onCambio={cambiaTipo}
            opzioni={[
              { valore: 'entrata', etichetta: 'Entrata' },
              { valore: 'uscita', etichetta: 'Uscita' },
            ]}
          />
          <div>
            <Campo etichetta="Conto" idCampo="movimento-conto">
              <select
                id="movimento-conto"
                className="input"
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
            </Campo>
            {erroriCampo.contoId && (
              <span style={STILE_ERRORE_CAMPO}>{erroriCampo.contoId}</span>
            )}
          </div>
          <div>
            <Campo etichetta="Categoria proposta" idCampo="movimento-categoria">
              <select
                id="movimento-categoria"
                className="input"
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
            </Campo>
            {erroriCampo.categoriaId && (
              <span style={STILE_ERRORE_CAMPO}>{erroriCampo.categoriaId}</span>
            )}
          </div>
          <div style={STILE_AZIONI}>
            <Bottone variante="ghost" onClick={apriFormCategoria}>
              + nuova categoria
            </Bottone>
            <Bottone variante="primaria" type="submit" disabled={salvando}>
              {salvando ? 'Salvataggio…' : 'Salva'}
            </Bottone>
          </div>
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
          style={STILE_FORM_CATEGORIA}
          onSubmit={(evento) => void gestisciCreaCategoria(evento)}
        >
          <Campo etichetta="Nome categoria" idCampo="nuova-categoria-nome">
            <input
              id="nuova-categoria-nome"
              className="input"
              value={nomeCategoria}
              onChange={(evento) => setNomeCategoria(evento.target.value)}
              required
            />
          </Campo>
          {erroriCategoria.nome && (
            <span style={STILE_ERRORE_CAMPO}>{erroriCategoria.nome}</span>
          )}
          <div style={STILE_GRUPPO_RADIO}>
            <span>Settore</span>
            <label className="radio">
              <input
                type="radio"
                checked={modalitaSettore === 'esistente'}
                onChange={() => setModalitaSettore('esistente')}
              />
              <span className="dot" />
              Settore esistente
            </label>
            <label className="radio">
              <input
                type="radio"
                checked={modalitaSettore === 'nuovo'}
                onChange={() => setModalitaSettore('nuovo')}
              />
              <span className="dot" />
              Nuovo settore
            </label>
            {modalitaSettore === 'esistente' ? (
              <select
                className="input"
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
                className="input"
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
          <Campo etichetta="Tipo" idCampo="nuova-categoria-kind">
            <select
              id="nuova-categoria-kind"
              className="input"
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
          </Campo>
          {erroreCategoria && (
            <div style={STILE_ERRORE_GENERALE}>{erroreCategoria}</div>
          )}
          <div style={STILE_AZIONI}>
            <Bottone
              variante="primaria"
              type="submit"
              disabled={salvandoCategoria}
            >
              {salvandoCategoria ? 'Salvataggio…' : 'Crea categoria'}
            </Bottone>
            <Bottone
              variante="secondaria"
              onClick={() => setFormCategoriaAperto(false)}
            >
              Annulla
            </Bottone>
          </div>
        </form>
      )}
    </section>
  );
}
