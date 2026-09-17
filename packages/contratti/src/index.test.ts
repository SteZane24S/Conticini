import { describe, expect, it } from 'vitest';

import { contratti } from './index.js';

describe('contratti', () => {
  it('esporta un oggetto vuoto tipizzato', () => {
    expect(contratti).toEqual({});
  });
});
