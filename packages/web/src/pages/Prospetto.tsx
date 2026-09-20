import {
  cicloContenente,
  confrontaDate,
  formatImporto,
  oggiLocale,
  type DataISO,
} from '@conticini/dominio';
import { Link } from 'react-router';
import { useState } from 'react';

import { Campo, Etichetta, Tabella } from '../components/index.js';
import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useProspetto } from './prospetto/dati.js';
import {
  STILE_AVVISO,
  STILE_AVVISO_TESTO,
  STILE_AVVISO_TITOLO,
  STILE_BARRA_CONTENITORE,
  STILE_CAMPO_DATA,
  STILE_CELLA_CARD,
  STILE_CELLA_DESTRA,
  STILE_COLONNA_SALDO_PRINCIPALE,
  STILE_COLONNA_SALDO_SECONDARIA,
  STILE_ERRORE_GENERALE,
  STILE_GRID_SEZIONI,
  STILE_IMPORTO_FISSA,
  STILE_INTESTAZIONE,
  STILE_KICKER,
  STILE_META_FISSA,
  STILE_NOME_FISSA,
  STILE_NOTA_ATTENUATA,
  STILE_NUMERO_GRANDE,
  STILE_NUMERO_MEDIO,
  STILE_PAGINA,
  STILE_RIGA_CARD,
  STILE_RIGA_FISSA,
  STILE_RIGA_FISSA_ARRETRATA,
  STILE_RIGA_NUMERO,
  STILE_RIQUADRO_SALDO,
  STILE_TITOLO_SEZIONE,
  STILE_VALORE_CARD,
  stileBarraRiempimento,
} from './prospetto/stili.js';
import { useStipendio } from './stipendio/dati.js';

function messaggioSaldoPrevistoAssente(
  motivo: 'orizzonte_mancante' | 'orizzonte_superato' | 'nessun_ciclo' | null,
): string {
  switch (motivo) {
    case 'nessun_ciclo':
      return 'Nessuno stipendio registrato.';
    case 'orizzonte_mancante':
      return 'Manca la data prevista del prossimo stipendio.';
    case 'orizzonte_superato':
      return 'La data prevista del prossimo stipendio è già passata.';
    default:
      return 'Il saldo previsto non è calcolabile.';
  }
}

