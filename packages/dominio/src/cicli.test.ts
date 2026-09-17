import { describe, expect, it } from 'vitest';

import { cicloContenente, type Ciclo } from './cicli.js';
import { parseDataISO, type DataISO } from './date.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

const cicli: Ciclo[] = [
  {
    id: 'gennaio',
    startDate: data('2024-01-05'),
    expectedNextDate: data('2024-02-05'),
    expectedAmountCents: 100_000,
  },
  {
    id: 'febbraio',
    startDate: data('2024-02-05'),
    expectedNextDate: data('2024-03-05'),
    expectedAmountCents: 100_000,
  },
];

describe('cicloContenente', () => {
  it('ritorna null prima del primo ciclo', () => {
    expect(cicloContenente(data('2024-01-04'), cicli)).toBeNull();
  });

  it('ritorna lultimo ciclo quando la data e dopo tutti gli startDate', () => {
    expect(cicloContenente(data('2024-03-01'), cicli)).toEqual(cicli[1]);
  });
});
