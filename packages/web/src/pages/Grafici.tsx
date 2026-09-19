import {
  aggiungiGiorni,
  confrontaDate,
  formatImporto,
  intervalloCiclo,
  oggiLocale,
  type Ciclo,
  type DataISO,
} from '@conticini/dominio';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAlbero } from './categorie-regole/useAlbero.js';
import {
  type SelezioneIntervallo,
  usePrevistoSpeso,
  useSaldoGiornaliero,
  useSpesePerSettore,
} from './grafici/dati.js';
import {
  STILE_ERRORE_GENERALE,
  STILE_PAGINA,
  STILE_SELETTORE,
  STILE_SEZIONE,
} from './grafici/stili.js';
import { useStipendio } from './stipendio/dati.js';

const COLORI = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

export function Grafici() {
  const { cicli } = useStipendio();
  const { settori: settoriAlbero, categorie } = useAlbero();
  const [modalita, setModalita] = useState<'ciclo' | 'periodo'>('ciclo');
  const [cicloId, setCicloId] = useState('');
  const [dataInizio, setDataInizio] = useState<DataISO>(
    aggiungiGiorni(oggiLocale(new Date()), -30),
  );
  const [dataFine, setDataFine] = useState<DataISO>(oggiLocale(new Date()));
  const [settoreSelezionato, setSettoreSelezionato] = useState<string | null>(
    null,
  );

  const cicliDominio: Ciclo[] = cicli.map((ciclo) => ({
    ...ciclo,
    startDate: ciclo.startDate as DataISO,
    expectedNextDate: ciclo.expectedNextDate as DataISO | null,
  }));
  const cicliOrdinati = [...cicli].sort((a, b) =>
    confrontaDate(a.startDate as DataISO, b.startDate as DataISO),
  );

  useEffect(() => {
    if (cicloId === '' && cicliOrdinati.length > 0) {
      setCicloId(cicliOrdinati[cicliOrdinati.length - 1]!.id);
    }
  }, [cicloId, cicliOrdinati]);

  const selezioneSpese: SelezioneIntervallo | null =
    modalita === 'ciclo'
      ? cicloId === ''
        ? null
        : { tipo: 'ciclo', cicloId }
      : { tipo: 'periodo', dataInizio, dataFine };
  const chiaveSelezioneSpese = JSON.stringify(selezioneSpese);

  useEffect(() => {
    setSettoreSelezionato(null);
  }, [chiaveSelezioneSpese]);

  const intervalloSaldo =
    modalita === 'ciclo' && cicloId !== ''
      ? intervalloCiclo(cicloId, cicliDominio)
      : null;
  const inizioSaldo =
    modalita === 'ciclo' ? (intervalloSaldo?.dataInizio ?? null) : dataInizio;
  const fineSaldo =
    modalita === 'ciclo'
      ? intervalloSaldo === null
        ? null
        : intervalloSaldo.dataFineEsclusiva !== null
          ? aggiungiGiorni(intervalloSaldo.dataFineEsclusiva, -1)
          : oggiLocale(new Date())
      : dataFine;
  const cicloIdPrevistoSpeso =
    modalita === 'ciclo' && cicloId !== '' ? cicloId : null;

  const spesePerSettore = useSpesePerSettore(selezioneSpese);
  const saldoGiornaliero = useSaldoGiornaliero(inizioSaldo, fineSaldo);
  const previstoSpeso = usePrevistoSpeso(cicloIdPrevistoSpeso);

  function nomeSettore(settoreId: string) {
    return (
      settoriAlbero.find((settore) => settore.id === settoreId)?.nome ??
      settoreId
    );
  }

  function nomeCategoria(categoriaId: string) {
    return (
      categorie.find((categoria) => categoria.id === categoriaId)?.nome ??
      categoriaId
    );
  }

  const settoreCorrente = spesePerSettore.settori.find(
    (settore) => settore.settoreId === settoreSelezionato,
  );
  const datiTorta =
    settoreSelezionato === null
      ? spesePerSettore.settori.map((settore) => ({
          ...settore,
          nome: nomeSettore(settore.settoreId),
        }))
      : (settoreCorrente?.categorie ?? []).map((categoria) => ({
          ...categoria,
          nome: nomeCategoria(categoria.categoriaId),
        }));

  return (
    <div style={STILE_PAGINA}>
      <h1>Grafici</h1>
      <section style={STILE_SEZIONE}>
        <h2>Intervallo</h2>
        <div style={STILE_SELETTORE}>
          <label>
            <input
              type="radio"
              checked={modalita === 'ciclo'}
              onChange={() => setModalita('ciclo')}
            />{' '}
            Ciclo
          </label>
          <label>
            <input
              type="radio"
              checked={modalita === 'periodo'}
              onChange={() => setModalita('periodo')}
            />{' '}
            Periodo
          </label>
          {modalita === 'ciclo' ? (
            <select
              value={cicloId}
              onChange={(evento) => setCicloId(evento.target.value)}
            >
              <option value="">Seleziona un ciclo</option>
              {cicliOrdinati.map((ciclo) => (
                <option key={ciclo.id} value={ciclo.id}>
                  Ciclo dal {ciclo.startDate}
                </option>
              ))}
            </select>
          ) : (
            <>
              <label>
                Da
                <input
                  type="date"
                  value={dataInizio}
                  onChange={(evento) =>
                    setDataInizio(evento.target.value as DataISO)
                  }
                  required
                />
              </label>
              <label>
                A
                <input
                  type="date"
                  value={dataFine}
                  onChange={(evento) =>
                    setDataFine(evento.target.value as DataISO)
                  }
                  required
                />
              </label>
            </>
          )}
        </div>
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Spese per settore</h2>
        {settoreSelezionato !== null && (
          <button type="button" onClick={() => setSettoreSelezionato(null)}>
            ← Torna ai settori
          </button>
        )}
        {spesePerSettore.caricando && <p>Caricamento…</p>}
        {spesePerSettore.errore && (
          <p style={STILE_ERRORE_GENERALE}>{spesePerSettore.errore}</p>
        )}
        {!spesePerSettore.caricando &&
          spesePerSettore.errore === null &&
          (datiTorta.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datiTorta}
                  dataKey="speseCents"
                  nameKey="nome"
                  label={({ name, value }) =>
                    `${name}: ${formatImporto(Number(value))}`
                  }
                  onClick={(dato) => {
                    if (
                      settoreSelezionato === null &&
                      'settoreId' in dato &&
                      typeof dato.settoreId === 'string'
                    ) {
                      setSettoreSelezionato(dato.settoreId);
                    }
                  }}
                >
                  {datiTorta.map((dato, indice) => (
                    <Cell
                      key={dato.nome}
                      fill={COLORI[indice % COLORI.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valore) => formatImporto(Number(valore))}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>Nessun dato disponibile.</p>
          ))}
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Saldo giornaliero</h2>
        {saldoGiornaliero.caricando && <p>Caricamento…</p>}
        {saldoGiornaliero.errore && (
          <p style={STILE_ERRORE_GENERALE}>{saldoGiornaliero.errore}</p>
        )}
        {!saldoGiornaliero.caricando &&
          saldoGiornaliero.errore === null &&
          (saldoGiornaliero.punti.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={saldoGiornaliero.punti}>
                <XAxis dataKey="data" />
                <YAxis
                  tickFormatter={(valore) => formatImporto(Number(valore))}
                />
                <Tooltip
                  formatter={(valore) => formatImporto(Number(valore))}
                />
                <Line
                  type="monotone"
                  dataKey="saldoCents"
                  name="Saldo"
                  stroke="#2563eb"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>Nessun dato disponibile.</p>
          ))}
      </section>

      <section style={STILE_SEZIONE}>
        <h2>Previsto e speso</h2>
        {modalita === 'periodo' ? (
          <p>Disponibile solo selezionando un ciclo.</p>
        ) : (
          <>
            {previstoSpeso.caricando && <p>Caricamento…</p>}
            {previstoSpeso.errore && (
              <p style={STILE_ERRORE_GENERALE}>{previstoSpeso.errore}</p>
            )}
            {!previstoSpeso.caricando &&
              previstoSpeso.errore === null &&
              previstoSpeso.previstoSpeso !== null && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        nome: 'Totale',
                        previstoCents:
                          previstoSpeso.previstoSpeso.previstoTotaleCents,
                        speseCents:
                          previstoSpeso.previstoSpeso.speseTotaleCents,
                      },
                    ]}
                  >
                    <XAxis dataKey="nome" />
                    <YAxis
                      tickFormatter={(valore) => formatImporto(Number(valore))}
                    />
                    <Tooltip
                      formatter={(valore) => formatImporto(Number(valore))}
                    />
                    <Legend />
                    <Bar
                      dataKey="previstoCents"
                      name="Previsto"
                      fill="#2563eb"
                    />
                    <Bar dataKey="speseCents" name="Speso" fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </>
        )}
      </section>
    </div>
  );
}
