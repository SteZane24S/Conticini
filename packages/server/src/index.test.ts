import { describe, expect, it } from 'vitest';

import { checkExistingInstance } from './index.js';

describe('checkExistingInstance', () => {
  it('riconosce un server Conticini già attivo', async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, versione: '0.0.0' }),
      }) as Response) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'conticini',
    );
  });

  it('considera libera la porta se la connessione è rifiutata', async () => {
    const error = new Error('connect ECONNREFUSED');
    (error as Error & { cause?: unknown }).cause = { code: 'ECONNREFUSED' };
    const fetchImpl = (async () => {
      throw error;
    }) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe('free');
  });

  it('considera occupata la porta se risponde ma non è Conticini', async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        json: async () => ({ altro: true }),
      }) as Response) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'occupied',
    );
  });

  it('considera occupata la porta se la risposta non è ok', async () => {
    const fetchImpl = (async () =>
      ({
        ok: false,
        json: async () => ({}),
      }) as Response) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'occupied',
    );
  });

  it('considera occupata la porta se il JSON non è valido', async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        json: async () => {
          throw new Error('JSON non valido');
        },
      }) as unknown as Response) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'occupied',
    );
  });

  it('considera occupata la porta se versione non è una stringa', async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        json: async () => ({ ok: true, versione: 123 }),
      }) as Response) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'occupied',
    );
  });

  it('considera occupata la porta su un errore diverso da ECONNREFUSED', async () => {
    const fetchImpl = (async () => {
      throw new Error('timeout');
    }) as typeof fetch;

    await expect(checkExistingInstance(47300, fetchImpl)).resolves.toBe(
      'occupied',
    );
  });
});
