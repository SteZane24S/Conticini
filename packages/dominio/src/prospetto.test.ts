import { describe, expect, it } from 'vitest';

import { type Ciclo } from './cicli.js';
import { parseDataISO, type DataISO } from './date.js';
import {
  prospetto,
  type DatiProspetto,
  type OccorrenzaFissa,
} from './prospetto.js';
import { saldoA, type Conto, type Movimento } from './saldi.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

function conto(
  id: string,
  saldoInizialeCents: number,
  dataApertura = '2024-01-01',
): Conto {
  return { id, saldoInizialeCents, dataApertura: data(dataApertura) };
}

function occorrenza(
  id: string,
  scadenza: string,
  stato: OccorrenzaFissa['stato'],
  movimentoCollegato: OccorrenzaFissa['movimentoCollegato'],
  amountCentsPrevisto = 5_000,
): OccorrenzaFissa {
  return {
    id,
    scadenza: data(scadenza),
    amountCentsPrevisto,
    categoriaId: null,
    contoId: 'a',
    stato,
    movimentoCollegato,
  };
}

function dati(
  conti: Conto[],
  cicli: Ciclo[],
  movimenti: Movimento[] = [],
  occorrenzeFisse: OccorrenzaFissa[] = [],
): DatiProspetto {
  return {
    conti,
    movimenti,
    cicli,
    occorrenzeFisse,
    budgetDefaults: [],
    budgetOverrides: [],
  };
}

