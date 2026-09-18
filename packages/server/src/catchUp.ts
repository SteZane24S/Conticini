import {
  aggiungiGiorni,
  confrontaDate,
  everyNMonths,
  monthly,
  NAMESPACE_CONTICINI,
  normalizzaTesto,
  occorrenzeTra,
  type DataISO,
  type RegolaRicorrenza,
  uuidv5,
  yearly,
} from '@conticini/dominio';

import { inserisci, SOLO_ATTIVI, type ContestoScrittura } from './scrittura.js';

interface RigaSpesaFissa {
  id: string;
  name: string;
  rule_type: 'monthly' | 'every_n_months' | 'yearly';
  interval: number | null;
  anchor_day: number;
  anchor_month: number | null;
  start_date: string;
  end_date: string | null;
  amount_cents: number;
  account_id: string;
  category_id: string;
  mode: 'auto' | 'manual';
}

function ricostruisciRegola(riga: RigaSpesaFissa): RegolaRicorrenza {
  const startDate = riga.start_date as DataISO;
  const endDate =
    riga.end_date === null ? undefined : (riga.end_date as DataISO);

  switch (riga.rule_type) {
    case 'monthly':
      return monthly(riga.anchor_day, startDate, endDate);
    case 'every_n_months':
      return everyNMonths(
        riga.interval!,
        riga.anchor_month!,
        riga.anchor_day,
        startDate,
        endDate,
      );
    case 'yearly':
      return yearly(riga.anchor_month!, riga.anchor_day, startDate, endDate);
  }
}

export function eseguiCatchUp(
  ctx: ContestoScrittura,
  oggi: DataISO,
  orizzonteGiorni = 400,
): void {
  const orizzonte = aggiungiGiorni(oggi, orizzonteGiorni);
  const scrivi = ctx.db.transaction(() => {
    const speseFisse = ctx.db
      .prepare(
        `SELECT * FROM recurring_expenses WHERE active = 1 AND ${SOLO_ATTIVI}`,
      )
      .all() as RigaSpesaFissa[];

    for (const spesaFissa of speseFisse) {
      const regola = ricostruisciRegola(spesaFissa);
      const occorrenze = occorrenzeTra(regola, regola.startDate, orizzonte);

      for (const { periodo, scadenza } of occorrenze) {
        const occorrenzaId = uuidv5(
          spesaFissa.id + periodo,
          NAMESPACE_CONTICINI,
        );
        const esistente = ctx.db
          .prepare('SELECT 1 FROM recurring_occurrences WHERE id = ?')
          .get(occorrenzaId);
        if (esistente) {
          continue;
        }

        if (spesaFissa.mode === 'auto' && confrontaDate(scadenza, oggi) <= 0) {
          const movimentoId = uuidv5(occorrenzaId, NAMESPACE_CONTICINI);
          inserisci(ctx, 'transactions', 'transactions', movimentoId, {
            date: scadenza,
            amount_cents: -spesaFissa.amount_cents,
            account_id: spesaFissa.account_id,
            category_id: spesaFissa.category_id,
            description: spesaFissa.name,
            description_norm: normalizzaTesto(spesaFissa.name),
            transfer_group_id: null,
          });
          inserisci(
            ctx,
            'recurring_occurrences',
            'recurring_occurrences',
            occorrenzaId,
            {
              recurring_id: spesaFissa.id,
              period: periodo,
              due_date: scadenza,
              amount_cents: spesaFissa.amount_cents,
              account_id: spesaFissa.account_id,
              category_id: spesaFissa.category_id,
              mode: 'auto',
              status: 'paid',
              transaction_id: movimentoId,
            },
          );
          continue;
        }

        inserisci(
          ctx,
          'recurring_occurrences',
          'recurring_occurrences',
          occorrenzaId,
          {
            recurring_id: spesaFissa.id,
            period: periodo,
            due_date: scadenza,
            amount_cents: spesaFissa.amount_cents,
            account_id: spesaFissa.account_id,
            category_id: spesaFissa.category_id,
            mode: spesaFissa.mode,
            status: 'pending',
            transaction_id: null,
          },
        );
      }
    }
  });
  scrivi();
}
