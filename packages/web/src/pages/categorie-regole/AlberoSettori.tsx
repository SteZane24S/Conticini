import { useState, type FormEvent } from 'react';
import type { CategoriaDto, SettoreDto } from '@conticini/contratti';

import { ErroreApi } from '../../api.js';
import { ConfermaInline } from '../../components/ConfermaInline.js';
import { Bottone, Campo } from '../../components/index.js';
import type { NuovaCategoriaInput, UseAlberoRisultato } from './useAlbero.js';
import {
  STILE_AZIONI,
  STILE_BADGE_ENTRATA,
  STILE_BADGE_USCITA,
  STILE_ELENCO_CATEGORIE,
  STILE_ELENCO_SETTORI,
  STILE_ERRORE_CAMPO,
  STILE_ERRORE_GENERALE,
  STILE_FORM,
  STILE_INTESTAZIONE_SETTORE,
  STILE_NOME_CATEGORIA,
  STILE_NOME_SETTORE,
  STILE_RIGA_CATEGORIA,
  STILE_RIGA_SETTORE,
  STILE_SEZIONE,
  STILE_TITOLO_SEZIONE,
  messaggioErrore,
} from './stili.js';

function badgeKind(kind: CategoriaDto['kind']) {
  return (
    <span style={kind === 'entrata' ? STILE_BADGE_ENTRATA : STILE_BADGE_USCITA}>
      {kind === 'entrata' ? 'entrata' : 'uscita'}
    </span>
  );
}

interface FormNuovoSettoreProps {
  creaSettore: UseAlberoRisultato['creaSettore'];
}

function FormNuovoSettore({ creaSettore }: FormNuovoSettoreProps) {
  const [aperto, setAperto] = useState(false);
  const [nome, setNome] = useState('');
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  if (!aperto) {
    return (
      <Bottone variante="ghost" onClick={() => setAperto(true)}>
        + nuovo settore
      </Bottone>
    );
  }

  const gestisciCreazioneSettore = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroreCampo(null);
    setErroreGenerale(null);
    setInvio(true);
    try {
      await creaSettore(nome);
      setNome('');
      setAperto(false);
    } catch (errore) {
      if (errore instanceof ErroreApi && errore.campo === 'nome') {
        setErroreCampo(errore.message);
      } else {
        setErroreGenerale(messaggioErrore(errore));
      }
    } finally {
      setInvio(false);
    }
  };

  return (
    <form onSubmit={(evento) => void gestisciCreazioneSettore(evento)}>
      <div style={STILE_FORM}>
        <div>
          <Campo etichetta="Nome settore" idCampo="nuovo-settore-nome">
            <input
              id="nuovo-settore-nome"
              className="input"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Nome settore"
              aria-label="Nome nuovo settore"
              autoFocus
            />
          </Campo>
          {erroreCampo !== null ? (
            <p style={STILE_ERRORE_CAMPO}>{erroreCampo}</p>
          ) : null}
        </div>
        <Bottone variante="primaria" type="submit" disabled={invio}>
          Salva
        </Bottone>
        <Bottone
          variante="secondaria"
          type="button"
          onClick={() => {
            setAperto(false);
            setNome('');
            setErroreCampo(null);
            setErroreGenerale(null);
          }}
        >
          Annulla
        </Bottone>
      </div>
      {erroreGenerale !== null ? (
        <p style={STILE_ERRORE_GENERALE}>{erroreGenerale}</p>
      ) : null}
    </form>
  );
}

interface FormNuovaCategoriaProps {
  settoreId: string;
  creaCategoria: UseAlberoRisultato['creaCategoria'];
  onChiudi: () => void;
}

function FormNuovaCategoria({
  settoreId,
  creaCategoria,
  onChiudi,
}: FormNuovaCategoriaProps) {
  const [nome, setNome] = useState('');
  const [kind, setKind] = useState<NuovaCategoriaInput['kind']>('uscita');
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [invio, setInvio] = useState(false);

  const gestisciCreazioneCategoria = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroreCampo(null);
    setErroreGenerale(null);
    setInvio(true);
    try {
      await creaCategoria({ nome, kind, settoreId });
      onChiudi();
    } catch (errore) {
      if (errore instanceof ErroreApi && errore.campo === 'nome') {
        setErroreCampo(errore.message);
      } else {
        setErroreGenerale(messaggioErrore(errore));
      }
    } finally {
      setInvio(false);
    }
  };

  return (
    <form onSubmit={(evento) => void gestisciCreazioneCategoria(evento)}>
      <div style={STILE_FORM}>
        <div>
          <Campo
            etichetta="Nome categoria"
            idCampo={`nuova-categoria-${settoreId}`}
          >
            <input
              id={`nuova-categoria-${settoreId}`}
              className="input"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Nome categoria"
              aria-label="Nome nuova categoria"
              autoFocus
            />
          </Campo>
          {erroreCampo !== null ? (
            <p style={STILE_ERRORE_CAMPO}>{erroreCampo}</p>
          ) : null}
        </div>
        <Campo etichetta="Tipo" idCampo={`nuova-categoria-kind-${settoreId}`}>
          <select
            id={`nuova-categoria-kind-${settoreId}`}
            className="input"
            value={kind}
            onChange={(evento) =>
              setKind(evento.target.value as NuovaCategoriaInput['kind'])
            }
            aria-label="Tipo categoria"
          >
            <option value="uscita">uscita</option>
            <option value="entrata">entrata</option>
          </select>
        </Campo>
        <Bottone variante="primaria" type="submit" disabled={invio}>
          Salva
        </Bottone>
        <Bottone variante="secondaria" type="button" onClick={onChiudi}>
          Annulla
        </Bottone>
      </div>
      {erroreGenerale !== null ? (
        <p style={STILE_ERRORE_GENERALE}>{erroreGenerale}</p>
      ) : null}
    </form>
  );
}

