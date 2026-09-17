import { describe, expect, it } from 'vitest';

import { parseDataISO, type DataISO } from './date.js';
import { saldiPerConto, type Conto } from './saldi.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

describe('saldiPerConto', () => {
  it('esclude il conto non ancora aperto alla data richiesta', () => {
    const conti: Conto[] = [
      {
        id: 'conto-futuro',
        saldoInizialeCents: 10_000,
        dataApertura: data('2024-01-11'),
      },
    ];

    expect(saldiPerConto(data('2024-01-10'), conti, [])).toEqual([]);
  });

  it('include il conto aperto esattamente alla data richiesta', () => {
    const conti: Conto[] = [
      {
        id: 'conto-aperto',
        saldoInizialeCents: 10_000,
        dataApertura: data('2024-01-10'),
      },
    ];

    expect(saldiPerConto(data('2024-01-10'), conti, [])).toEqual([
      { contoId: 'conto-aperto', saldoCents: 10_000 },
    ]);
  });
});
