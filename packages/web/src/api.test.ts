import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { apiGet, apiInvia, ErroreApi } from './api.js';

const persona = z.object({ nome: z.string() });

function rispostaJson(
  corpo: unknown,
  ok = true,
  status = ok ? 200 : 400,
): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(corpo)),
  } as Response;
}

function rispostaVuota(ok = false, status = ok ? 200 : 421): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(''),
  } as Response;
}

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restituisce il valore parsato dallo schema su risposta 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(rispostaJson({ nome: 'Ada' })),
    );

    const risultato = await apiGet('/api/persona', persona);

    expect(risultato).toEqual({ nome: 'Ada' });
  });

  it('lancia ErroreApi con codice, messaggio e campo su risposta non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          rispostaJson(
            { ok: false, errore: { codice: 'x', messaggio: 'y', campo: 'z' } },
            false,
          ),
        ),
    );

    await expect(apiGet('/api/persona', persona)).rejects.toBeInstanceOf(
      ErroreApi,
    );

    try {
      await apiGet('/api/persona', persona);
      expect.unreachable('doveva lanciare ErroreApi');
    } catch (errore) {
      const erroreApi = errore as ErroreApi;
      expect(erroreApi.codice).toBe('x');
      expect(erroreApi.message).toBe('y');
      expect(erroreApi.campo).toBe('z');
    }
  });

  it('lancia ErroreApi con codice errore_sconosciuto su risposta non-ok con corpo vuoto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rispostaVuota()));

    await expect(apiGet('/api/persona', persona)).rejects.toBeInstanceOf(
      ErroreApi,
    );

    try {
      await apiGet('/api/persona', persona);
      expect.unreachable('doveva lanciare ErroreApi');
    } catch (errore) {
      const erroreApi = errore as ErroreApi;
      expect(erroreApi.codice).toBe('errore_sconosciuto');
    }
  });
});

describe('apiInvia', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('chiama fetch con il metodo e il body corretti', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rispostaJson({ nome: 'Ada' }));
    vi.stubGlobal('fetch', fetchMock);
    const corpo = { nome: 'Ada' };

    await apiInvia('POST', '/api/persona', corpo, persona);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/persona',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(corpo),
      }),
    );
  });
});