interface RigaCategoriaProps {
  categoria: CategoriaDto;
  rinominaCategoria: UseAlberoRisultato['rinominaCategoria'];
  eliminaCategoria: UseAlberoRisultato['eliminaCategoria'];
}

function RigaCategoria({
  categoria,
  rinominaCategoria,
  eliminaCategoria,
}: RigaCategoriaProps) {
  const [inModifica, setInModifica] = useState(false);
  const [nome, setNome] = useState(categoria.nome);
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [inConferma, setInConferma] = useState(false);
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(
    null,
  );

  if (inModifica) {
    const gestisciRinominaCategoria = async (evento: FormEvent) => {
      evento.preventDefault();
      setErroreCampo(null);
      try {
        await rinominaCategoria(categoria.id, nome);
        setInModifica(false);
      } catch (errore) {
        if (errore instanceof ErroreApi && errore.campo === 'nome') {
          setErroreCampo(errore.message);
        } else {
          setErroreCampo(messaggioErrore(errore));
        }
      }
    };

    return (
      <li style={STILE_RIGA_CATEGORIA}>
        <form onSubmit={(evento) => void gestisciRinominaCategoria(evento)}>
          <div style={STILE_FORM}>
            <div>
              <Campo
                etichetta="Nome categoria"
                idCampo={`rinomina-categoria-${categoria.id}`}
              >
                <input
                  id={`rinomina-categoria-${categoria.id}`}
                  className="input"
                  type="text"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  aria-label={`Nuovo nome per ${categoria.nome}`}
                  autoFocus
                />
              </Campo>
              {erroreCampo !== null ? (
                <p style={STILE_ERRORE_CAMPO}>{erroreCampo}</p>
              ) : null}
            </div>
            <Bottone variante="primaria" type="submit">
              Salva
            </Bottone>
            <Bottone
              variante="secondaria"
              type="button"
              onClick={() => {
                setInModifica(false);
                setNome(categoria.nome);
                setErroreCampo(null);
              }}
            >
              Annulla
            </Bottone>
          </div>
        </form>
      </li>
    );
  }

  if (inConferma) {
    const gestisciEliminazioneCategoria = async () => {
      setErroreEliminazione(null);
      try {
        await eliminaCategoria(categoria.id);
      } catch (errore) {
        setErroreEliminazione(messaggioErrore(errore));
      }
    };

    return (
      <li style={STILE_RIGA_CATEGORIA}>
        <ConfermaInline
          domanda={`Eliminare «${categoria.nome}»?`}
          onConferma={() => void gestisciEliminazioneCategoria()}
          onAnnulla={() => setInConferma(false)}
        />
        {erroreEliminazione !== null ? (
          <span style={STILE_ERRORE_CAMPO}>{erroreEliminazione}</span>
        ) : null}
      </li>
    );
  }

  return (
    <li style={STILE_RIGA_CATEGORIA}>
      <span style={STILE_NOME_CATEGORIA}>
        {categoria.nome}
        {badgeKind(categoria.kind)}
      </span>
      <span style={STILE_AZIONI}>
        <Bottone variante="ghost" onClick={() => setInModifica(true)}>
          Rinomina
        </Bottone>
        <Bottone variante="ghost" onClick={() => setInConferma(true)}>
          Elimina
        </Bottone>
      </span>
    </li>
  );
}

interface RigaSettoreProps {
  settore: SettoreDto;
  categorie: CategoriaDto[];
  risultato: UseAlberoRisultato;
}

