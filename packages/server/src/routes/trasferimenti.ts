import type { FastifyInstance } from 'fastify';

import { erroreNonTrovato } from '../errori.js';
import {
  elencaTrasferimenti,
  ottieniTrasferimento,
} from '../repositories/trasferimenti.js';
import type { ContestoScrittura } from '../scrittura.js';

export function registraRotteTrasferimenti(
  app: FastifyInstance,
  ctx: ContestoScrittura,
): void {
  app.get('/api/trasferimenti', async () => ({
    ok: true,
    trasferimenti: elencaTrasferimenti(ctx),
  }));

  app.get('/api/trasferimenti/:gruppo', async (request) => {
    const { gruppo } = request.params as { gruppo: string };
    const trasferimento = ottieniTrasferimento(ctx, gruppo);
    if (!trasferimento) {
      throw erroreNonTrovato('trasferimento', gruppo);
    }
    return { ok: true, trasferimento };
  });
}
