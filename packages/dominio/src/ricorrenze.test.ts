import { describe, expect, it } from 'vitest';

import { parseDataISO } from './date.js';
import { everyNMonths, monthly, occorrenzeTra, yearly } from './ricorrenze.js';

function scadenze(
  regola: Parameters<typeof occorrenzeTra>[0],
  da: string,
  a: string,
): string[] {
  return occorrenzeTra(regola, parseDataISO(da), parseDataISO(a)).map(
    ({ scadenza }) => scadenza,
  );
}

describe('occorrenzeTra', () => {
  it('clampa il giorno 31 mensile e torna al 31 nel mese successivo', () => {
    const regola = monthly(31, parseDataISO('2023-01-01'));

    expect(scadenze(regola, '2023-01-01', '2023-03-31')).toEqual([
      '2023-01-31',
      '2023-02-28',
      '2023-03-31',
    ]);
  });

  it('clampa il giorno 31 mensile al 29 febbraio in un anno bisestile', () => {
    const regola = monthly(31, parseDataISO('2024-01-01'));

    expect(scadenze(regola, '2024-01-01', '2024-03-31')).toEqual([
      '2024-01-31',
      '2024-02-29',
      '2024-03-31',
    ]);
  });

  it('clampa la ricorrenza annuale del 29 febbraio negli anni non bisestili', () => {
    const regola = yearly(2, 29, parseDataISO('2020-01-01'));

    expect(scadenze(regola, '2023-01-01', '2024-12-31')).toEqual([
      '2023-02-28',
      '2024-02-29',
    ]);
  });

  it('genera ogni tre mesi a partire dallancora di novembre', () => {
    const regola = everyNMonths(3, 11, 15, parseDataISO('2023-01-01'));

    expect(scadenze(regola, '2023-01-01', '2023-12-31')).toEqual([
      '2023-02-15',
      '2023-05-15',
      '2023-08-15',
      '2023-11-15',
    ]);
  });

  it('esclude le occorrenze prima del limite di inizio', () => {
    const regola = monthly(1, parseDataISO('2023-06-01'));

    expect(scadenze(regola, '2023-01-01', '2023-12-31')).toEqual([
      '2023-06-01',
      '2023-07-01',
      '2023-08-01',
      '2023-09-01',
      '2023-10-01',
      '2023-11-01',
      '2023-12-01',
    ]);
  });

  it('esclude le occorrenze dopo il limite di fine', () => {
    const regola = monthly(
      1,
      parseDataISO('2023-01-01'),
      parseDataISO('2023-06-15'),
    );

    expect(scadenze(regola, '2023-01-01', '2023-12-31')).toEqual([
      '2023-01-01',
      '2023-02-01',
      '2023-03-01',
      '2023-04-01',
      '2023-05-01',
      '2023-06-01',
    ]);
  });

  it('riconosce il 2000 come anno bisestile di secolo', () => {
    const regola = yearly(2, 29, parseDataISO('1996-01-01'));

    expect(scadenze(regola, '1999-01-01', '2001-12-31')).toContain(
      '2000-02-29',
    );
  });
});

describe('everyNMonths', () => {
  it.each([0, -3, 1.5])('lancia se n non e un intero positivo: %s', (n) => {
    expect(() => everyNMonths(n, 1, 15, parseDataISO('2023-01-01'))).toThrow(
      'n deve essere un intero positivo: ' + n,
    );
  });
});
