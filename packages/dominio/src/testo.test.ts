import { describe, expect, it } from 'vitest';

import { normalizzaTesto } from './testo.js';

describe('normalizzaTesto', () => {
  it('normalizza maiuscole, spazi e accenti', () => {
    expect(normalizzaTesto('CAFFÈ   AL   BAR')).toBe('caffe al bar');
  });

  it('normalizza testo con spazi ai bordi e accenti', () => {
    expect(normalizzaTesto('  Perché  Sì  ')).toBe('perche si');
  });

  it('rimuove gli accenti anche da testo già minuscolo', () => {
    expect(normalizzaTesto('già')).toBe('gia');
  });

  it('mantiene vuota una stringa vuota', () => {
    expect(normalizzaTesto('')).toBe('');
  });

  it('mantiene invariato il testo già normalizzato', () => {
    expect(normalizzaTesto('abc')).toBe('abc');
  });
});
