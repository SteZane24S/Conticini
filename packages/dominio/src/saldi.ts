import { confrontaDate, type DataISO } from './date.js';
import { somma } from './soldi.js';

export interface Conto {
  id: string;
  saldoInizialeCents: number;
  dataApertura: DataISO;
}

export interface Movimento {
  id: string;
  data: DataISO;
  amountCents: number;
  contoId: string | null;
  categoriaId: string | null;
  transferGroupId: string | null;
  posizioneId: string | null;
}

export interface SaldoConto {
  contoId: string;
  saldoCents: number;
}

export interface LetturaConto {
  id: string;
  contoId: string;
  data: DataISO;
  saldoCents: number;
}

export interface AncoraTotale {
  id: string;
  data: DataISO;
  totaleCents: number;
  movimentiCoperti: string[];
}

export type OrigineSaldoSegnato = 'lettura' | 'storico';

export interface SaldoSegnato extends SaldoConto {
  origine: OrigineSaldoSegnato;
  dataLettura: DataISO | null;
}

export function saldiPerConto(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
): SaldoConto[] {
  return conti
    .filter((conto) => confrontaDate(conto.dataApertura, d) <= 0)
    .map((conto) => {
      const movimentiConto = movimenti.filter(
        (m) => m.contoId === conto.id && confrontaDate(m.data, d) <= 0,
      );

      return {
        contoId: conto.id,
        saldoCents: somma([
          conto.saldoInizialeCents,
          ...movimentiConto.map((m) => m.amountCents),
        ]),
      };
    });
}

export function saldiSegnati(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
  letture: LetturaConto[],
): SaldoSegnato[] {
  return saldiPerConto(d, conti, movimenti).map((saldo) => {
    const lettura = letture
      .filter(
        (candidata) =>
          candidata.contoId === saldo.contoId &&
          confrontaDate(candidata.data, d) <= 0,
      )
      .reduce<LetturaConto | null>(
        (ultima, candidata) =>
          ultima === null || confrontaDate(candidata.data, ultima.data) >= 0
            ? candidata
            : ultima,
        null,
      );

    if (lettura !== null) {
      return {
        contoId: saldo.contoId,
        saldoCents: lettura.saldoCents,
        origine: 'lettura',
        dataLettura: lettura.data,
      };
    }

    return {
      ...saldo,
      origine: 'storico',
      dataLettura: null,
    };
  });
}

export function totaleSenzaAncore(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
): number {
  return somma([
    ...conti
      .filter((conto) => confrontaDate(conto.dataApertura, d) <= 0)
      .map((conto) => conto.saldoInizialeCents),
    ...movimenti
      .filter((movimento) => confrontaDate(movimento.data, d) <= 0)
      .map((movimento) => movimento.amountCents),
  ]);
}

export function totaleA(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
  ancore: AncoraTotale[],
): number {
  const ancora = ancore
    .filter((candidata) => confrontaDate(candidata.data, d) <= 0)
    .reduce<AncoraTotale | null>(
      (ultima, candidata) =>
        ultima === null || confrontaDate(candidata.data, ultima.data) >= 0
          ? candidata
          : ultima,
      null,
    );

  if (ancora === null) {
    return totaleSenzaAncore(d, conti, movimenti);
  }

  const movimentiCoperti = new Set(ancora.movimentiCoperti);
  return somma([
    ancora.totaleCents,
    ...movimenti
      .filter((movimento) => {
        const confrontoConAncora = confrontaDate(movimento.data, ancora.data);
        return (
          (confrontoConAncora > 0 && confrontaDate(movimento.data, d) <= 0) ||
          (confrontoConAncora === 0 && !movimentiCoperti.has(movimento.id))
        );
      })
      .map((movimento) => movimento.amountCents),
    ...conti
      .filter(
        (conto) =>
          confrontaDate(conto.dataApertura, ancora.data) > 0 &&
          confrontaDate(conto.dataApertura, d) <= 0,
      )
      .map((conto) => conto.saldoInizialeCents),
  ]);
}

export function scartoA(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
  letture: LetturaConto[],
  ancore: AncoraTotale[],
): number {
  return somma([
    ...saldiSegnati(d, conti, movimenti, letture).map(
      (saldo) => saldo.saldoCents,
    ),
    -totaleA(d, conti, movimenti, ancore),
  ]);
}

export function calcolaAncora(
  oggi: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
  letture: LetturaConto[],
): Omit<AncoraTotale, 'id'> {
  return {
    data: oggi,
    totaleCents: somma(
      saldiSegnati(oggi, conti, movimenti, letture).map(
        (saldo) => saldo.saldoCents,
      ),
    ),
    movimentiCoperti: movimenti
      .filter((movimento) => confrontaDate(movimento.data, oggi) === 0)
      .map((movimento) => movimento.id),
  };
}
