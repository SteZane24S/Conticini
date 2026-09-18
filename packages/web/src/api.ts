import { erroreApiSchema } from '@conticini/contratti';

interface SchemaConParse<T> {
  parse: (dato: unknown) => T;
}

export const rispostaOkSchema: SchemaConParse<{ ok: true }> = {
  parse: (dato: unknown) => dato as { ok: true },
};

export class ErroreApi extends Error {
  readonly codice: string;
  readonly campo?: string;

  constructor(codice: string, messaggio: string, campo?: string) {
    super(messaggio);
    this.name = 'ErroreApi';
    this.codice = codice;
    this.campo = campo;
  }
}

async function richiedi(
  percorso: string,
  opzioni?: RequestInit,
): Promise<unknown> {
  const risposta = await fetch(percorso, {
    ...opzioni,
    headers: {
      ...(opzioni?.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...opzioni?.headers,
    },
  });
  const testo = await risposta.text();
  let corpo: unknown;
  if (testo !== '') {
    try {
      corpo = JSON.parse(testo);
    } catch {
      corpo = undefined;
    }
  }
  if (!risposta.ok) {
    const erroreParsato = erroreApiSchema.safeParse(corpo);
    if (erroreParsato.success) {
      throw new ErroreApi(
        erroreParsato.data.errore.codice,
        erroreParsato.data.errore.messaggio,
        erroreParsato.data.errore.campo,
      );
    }
    throw new ErroreApi(
      'errore_sconosciuto',
      'Errore di comunicazione con il server.',
    );
  }
  return corpo;
}

export async function apiGet<T>(
  percorso: string,
  schema: SchemaConParse<T>,
): Promise<T> {
  return schema.parse(await richiedi(percorso));
}

export async function apiInvia<T>(
  metodo: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  percorso: string,
  corpo: unknown,
  schema: SchemaConParse<T>,
): Promise<T> {
  return schema.parse(
    await richiedi(percorso, { method: metodo, body: JSON.stringify(corpo) }),
  );
}