describe('prospetto', () => {
  it('1. un trasferimento non cambia il saldo totale', () => {
    const conti = [conto('a', 0), conto('b', 0)];
    const movimenti: Movimento[] = [
      {
        id: 'trasferimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'trasferimento-b',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'b',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(saldoA(data('2024-01-10'), conti, movimenti)).toBe(0);
  });

  it('2. pagare una fissa allimporto e alla data previsti non cambia saldoPrevistoCents', () => {
    const conti = [conto('a', 100_000)];
    const cicli: Ciclo[] = [
      {
        id: 'ciclo1',
        startDate: data('2024-01-01'),
        expectedNextDate: data('2024-02-01'),
        expectedAmountCents: null,
      },
    ];
    const nonPagata = dati(
      conti,
      cicli,
      [],
      [occorrenza('fissa1', '2024-01-15', 'pending', null)],
    );
    const pagata = dati(
      conti,
      cicli,
      [
        {
          id: 'pagamento-fissa1',
          data: data('2024-01-15'),
          amountCents: -5_000,
          contoId: 'a',
          categoriaId: null,
          transferGroupId: null,
          posizioneId: null,
        },
      ],
      [
        occorrenza('fissa1', '2024-01-15', 'paid', {
          data: data('2024-01-15'),
        }),
      ],
    );

    expect(
      prospetto(data('2024-01-20'), data('2024-01-20'), nonPagata)
        .saldoPrevistoCents,
    ).toBe(95_000);
    expect(
      prospetto(data('2024-01-20'), data('2024-01-20'), pagata)
        .saldoPrevistoCents,
    ).toBe(95_000);
  });

  it('3. una fissa pagata dopo D resta un impegno nel prospetto a D', () => {
    const risultato = prospetto(
      data('2024-01-20'),
      data('2024-01-20'),
      dati(
        [conto('a', 100_000)],
        [
          {
            id: 'ciclo1',
            startDate: data('2024-01-01'),
            expectedNextDate: data('2024-02-01'),
            expectedAmountCents: null,
          },
        ],
        [],
        [
          occorrenza('fissa1', '2024-01-15', 'paid', {
            data: data('2024-01-25'),
          }),
        ],
      ),
    );

    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).toContain(
      'fissa1',
    );
  });

  it('4. una manuale scaduta non confermata conta e una saltata no', () => {
    const risultato = prospetto(
      data('2024-01-20'),
      data('2024-01-20'),
      dati(
        [conto('a', 100_000)],
        [
          {
            id: 'ciclo1',
            startDate: data('2024-01-01'),
            expectedNextDate: data('2024-02-01'),
            expectedAmountCents: null,
          },
        ],
        [],
        [
          occorrenza('manuale', '2024-01-10', 'pending', null),
          occorrenza('saltata', '2024-01-10', 'skipped', null),
        ],
      ),
    );

    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).toContain(
      'manuale',
    );
    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).not.toContain(
      'saltata',
    );
  });

  it('5. budget 100 speso 30 lascia residuo 70', () => {
    const scenario = dati(
      [conto('a', 0)],
      [
        {
          id: 'ciclo1',
          startDate: data('2024-01-01'),
          expectedNextDate: data('2024-02-01'),
          expectedAmountCents: null,
        },
      ],
      [
        {
          id: 'spesa',
          data: data('2024-01-10'),
          amountCents: -3_000,
          contoId: 'a',
          categoriaId: 'c1',
          transferGroupId: null,
          posizioneId: null,
        },
      ],
    );
    scenario.budgetDefaults = [{ categoriaId: 'c1', amountCents: 10_000 }];

    expect(
      prospetto(data('2024-01-20'), data('2024-01-20'), scenario).categorie,
    ).toEqual([
      {
        categoriaId: 'c1',
        previstoCents: 10_000,
        speseCents: 3_000,
        residuoCents: 7_000,
        sforamentoCents: 0,
      },
    ]);
  });

  it('5. budget 100 speso 130 lascia residuo 0 e sforamento 30', () => {
    const scenario = dati(
      [conto('a', 0)],
      [
        {
          id: 'ciclo1',
          startDate: data('2024-01-01'),
          expectedNextDate: data('2024-02-01'),
          expectedAmountCents: null,
        },
      ],
      [
        {
          id: 'spesa',
          data: data('2024-01-10'),
          amountCents: -13_000,
          contoId: 'a',
          categoriaId: 'c1',
          transferGroupId: null,
          posizioneId: null,
        },
      ],
    );
    scenario.budgetDefaults = [{ categoriaId: 'c1', amountCents: 10_000 }];

    expect(
      prospetto(data('2024-01-20'), data('2024-01-20'), scenario).categorie,
    ).toEqual([
      {
        categoriaId: 'c1',
        previstoCents: 10_000,
        speseCents: 13_000,
        residuoCents: 0,
        sforamentoCents: 3_000,
      },
    ]);
  });

  it('6a. E mancante restituisce orizzonte_mancante', () => {
    const risultato = prospetto(
      data('2024-01-20'),
      data('2024-01-20'),
      dati(
        [conto('a', 0)],
        [
          {
            id: 'ciclo1',
            startDate: data('2024-01-01'),
            expectedNextDate: null,
            expectedAmountCents: null,
          },
        ],
      ),
    );

    expect(risultato.saldoPrevistoCents).toBeNull();
    expect(risultato.motivoSaldoPrevistoAssente).toBe('orizzonte_mancante');
  });

  it('6b. E minore o uguale a D senza un nuovo stipendio restituisce orizzonte_superato', () => {
    const risultato = prospetto(
      data('2024-01-20'),
      data('2024-01-20'),
      dati(
        [conto('a', 0)],
        [
          {
            id: 'ciclo1',
            startDate: data('2024-01-01'),
            expectedNextDate: data('2024-01-15'),
            expectedAmountCents: null,
          },
        ],
      ),
    );

    expect(risultato.saldoPrevistoCents).toBeNull();
    expect(risultato.motivoSaldoPrevistoAssente).toBe('orizzonte_superato');
  });

  it('7. D prima del primo stipendio mantiene il saldo e lascia assenti le previsioni', () => {
    const risultato = prospetto(
      data('2024-01-05'),
      data('2024-01-05'),
      dati(
        [conto('a', 100_000)],
        [],
        [],
        [occorrenza('arretrata', '2024-01-03', 'pending', null)],
      ),
    );

    expect(risultato.saldoTotaleCents).toBe(100_000);
    expect(risultato.categorie).toEqual([]);
    expect(risultato.saldoPrevistoCents).toBeNull();
    expect(risultato.motivoSaldoPrevistoAssente).toBe('nessun_ciclo');
    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).toContain(
      'arretrata',
    );
  });

  it('8. unoccorrenza con scadenza esattamente E e esclusa', () => {
    const risultato = prospetto(
      data('2024-01-10'),
      data('2024-01-10'),
      dati(
        [conto('a', 0)],
        [
          {
            id: 'ciclo1',
            startDate: data('2024-01-01'),
            expectedNextDate: data('2024-02-01'),
            expectedAmountCents: null,
          },
        ],
        [],
        [occorrenza('a-e', '2024-02-01', 'pending', null)],
      ),
    );

    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).not.toContain(
      'a-e',
    );
  });

  it('9. calcola lesempio completo verificato a mano', () => {
    /*
     * saldo conto A = 200000 + 150000 - 20000 - 12000 - 25000 = 293000.
     * saldo conto B = 50000 + 20000 = 70000.
     * saldoTotaleCents = 293000 + 70000 = 363000.
     * categoria 'spesa-casa': speseCents = 12000 + 25000 = 37000; previstoCents = 30000; residuoCents = 0; sforamentoCents = 7000.
     * totaleFisseAncoraDaPagareCents = 60000 + 12000 = 72000 (fissa1 arretrata, fissa2 in (D,E): 2024-01-31 e dopo D=01-20 e prima di E=02-05).
     * totaleResiduiCents = 0.
     * saldoPrevistoCents = 363000 - 72000 - 0 = 291000.
     * dopoAccreditoCents = 291000 + 150000 = 441000.
     * dataFutura = false (D = 2024-01-20 non e dopo oggi = 2024-01-25).
     */
    const risultato = prospetto(data('2024-01-20'), data('2024-01-25'), {
      conti: [conto('a', 200_000), conto('b', 50_000)],
      movimenti: [
        {
          id: 'stipendio',
          data: data('2024-01-05'),
          amountCents: 150_000,
          contoId: 'a',
          categoriaId: null,
          transferGroupId: null,
          posizioneId: null,
        },
        {
          id: 'trasferimento-a',
          data: data('2024-01-10'),
          amountCents: -20_000,
          contoId: 'a',
          categoriaId: null,
          transferGroupId: 't1',
          posizioneId: null,
        },
        {
          id: 'trasferimento-b',
          data: data('2024-01-10'),
          amountCents: 20_000,
          contoId: 'b',
          categoriaId: null,
          transferGroupId: 't1',
          posizioneId: null,
        },
        {
          id: 'spesa-casa-1',
          data: data('2024-01-12'),
          amountCents: -12_000,
          contoId: 'a',
          categoriaId: 'spesa-casa',
          transferGroupId: null,
          posizioneId: null,
        },
        {
          id: 'spesa-casa-2',
          data: data('2024-01-18'),
          amountCents: -25_000,
          contoId: 'a',
          categoriaId: 'spesa-casa',
          transferGroupId: null,
          posizioneId: null,
        },
      ],
      cicli: [
        {
          id: 'ciclo1',
          startDate: data('2024-01-05'),
          expectedNextDate: data('2024-02-05'),
          expectedAmountCents: 150_000,
        },
      ],
      occorrenzeFisse: [
        occorrenza('fissa1', '2024-01-15', 'pending', null, 60_000),
        occorrenza('fissa2', '2024-01-31', 'pending', null, 12_000),
      ],
      budgetDefaults: [{ categoriaId: 'spesa-casa', amountCents: 30_000 }],
      budgetOverrides: [],
    });

    expect(risultato.saldiPerConto).toEqual([
      { contoId: 'a', saldoCents: 293_000 },
      { contoId: 'b', saldoCents: 70_000 },
    ]);
    expect(risultato.saldoTotaleCents).toBe(363_000);
    expect(risultato.categorie).toEqual([
      {
        categoriaId: 'spesa-casa',
        previstoCents: 30_000,
        speseCents: 37_000,
        residuoCents: 0,
        sforamentoCents: 7_000,
      },
    ]);
    expect(risultato.totaleFisseAncoraDaPagareCents).toBe(72_000);
    expect(risultato.fisseAncoraDaPagare.map(({ id }) => id)).toEqual([
      'fissa1',
      'fissa2',
    ]);
    expect(risultato.saldoPrevistoCents).toBe(291_000);
    expect(risultato.dopoAccreditoCents).toBe(441_000);
    expect(risultato.dataFutura).toBe(false);
  });
});
