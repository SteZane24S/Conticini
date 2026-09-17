import { describe, expect, it } from 'vitest';

import { web } from './index.js';

describe('web', () => {
  it('esporta il placeholder del pacchetto', () => {
    expect(web).toBe('web');
  });
});
