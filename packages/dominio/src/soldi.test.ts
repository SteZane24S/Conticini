import { describe, expect, it } from 'vitest';

import { formatImporto, parseImporto, somma } from './soldi.js';

describe('parseImporto', () => {
  it('converte il formato it-IT con migliaia e decimali', () => {
    expect(parseImporto('1.234,56')).toBe(123456);
  });

  it('converte il formato con punto decimale', () => {
    expect(parseImporto('1234.56')).toBe(123456);
  });

  it('converte un importo intero negativo', () => {
    expect(parseImporto('-12')).toBe(-1200);
  });

  it('completa un singolo decimale', () => {
    expect(parseImporto('12,5')).toBe(1250);
  });

  it('rifiuta troppi decimali', () => {
    expect(() => parseImporto('12,345')).toThrow('importo non valido: 12,345');
  });

  it('interpreta un punto con tre cifre come separatore delle migliaia', () => {
    expect(parseImporto('12.345')).toBe(1234500);
  });

  it('rifiuta testo non numerico', () => {
    expect(() => parseImporto('abc')).toThrow('importo non valido: abc');
  });

  it('rifiuta un importo vuoto', () => {
    expect(() => parseImporto('')).toThrow('importo non valido: ');
  });

  it('rifiuta un importo oltre il limite', () => {
    expect(() => parseImporto('100000000,01')).toThrow(
      'importo non valido: 100000000,01',
    );
  });
});

describe('formatImporto', () => {
  it('formatta un importo positivo', () => {
    expect(formatImporto(123456)).toBe('1.234,56 €');
  });

  it('formatta un importo negativo', () => {
    expect(formatImporto(-1200)).toBe('-12,00 €');
  });

  it('formatta zero', () => {
    expect(formatImporto(0)).toBe('0,00 €');
  });
});

describe('somma', () => {
  it('somma valori positivi e negativi', () => {
    expect(somma([100, 200, -50])).toBe(250);
  });

  it('rifiuta un totale oltre lintero sicuro', () => {
    expect(() => somma([Number.MAX_SAFE_INTEGER, 10])).toThrow(
      'overflow nella somma degli importi',
    );
  });
});
