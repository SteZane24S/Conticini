import { describe, expect, it } from 'vitest';

import { server } from './index.js';

describe('server', () => {
  it('esporta il placeholder del pacchetto', () => {
    expect(server).toBe('server');
  });
});
