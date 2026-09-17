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
  contoId: string;
  categoriaId: string | null;
  transferGroupId: string | null;
}

export interface SaldoConto {
  contoId: string;
  saldoCents: number;
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

export function saldoA(
  d: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
): number {
  return somma(saldiPerConto(d, conti, movimenti).map((s) => s.saldoCents));
}
