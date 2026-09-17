import { describe, expect, it } from 'vitest';

import {
  aggiungiMesi,
  annoDi,
  costruisciData,
  confrontaDate,
  isDataISO,
  meseDi,
  oggiLocale,
  parseDataISO,
  ultimoGiornoDelMese,
} from './date.js';

describe('aggiungiMesi', () => {
  it('clampa il giorno allultimo del mese non bisestile', () => {
    expect(aggiungiMesi(parseDataISO('2023-01-31'), 1)).toBe('2023-02-28');
  });

  it('mantiene il giorno originale oltre un mese clampato', () => {
    expect(aggiungiMesi(parseDataISO('2023-01-31'), 2)).toBe('2023-03-31');
  });

  it('clampa il giorno a febbraio in un anno bisestile', () => {
    expect(aggiungiMesi(parseDataISO('2024-01-31'), 1)).toBe('2024-02-29');
  });

  it('gestisce mesi negativi', () => {
    expect(aggiungiMesi(parseDataISO('2023-03-31'), -1)).toBe('2023-02-28');
  });

  it('attraversa la fine dellanno', () => {
    expect(aggiungiMesi(parseDataISO('2023-11-30'), 2)).toBe('2024-01-30');
  });

  it('lancia se n non e un numero intero', () => {
    expect(() => aggiungiMesi(parseDataISO('2023-01-15'), 1.5)).toThrow(
      'n deve essere un numero intero: 1.5',
    );
  });
});

describe('annoDi, meseDi e costruisciData', () => {
  it('estrae anno e mese da una data ISO', () => {
    const data = parseDataISO('2023-05-10');

    expect(annoDi(data)).toBe(2023);
    expect(meseDi(data)).toBe(5);
  });

  it('costruisce una data con mese e giorno zero-padded', () => {
    expect(costruisciData(2023, 5, 9)).toBe('2023-05-09');
  });
});

describe('ultimoGiornoDelMese', () => {
  it.each([
    [2023, 2, 28],
    [2024, 2, 29],
    [2023, 1, 31],
    [2023, 4, 30],
    [2023, 12, 31],
    [2000, 2, 29],
    [1900, 2, 28],
  ])('restituisce %i per %i/%i', (anno, mese, ultimoGiorno) => {
    expect(ultimoGiornoDelMese(anno, mese)).toBe(ultimoGiorno);
  });
});

describe('oggiLocale', () => {
  it('usa i componenti locali', () => {
    expect(oggiLocale(new Date(2026, 8, 17, 23, 30))).toBe('2026-09-17');
  });
});

describe('confrontaDate', () => {
  it('ordina date ISO lessicograficamente', () => {
    expect(
      confrontaDate(parseDataISO('2026-01-01'), parseDataISO('2026-02-01')),
    ).toBe(-1);
    expect(
      confrontaDate(parseDataISO('2026-01-01'), parseDataISO('2026-01-01')),
    ).toBe(0);
    expect(
      confrontaDate(parseDataISO('2026-02-01'), parseDataISO('2026-01-01')),
    ).toBe(1);
  });
});

describe('isDataISO e parseDataISO', () => {
  it('accetta una data bisestile valida', () => {
    expect(isDataISO('2024-02-29')).toBe(true);
  });

  it.each([
    '2023-02-29',
    '2023-13-01',
    '2023-00-10',
    '2023-04-31',
    'non-una-data',
  ])('rifiuta %s', (value) => {
    expect(isDataISO(value)).toBe(false);
  });

  it('parseDataISO lancia per una data non valida', () => {
    expect(() => parseDataISO('2023-02-29')).toThrow(
      'data non valida: 2023-02-29',
    );
  });

  it('parseDataISO non lancia per una data valida', () => {
    expect(() => parseDataISO('2024-02-29')).not.toThrow();
  });
});
