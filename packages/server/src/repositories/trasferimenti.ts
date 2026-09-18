import { randomUUID } from 'node:crypto';

import {
  normalizzaTesto,
  validaDataApertura,
  validaTrasferimento,
  type DataISO,
  type Movimento,
  type MovimentoConDettagli,
} from '@conticini/dominio';

import {
  erroreDominio,
  erroreNonTrovato,
  erroreValidazione,
} from '../errori.js';
import {
  aggiorna as aggiornaRiga,
  cancella,
  inserisci,
  SOLO_ATTIVI,
  type ContestoScrittura,
} from '../scrittura.js';
import {
  leggiConto,
  mappaMovimento,
  type RigaConto,
  type RigaMovimento,
} from './movimenti.js';

function leggiRigheGruppo(
  ctx: ContestoScrittura,
  transferGroupId: string,
): RigaMovimento[] {
  return ctx.db
    .prepare(
      `SELECT id, date, amount_cents, account_id, category_id, description, description_norm, transfer_group_id, revision FROM transactions WHERE transfer_group_id = ? AND ${SOLO_ATTIVI}`,
    )
    .all(transferGroupId) as RigaMovimento[];
}

function creaMovimentoPerValidazione(dati: {
  data: string;
  amountCents: number;
  contoId: string;
  transferGroupId: string;
}): Movimento {
  return {
    id: '',
    data: dati.data as DataISO,
    amountCents: dati.amountCents,
    contoId: dati.contoId,
    categoriaId: null,
    transferGroupId: dati.transferGroupId,
  };
}

function validaData(movimento: Movimento, conto: RigaConto): void {
  const esito = validaDataApertura(movimento, {
    id: conto.id,
    dataApertura: conto.opened_on as DataISO,
    saldoInizialeCents: 0,
  });
  if (!esito.valido) {
    throw erroreDominio(esito.motivo, 'data');
  }
}

function validaImporto(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw erroreValidazione(
      "L'importo del trasferimento deve essere positivo.",
      'amountCents',
    );
  }
}

function campoErroreTrasferimento(motivo: Parameters<typeof erroreDominio>[0]) {
  switch (motivo) {
    case 'stesso_conto':
      return 'contoDestinazioneId';
    case 'importi_non_opposti':
      return 'amountCents';
    case 'date_diverse':
      return 'data';
    case 'numero_movimenti':
    case 'categoria_non_nulla':
      return undefined;
    default:
      return undefined;
  }
}