export function Prospetto() {
  const [data, setData] = useState<DataISO>(oggiLocale(new Date()));
  const { conti } = useConti();
  const { categorie } = useAlbero();
  const { cicli } = useStipendio();
  const { prospetto, fisseArricchite, caricando, errore } = useProspetto(data);

  function nomeConto(contoId: string) {
    return conti.find((conto) => conto.id === contoId)?.nome ?? contoId;
  }
  function nomeCategoria(categoriaId: string | null) {
    return categoriaId === null
      ? '—'
      : (categorie.find((categoria) => categoria.id === categoriaId)?.nome ??
          categoriaId);
  }

  const cicloProssimo =
    prospetto !== null && prospetto.saldoPrevistoCents !== null
      ? cicloContenente(
          data,
          cicli.map((ciclo) => ({
            ...ciclo,
            startDate: ciclo.startDate as DataISO,
            expectedNextDate: ciclo.expectedNextDate as DataISO | null,
          })),
        )
      : null;
  const dataProssimoStipendio = cicloProssimo?.expectedNextDate ?? null;
  const accreditoPrevistoCents = cicloProssimo?.expectedAmountCents ?? null;

  return (
    <div style={STILE_PAGINA}>
      <div style={STILE_INTESTAZIONE}>
        <h1 style={{ margin: 0 }}>Prospetto</h1>
        <div style={STILE_CAMPO_DATA}>
          <Campo etichetta="Data di riferimento" idCampo="prospetto-data">
            <input
              id="prospetto-data"
              className="input"
              type="date"
              value={data}
              onChange={(evento) => setData(evento.target.value as DataISO)}
              required
            />
          </Campo>
          {prospetto?.dataFutura && (
            <Etichetta variante="outline">Data futura</Etichetta>
          )}
        </div>
      </div>
      {caricando && <p>Caricamento…</p>}
      {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {!caricando && prospetto !== null && (
        <>
          {prospetto.saldoPrevistoCents === null ? (
            <div style={STILE_AVVISO}>
              <div style={STILE_AVVISO_TESTO}>
                <div style={STILE_AVVISO_TITOLO}>
                  Manca la data del prossimo stipendio
                </div>
                <div>
                  {messaggioSaldoPrevistoAssente(
                    prospetto.motivoSaldoPrevistoAssente,
                  )}
                </div>
              </div>
              <Link to="/stipendio" className="btn btn-primary">
                Imposta ora
              </Link>
            </div>
          ) : (
            <div style={STILE_RIQUADRO_SALDO}>
              <div style={STILE_COLONNA_SALDO_PRINCIPALE}>
                <div style={STILE_KICKER}>
                  Saldo previsto al prossimo stipendio
                </div>
                <div style={STILE_RIGA_NUMERO}>
                  <span
                    style={{
                      ...STILE_NUMERO_GRANDE,
                      color:
                        prospetto.saldoPrevistoCents >= 0
                          ? 'var(--verde)'
                          : 'var(--rosso)',
                    }}
                  >
                    {formatImporto(prospetto.saldoPrevistoCents)}
                  </span>
                  {dataProssimoStipendio !== null && (
                    <span style={STILE_NOTA_ATTENUATA}>
                      al {dataProssimoStipendio}
                    </span>
                  )}
                </div>
              </div>
              <div style={STILE_COLONNA_SALDO_SECONDARIA}>
                <div style={STILE_KICKER}>Dopo l'accredito previsto</div>
                <div style={STILE_NUMERO_MEDIO}>
                  {prospetto.dopoAccreditoCents !== null
                    ? formatImporto(prospetto.dopoAccreditoCents)
                    : '—'}
                </div>
                {accreditoPrevistoCents !== null &&
                  dataProssimoStipendio !== null && (
                    <div style={STILE_NOTA_ATTENUATA}>
                      accredito stimato{' '}
                      <span style={{ color: 'var(--verde)' }}>
                        {formatImporto(accreditoPrevistoCents)}
                      </span>{' '}
                      il {dataProssimoStipendio}
                    </div>
                  )}
              </div>
            </div>
          )}

          <div style={STILE_RIGA_CARD}>
            <div style={STILE_CELLA_CARD}>
              <div style={STILE_KICKER}>Saldo totale</div>
              <div
                style={{
                  ...STILE_VALORE_CARD,
                  color:
                    prospetto.saldoTotaleCents < 0 ? 'var(--rosso)' : undefined,
                }}
              >
                {formatImporto(prospetto.saldoTotaleCents)}
              </div>
            </div>
            {prospetto.saldiPerConto.map((saldo) => (
              <div style={STILE_CELLA_CARD} key={saldo.contoId}>
                <div style={STILE_KICKER}>{nomeConto(saldo.contoId)}</div>
                <div
                  style={{
                    ...STILE_VALORE_CARD,
                    color: saldo.saldoCents < 0 ? 'var(--rosso)' : undefined,
                  }}
                >
                  {formatImporto(saldo.saldoCents)}
                </div>
              </div>
            ))}
          </div>

          <div style={STILE_GRID_SEZIONI}>
            <section>
              <div style={STILE_TITOLO_SEZIONE}>
                <h2 style={{ margin: 0, fontSize: '17px' }}>
                  Spese fisse ancora da pagare
                </h2>
                <span style={STILE_NOTA_ATTENUATA}>
                  {formatImporto(prospetto.totaleFisseAncoraDaPagareCents)}
                </span>
              </div>
              {fisseArricchite.length > 0 ? (
                fisseArricchite.map((occorrenza) => {
                  const arretrata =
                    confrontaDate(occorrenza.scadenza as DataISO, data) <= 0;
                  return (
                    <div
                      key={occorrenza.id}
                      style={{
                        ...STILE_RIGA_FISSA,
                        ...(arretrata ? STILE_RIGA_FISSA_ARRETRATA : {}),
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={STILE_NOME_FISSA}>
                          <span>{occorrenza.nome}</span>
                          {arretrata && (
                            <Etichetta variante="accent">arretrata</Etichetta>
                          )}
                        </div>
                        <div style={STILE_META_FISSA}>
                          {occorrenza.scadenza} ·{' '}
                          {nomeCategoria(occorrenza.categoriaId)} ·{' '}
                          {nomeConto(occorrenza.contoId)}
                        </div>
                      </div>
                      <div style={STILE_IMPORTO_FISSA}>
                        {formatImporto(occorrenza.amountCentsPrevisto)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={STILE_NOTA_ATTENUATA}>
                  Nessuna occorrenza aperta entro l'orizzonte del ciclo.
                </p>
              )}
            </section>

            <section>
              <div style={STILE_TITOLO_SEZIONE}>
                <h2 style={{ margin: 0, fontSize: '17px' }}>
                  Previsioni per categoria
                </h2>
              </div>
              <Tabella>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style={STILE_CELLA_DESTRA}>Previsto</th>
                    <th style={STILE_CELLA_DESTRA}>Speso</th>
                    <th style={STILE_CELLA_DESTRA}>Residuo</th>
                    <th style={STILE_CELLA_DESTRA}>Sforamento</th>
                  </tr>
                </thead>
                <tbody>
                  {prospetto.categorie.map((categoria) => {
                    const sforato = categoria.sforamentoCents > 0;
                    const percentuale =
                      categoria.previstoCents > 0
                        ? (categoria.speseCents / categoria.previstoCents) * 100
                        : categoria.speseCents > 0
                          ? 100
                          : 0;
                    return (
                      <tr key={categoria.categoriaId}>
                        <td>
                          <div>{nomeCategoria(categoria.categoriaId)}</div>
                          <div style={STILE_BARRA_CONTENITORE}>
                            <div
                              style={stileBarraRiempimento(
                                percentuale,
                                sforato,
                              )}
                            />
                          </div>
                        </td>
                        <td style={STILE_CELLA_DESTRA}>
                          {formatImporto(categoria.previstoCents)}
                        </td>
                        <td style={STILE_CELLA_DESTRA}>
                          {formatImporto(categoria.speseCents)}
                        </td>
                        <td style={STILE_CELLA_DESTRA}>
                          {formatImporto(categoria.residuoCents)}
                        </td>
                        <td
                          style={{
                            ...STILE_CELLA_DESTRA,
                            color: sforato ? 'var(--rosso)' : undefined,
                          }}
                        >
                          {formatImporto(categoria.sforamentoCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tabella>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