function RigaSettore({ settore, categorie, risultato }: RigaSettoreProps) {
  const [inModifica, setInModifica] = useState(false);
  const [nome, setNome] = useState(settore.nome);
  const [erroreCampo, setErroreCampo] = useState<string | null>(null);
  const [inConferma, setInConferma] = useState(false);
  const [erroreEliminazione, setErroreEliminazione] = useState<string | null>(
    null,
  );
  const [formCategoriaAperto, setFormCategoriaAperto] = useState(false);

  const categorieDelSettore = categorie.filter(
    (categoria) => categoria.settoreId === settore.id,
  );

  const gestisciRinominaSettore = async (evento: FormEvent) => {
    evento.preventDefault();
    setErroreCampo(null);
    try {
      await risultato.rinominaSettore(settore.id, nome);
      setInModifica(false);
    } catch (errore) {
      if (errore instanceof ErroreApi && errore.campo === 'nome') {
        setErroreCampo(errore.message);
      } else {
        setErroreCampo(messaggioErrore(errore));
      }
    }
  };

  const gestisciEliminazioneSettore = async () => {
    setErroreEliminazione(null);
    try {
      await risultato.eliminaSettore(settore.id);
    } catch (errore) {
      setErroreEliminazione(messaggioErrore(errore));
    }
  };

  return (
    <li style={STILE_RIGA_SETTORE}>
      <div style={STILE_INTESTAZIONE_SETTORE}>
        {inModifica ? (
          <form onSubmit={(evento) => void gestisciRinominaSettore(evento)}>
            <div style={STILE_FORM}>
              <div>
                <Campo
                  etichetta="Nome settore"
                  idCampo={`rinomina-settore-${settore.id}`}
                >
                  <input
                    id={`rinomina-settore-${settore.id}`}
                    className="input"
                    type="text"
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                    aria-label={`Nuovo nome per ${settore.nome}`}
                    autoFocus
                  />
                </Campo>
                {erroreCampo !== null ? (
                  <p style={STILE_ERRORE_CAMPO}>{erroreCampo}</p>
                ) : null}
              </div>
              <Bottone variante="primaria" type="submit">
                Salva
              </Bottone>
              <Bottone
                variante="secondaria"
                type="button"
                onClick={() => {
                  setInModifica(false);
                  setNome(settore.nome);
                  setErroreCampo(null);
                }}
              >
                Annulla
              </Bottone>
            </div>
          </form>
        ) : (
          <span style={STILE_NOME_SETTORE}>{settore.nome}</span>
        )}
        {inConferma ? (
          <>
            <ConfermaInline
              domanda={`Eliminare «${settore.nome}»?`}
              onConferma={() => void gestisciEliminazioneSettore()}
              onAnnulla={() => setInConferma(false)}
            />
            {erroreEliminazione !== null ? (
              <span style={STILE_ERRORE_CAMPO}>{erroreEliminazione}</span>
            ) : null}
          </>
        ) : (
          !inModifica && (
            <span style={STILE_AZIONI}>
              <Bottone
                variante="ghost"
                onClick={() => setFormCategoriaAperto(true)}
              >
                + categoria
              </Bottone>
              <Bottone variante="ghost" onClick={() => setInModifica(true)}>
                Rinomina
              </Bottone>
              <Bottone variante="ghost" onClick={() => setInConferma(true)}>
                Elimina
              </Bottone>
            </span>
          )
        )}
      </div>
      {formCategoriaAperto ? (
        <FormNuovaCategoria
          settoreId={settore.id}
          creaCategoria={risultato.creaCategoria}
          onChiudi={() => setFormCategoriaAperto(false)}
        />
      ) : null}
      {categorieDelSettore.length > 0 ? (
        <ul style={STILE_ELENCO_CATEGORIE}>
          {categorieDelSettore.map((categoria) => (
            <RigaCategoria
              key={categoria.id}
              categoria={categoria}
              rinominaCategoria={risultato.rinominaCategoria}
              eliminaCategoria={risultato.eliminaCategoria}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function AlberoSettori(risultato: UseAlberoRisultato) {
  const { settori, categorie, caricamento, erroreCaricamento } = risultato;

  return (
    <section style={STILE_SEZIONE}>
      <div style={STILE_TITOLO_SEZIONE}>
        <h2 style={{ margin: 0 }}>Settori e categorie</h2>
        <FormNuovoSettore creaSettore={risultato.creaSettore} />
      </div>
      {caricamento ? <p>Caricamento…</p> : null}
      {erroreCaricamento !== null ? (
        <p style={STILE_ERRORE_GENERALE}>{erroreCaricamento}</p>
      ) : null}
      {!caricamento && erroreCaricamento === null ? (
        settori.length === 0 ? (
          <p>Nessun settore ancora creato.</p>
        ) : (
          <ul style={STILE_ELENCO_SETTORI}>
            {settori.map((settore) => (
              <RigaSettore
                key={settore.id}
                settore={settore}
                categorie={categorie}
                risultato={risultato}
              />
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
