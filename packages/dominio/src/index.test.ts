import { describe, expect, it } from 'vitest';

import { dominio } from './index.js';

describe('dominio', () => {
  it('esporta il placeholder del pacchetto', () => {
    expect(dominio).toBe('dominio');
  });
});
