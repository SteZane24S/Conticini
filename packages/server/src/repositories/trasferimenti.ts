import { type MovimentoConDettagli } from '@conticini/dominio';

import { SOLO_ATTIVI, type ContestoScrittura } from '../scrittura.js';
import { mappaMovimento, type RigaMovimento } from './movimenti.js';

function leggiRigheGruppo(
  ctx: ContestoScrittura,
  transferGroupId: string,
): RigaMovimento[] {
  return ctx.db
    .prepare(
      `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, linked_position_id, revision FROM transactions WHERE transfer_group_id = ? AND ${SOLO_ATTIVI}`,
    )
    .all(transferGroupId) as RigaMovimento[];
}

function costruisciTrasferimento(
  transferGroupId: string,
  righe: RigaMovimento[],
): Trasferimento | null {
  if (righe.length !== 2) {
    return null;
  }
  const origine = righe.find((riga) => riga.amount_cents < 0);
  const destinazione = righe.find((riga) => riga.amount_cents > 0);
  if (!origine || !destinazione) {
    return null;
  }
  if (origine.account_id === null || destinazione.account_id === null) {
    return null;
  }
  return {
    transferGroupId,
    data: origine.date,
    amountCents: Math.abs(origine.amount_cents),
    contoOrigineId: origine.account_id,
    contoDestinazioneId: destinazione.account_id,
    descrizione: origine.description,
    movimenti: [mappaMovimento(origine), mappaMovimento(destinazione)],
  };
}

export interface Trasferimento {
  transferGroupId: string;
  data: string;
  amountCents: number;
  contoOrigineId: string;
  contoDestinazioneId: string;
  descrizione: string;
  movimenti: [MovimentoConDettagli, MovimentoConDettagli];
}

export function ottieniTrasferimento(
  ctx: ContestoScrittura,
  transferGroupId: string,
): Trasferimento | null {
  return costruisciTrasferimento(
    transferGroupId,
    leggiRigheGruppo(ctx, transferGroupId),
  );
}

export function elencaTrasferimenti(ctx: ContestoScrittura): Trasferimento[] {
  const gruppi = ctx.db
    .prepare(
      `SELECT transfer_group_id, MAX(date) AS ultima_data FROM transactions WHERE transfer_group_id IS NOT NULL AND ${SOLO_ATTIVI} GROUP BY transfer_group_id ORDER BY ultima_data DESC`,
    )
    .all() as { transfer_group_id: string; ultima_data: string }[];

  return gruppi
    .map((riga) =>
      costruisciTrasferimento(
        riga.transfer_group_id,
        leggiRigheGruppo(ctx, riga.transfer_group_id),
      ),
    )
    .filter(
      (trasferimento): trasferimento is Trasferimento => trasferimento !== null,
    );
}
