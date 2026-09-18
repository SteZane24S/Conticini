import {
  cicloContenente,
  confrontaDate,
  formatImporto,
  oggiLocale,
  type DataISO,
} from '@conticini/dominio';
import { Link } from 'react-router';
import { useState } from 'react';

import { useAlbero } from './categorie-regole/useAlbero.js';
import { useConti } from './conti/dati.js';
import { useProspetto } from './prospetto/dati.js';
import {
  STILE_ARRETRATA,
  STILE_CELLA,
  STILE_ERRORE_GENERALE,
  STILE_PAGINA,
  STILE_SALDO_GRANDE,
  STILE_SEZIONE,
  STILE_TABELLA,
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

  const dataProssimoStipendio =
    prospetto !== null && prospetto.saldoPrevistoCents !== null
      ? cicloContenente(
          data,
          cicli.map((ciclo) => ({
            ...ciclo,
            startDate: ciclo.startDate as DataISO,
            expectedNextDate: ciclo.expectedNextDate as DataISO | null,
          })),
        )?.expectedNextDate
      : null;

  return (
    <div style={STILE_PAGINA}>
      <h1>Prospetto</h1>
      <section style={STILE_SEZIONE}>
        <label htmlFor="prospetto-data">Data</label>
        <input
          id="prospetto-data"
          type="date"
          value={data}
          onChange={(evento) => setData(evento.target.value as DataISO)}
          required
        />
        {prospetto?.dataFutura && <span>Data futura</span>}
      </section>
      {caricando && <p>Caricamento…</p>}
      {errore && <p style={STILE_ERRORE_GENERALE}>{errore}</p>}
      {!caricando && prospetto !== null && (
        <>
          <section style={STILE_SEZIONE}>
            <h2>Saldo totale</h2>
            <p style={STILE_SALDO_GRANDE}>
              {formatImporto(prospetto.saldoTotaleCents)}
            </p>
            <table style={STILE_TABELLA}>
              <thead>
                <tr>
                  <th style={STILE_CELLA}>Conto</th>
                  <th style={STILE_CELLA}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {prospetto.saldiPerConto.map((saldo) => (
                  <tr key={saldo.contoId}>
                    <td style={STILE_CELLA}>{nomeConto(saldo.contoId)}</td>
                    <td style={STILE_CELLA}>
                      {formatImporto(saldo.saldoCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section style={STILE_SEZIONE}>
            <h2>Fisse ancora da pagare</h2>
            {fisseArricchite.length > 0 ? (
              <table style={STILE_TABELLA}>
                <thead>
                  <tr>
                    <th style={STILE_CELLA}>Nome</th>
                    <th style={STILE_CELLA}>Scadenza</th>
                    <th style={STILE_CELLA}>Importo previsto</th>
                    <th style={STILE_CELLA}>Conto</th>
                    <th style={STILE_CELLA}>Categoria</th>
                    <th style={STILE_CELLA}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {fisseArricchite.map((occorrenza) => {
                    const arretrata =
                      confrontaDate(occorrenza.scadenza as DataISO, data) <= 0;
                    return (
                      <tr key={occorrenza.id}>
                        <td style={STILE_CELLA}>{occorrenza.nome}</td>
                        <td
                          style={{
                            ...STILE_CELLA,
                            ...(arretrata ? STILE_ARRETRATA : {}),
                          }}
                        >
                          {occorrenza.scadenza}
                        </td>
                        <td style={STILE_CELLA}>
                          {formatImporto(occorrenza.amountCentsPrevisto)}
                        </td>
                        <td style={STILE_CELLA}>
                          {nomeConto(occorrenza.contoId)}
                        </td>
                        <td style={STILE_CELLA}>
                          {nomeCategoria(occorrenza.categoriaId)}
                        </td>
                        <td style={STILE_CELLA}>{occorrenza.stato}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>Nessuna spesa fissa ancora da pagare.</p>
            )}
          </section>
          <section style={STILE_SEZIONE}>
            <h2>Previsioni</h2>
            <table style={STILE_TABELLA}>
              <thead>
                <tr>
                  <th style={STILE_CELLA}>Categoria</th>
                  <th style={STILE_CELLA}>Previsto</th>
                  <th style={STILE_CELLA}>Speso</th>
                  <th style={STILE_CELLA}>Residuo</th>
                  <th style={STILE_CELLA}>Sforamento</th>
                </tr>
              </thead>
              <tbody>
                {prospetto.categorie.map((categoria) => (
                  <tr key={categoria.categoriaId}>
                    <td style={STILE_CELLA}>
                      {nomeCategoria(categoria.categoriaId)}
                    </td>
                    <td style={STILE_CELLA}>
                      {formatImporto(categoria.previstoCents)}
                    </td>
                    <td style={STILE_CELLA}>
                      {formatImporto(categoria.speseCents)}
                    </td>
                    <td style={STILE_CELLA}>
                      {formatImporto(categoria.residuoCents)}
                    </td>
                    <td style={STILE_CELLA}>
                      {formatImporto(categoria.sforamentoCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section style={STILE_SEZIONE}>
            <h2>Saldo previsto al prossimo stipendio</h2>
            {prospetto.saldoPrevistoCents === null ? (
              <p>
                {messaggioSaldoPrevistoAssente(
                  prospetto.motivoSaldoPrevistoAssente,
                )}{' '}
                <Link to="/stipendio">Aggiorna la previsione.</Link>
              </p>
            ) : (
              <>
                <p style={STILE_SALDO_GRANDE}>
                  {formatImporto(prospetto.saldoPrevistoCents)}
                  {dataProssimoStipendio !== null &&
                    ` (${dataProssimoStipendio})`}
                </p>
                {prospetto.dopoAccreditoCents !== null && (
                  <p>
                    Dopo l'accredito previsto:{' '}
                    {formatImporto(prospetto.dopoAccreditoCents)}
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
