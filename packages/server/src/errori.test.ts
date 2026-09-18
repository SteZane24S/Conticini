import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import {
  ErroreApi,
  erroreDominio,
  erroreNomeDuplicato,
  erroreNonTrovato,
  erroreValidazione,
  registraGestoreErrori,
} from './errori.js';

describe('errori API', () => {
  it('crea un errore per entità non trovata', () => {
    const errore = erroreNonTrovato('Conto', 'conto-1');

    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.status).toBe(404);
    expect(errore.codice).toBe('non_trovato');
    expect(errore.message).toBe('Conto non trovato: conto-1');
    expect(errore.campo).toBeUndefined();
  });

  it('crea un errore per nome duplicato', () => {
    const errore = erroreNomeDuplicato('nome', 'Conto principale');

    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.status).toBe(409);
    expect(errore.codice).toBe('nome_duplicato');
    expect(errore.message).toBe(
      'Esiste già un elemento con questo nome: Conto principale',
    );
    expect(errore.campo).toBe('nome');
  });

  it('crea un errore per una violazione di dominio nota', () => {
    const errore = erroreDominio('segno_non_coerente', 'amount_cents');

    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.status).toBe(422);
    expect(errore.codice).toBe('segno_non_coerente');
    expect(errore.message).toBe(
      "Il segno dell'importo non è coerente con il tipo della categoria.",
    );
    expect(errore.campo).toBe('amount_cents');
  });

  it('usa il messaggio predefinito per una violazione di dominio sconosciuta', () => {
    const errore = erroreDominio('motivo_sconosciuto');

    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.status).toBe(422);
    expect(errore.codice).toBe('motivo_sconosciuto');
    expect(errore.message).toBe('Regola di dominio non rispettata.');
    expect(errore.campo).toBeUndefined();
  });

  it('crea un errore per richiesta non valida', () => {
    const errore = erroreValidazione('Il valore non è valido.', 'valore');

    expect(errore).toBeInstanceOf(ErroreApi);
    expect(errore.status).toBe(400);
    expect(errore.codice).toBe('richiesta_non_valida');
    expect(errore.message).toBe('Il valore non è valido.');
    expect(errore.campo).toBe('valore');
  });

  it('formatta gli errori ErroreApi nelle risposte HTTP', async () => {
    const app = Fastify();
    app.get('/errore-api', async () => {
      throw new ErroreApi(422, 'motivo_test', 'messaggio di test', 'campoTest');
    });
    registraGestoreErrori(app);

    const response = await app.inject({ method: 'GET', url: '/errore-api' });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      errore: {
        codice: 'motivo_test',
        messaggio: 'messaggio di test',
        campo: 'campoTest',
      },
    });
    await app.close();
  });

  it('omette il campo dalle risposte HTTP quando l’errore non lo ha', async () => {
    const app = Fastify();
    app.get('/errore-non-trovato', async () => {
      throw erroreNonTrovato('conto', 'id-test');
    });
    registraGestoreErrori(app);

    const response = await app.inject({
      method: 'GET',
      url: '/errore-non-trovato',
    });
    const body = response.json() as {
      ok: false;
      errore: Record<string, unknown>;
    };

    expect(response.statusCode).toBe(404);
    expect(body.errore).toEqual({
      codice: 'non_trovato',
      messaggio: 'conto non trovato: id-test',
    });
    expect('campo' in body.errore).toBe(false);
    await app.close();
  });

  it('formatta gli errori generici come errori interni', async () => {
    const app = Fastify();
    app.get('/errore-generico', async () => {
      throw new Error('errore generico');
    });
    registraGestoreErrori(app);

    const response = await app.inject({
      method: 'GET',
      url: '/errore-generico',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      ok: false,
      errore: {
        codice: 'errore_interno',
        messaggio: 'Errore interno del server.',
      },
    });
    await app.close();
  });
});