function validaTrasferimentoCompleto(
  dati: Omit<DatiTrasferimento, 'descrizione'>,
  transferGroupId: string,
  contoOrigine: RigaConto,
  contoDestinazione: RigaConto,
): void {
  const origine = creaMovimentoPerValidazione({
    data: dati.data,
    amountCents: -dati.amountCents,
    contoId: dati.contoOrigineId,
    transferGroupId,
  });
  const destinazione = creaMovimentoPerValidazione({
    data: dati.data,
    amountCents: dati.amountCents,
    contoId: dati.contoDestinazioneId,
    transferGroupId,
  });
  const esito = validaTrasferimento([origine, destinazione]);
  if (!esito.valido) {
    throw erroreDominio(esito.motivo, campoErroreTrasferimento(esito.motivo));
  }
  validaData(origine, contoOrigine);
  validaData(destinazione, contoDestinazione);
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

export interface DatiTrasferimento {
  data: string;
  amountCents: number;
  contoOrigineId: string;
  contoDestinazioneId: string;
  descrizione: string;
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

export function creaTrasferimento(
  ctx: ContestoScrittura,
  dati: DatiTrasferimento,
): Trasferimento {
  validaImporto(dati.amountCents);
  const contoOrigine = leggiConto(ctx, dati.contoOrigineId);
  if (!contoOrigine) {
    throw erroreNonTrovato('conto', dati.contoOrigineId);
  }
  const contoDestinazione = leggiConto(ctx, dati.contoDestinazioneId);
  if (!contoDestinazione) {
    throw erroreNonTrovato('conto', dati.contoDestinazioneId);
  }

  const transferGroupId = randomUUID();
  validaTrasferimentoCompleto(
    dati,
    transferGroupId,
    contoOrigine,
    contoDestinazione,
  );

  const descriptionNorm = normalizzaTesto(dati.descrizione);
  const idOrigine = randomUUID();
  const idDestinazione = randomUUID();
  const scrivi = ctx.db.transaction(() => {
    inserisci(ctx, 'transactions', 'transactions', idOrigine, {
      date: dati.data,
      amount_cents: -dati.amountCents,
      account_id: dati.contoOrigineId,
      category_id: null,
      description: dati.descrizione,
      description_norm: descriptionNorm,
      transfer_group_id: transferGroupId,
    });
    inserisci(ctx, 'transactions', 'transactions', idDestinazione, {
      date: dati.data,
      amount_cents: dati.amountCents,
      account_id: dati.contoDestinazioneId,
      category_id: null,
      description: dati.descrizione,
      description_norm: descriptionNorm,
      transfer_group_id: transferGroupId,
    });
  });
  scrivi();

  const trasferimento = ottieniTrasferimento(ctx, transferGroupId);
  if (!trasferimento) {
    throw erroreNonTrovato('trasferimento', transferGroupId);
  }
  return trasferimento;
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

export function aggiornaTrasferimento(
  ctx: ContestoScrittura,
  transferGroupId: string,
  dati: Partial<DatiTrasferimento>,
): Trasferimento {
  const righe = leggiRigheGruppo(ctx, transferGroupId);
  const corrente = costruisciTrasferimento(transferGroupId, righe);
  if (!corrente) {
    throw erroreNonTrovato('trasferimento', transferGroupId);
  }
  const origine = righe.find((riga) => riga.amount_cents < 0)!;
  const destinazione = righe.find((riga) => riga.amount_cents > 0)!;
  const effettivi: DatiTrasferimento = {
    data: dati.data ?? origine.date,
    amountCents: dati.amountCents ?? Math.abs(origine.amount_cents),
    contoOrigineId: dati.contoOrigineId ?? origine.account_id,
    contoDestinazioneId: dati.contoDestinazioneId ?? destinazione.account_id,
    descrizione: dati.descrizione ?? origine.description,
  };

  validaImporto(effettivi.amountCents);

  const contoOrigine = leggiConto(ctx, effettivi.contoOrigineId);
  if (!contoOrigine) {
    throw erroreNonTrovato('conto', effettivi.contoOrigineId);
  }
  const contoDestinazione = leggiConto(ctx, effettivi.contoDestinazioneId);
  if (!contoDestinazione) {
    throw erroreNonTrovato('conto', effettivi.contoDestinazioneId);
  }
  validaTrasferimentoCompleto(
    effettivi,
    transferGroupId,
    contoOrigine,
    contoDestinazione,
  );

  const colonneOrigine: Record<string, string | number | null> = {};
  const colonneDestinazione: Record<string, string | number | null> = {};
  if (dati.data !== undefined) {
    colonneOrigine.date = effettivi.data;
    colonneDestinazione.date = effettivi.data;
  }
  if (dati.amountCents !== undefined) {
    colonneOrigine.amount_cents = -effettivi.amountCents;
    colonneDestinazione.amount_cents = effettivi.amountCents;
  }
  if (dati.contoOrigineId !== undefined) {
    colonneOrigine.account_id = effettivi.contoOrigineId;
  }
  if (dati.contoDestinazioneId !== undefined) {
    colonneDestinazione.account_id = effettivi.contoDestinazioneId;
  }
  if (dati.descrizione !== undefined) {
    const descriptionNorm = normalizzaTesto(effettivi.descrizione);
    colonneOrigine.description = effettivi.descrizione;
    colonneOrigine.description_norm = descriptionNorm;
    colonneDestinazione.description = effettivi.descrizione;
    colonneDestinazione.description_norm = descriptionNorm;
  }

  const scrivi = ctx.db.transaction(() => {
    if (Object.keys(colonneOrigine).length > 0) {
      aggiornaRiga(
        ctx,
        'transactions',
        'transactions',
        origine.id,
        colonneOrigine,
        origine.revision,
      );
    }
    if (Object.keys(colonneDestinazione).length > 0) {
      aggiornaRiga(
        ctx,
        'transactions',
        'transactions',
        destinazione.id,
        colonneDestinazione,
        destinazione.revision,
      );
    }
  });
  scrivi();

  const trasferimento = ottieniTrasferimento(ctx, transferGroupId);
  if (!trasferimento) {
    throw erroreNonTrovato('trasferimento', transferGroupId);
  }
  return trasferimento;
}

export function eliminaTrasferimento(
  ctx: ContestoScrittura,
  transferGroupId: string,
): void {
  const righe = leggiRigheGruppo(ctx, transferGroupId);
  const trasferimento = costruisciTrasferimento(transferGroupId, righe);
  if (!trasferimento) {
    throw erroreNonTrovato('trasferimento', transferGroupId);
  }
  const origine = righe.find((riga) => riga.amount_cents < 0)!;
  const destinazione = righe.find((riga) => riga.amount_cents > 0)!;
  const scrivi = ctx.db.transaction(() => {
    cancella(ctx, 'transactions', 'transactions', origine.id, origine.revision);
    cancella(
      ctx,
      'transactions',
      'transactions',
      destinazione.id,
      destinazione.revision,
    );
  });
  scrivi();
}
