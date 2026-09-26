import { describe, expect, it } from 'vitest';

import { parseDataISO, type DataISO } from './date.js';
import {
  calcolaAncora,
  saldiPerConto,
  saldiSegnati,
  scartoA,
  totaleA,
  totaleSenzaAncore,
  type AncoraTotale,
  type Conto,
  type LetturaConto,
  type Movimento,
} from './saldi.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

function movimento(
  id: string,
  dataMovimento: string,
  amountCents: number,
  contoId: string | null = null,
): Movimento {
  return {
    id,
    data: data(dataMovimento),
    amountCents,
    contoId,
    categoriaId: null,
    transferGroupId: null,
    posizioneId: null,
  };
}

describe('saldiPerConto', () => {
  it('esclude il conto non ancora aperto alla data richiesta', () => {
    const conti: Conto[] = [
      {
        id: 'conto-futuro',
        saldoInizialeCents: 10_000,
        dataApertura: data('2024-01-11'),
      },
    ];

    expect(saldiPerConto(data('2024-01-10'), conti, [])).toEqual([]);
  });

  it('include il conto aperto esattamente alla data richiesta', () => {
    const conti: Conto[] = [
      {
        id: 'conto-aperto',
        saldoInizialeCents: 10_000,
        dataApertura: data('2024-01-10'),
      },
    ];

    expect(saldiPerConto(data('2024-01-10'), conti, [])).toEqual([
      { contoId: 'conto-aperto', saldoCents: 10_000 },
    ]);
  });
});

describe('saldi segnati e totale', () => {
  const conti: Conto[] = [
    {
      id: 'banca',
      saldoInizialeCents: 100_000,
      dataApertura: data('2026-09-01'),
    },
    {
      id: 'contanti',
      saldoInizialeCents: 10_000,
      dataApertura: data('2026-09-01'),
    },
  ];

  it('calcola l’esempio della rettifica', () => {
    const oggi = data('2026-09-20');
    const movimenti = [
      movimento('spesa-1', '2026-09-10', -10_000),
      movimento('spesa-2', '2026-09-10', -5_000),
    ];
    const lettureBanca: LetturaConto[] = [
      {
        id: 'lettura-banca',
        contoId: 'banca',
        data: data('2026-09-15'),
        saldoCents: 88_000,
      },
    ];
    const letture: LetturaConto[] = [
      ...lettureBanca,
      {
        id: 'lettura-contanti',
        contoId: 'contanti',
        data: data('2026-09-16'),
        saldoCents: 7_000,
      },
    ];

    expect(totaleSenzaAncore(oggi, conti, movimenti)).toBe(95_000);
    expect(scartoA(oggi, conti, movimenti, [], [])).toBe(15_000);
    expect(scartoA(oggi, conti, movimenti, lettureBanca, [])).toBe(3_000);
    expect(scartoA(oggi, conti, movimenti, letture, [])).toBe(0);
  });

  it('non sposta il totale per una spesa ritrovata prima dell’àncora', () => {
    const t = data('2026-09-10');
    const letture: LetturaConto[] = [
      { id: 'lettura', contoId: 'banca', data: t, saldoCents: 97_000 },
    ];
    const ancora = calcolaAncora(t, [conti[0]!], [], letture);
    const movimentiTardivi = [movimento('pizza', '2026-09-09', -3_000)];

    expect(scartoA(t, [conti[0]!], [], letture, [])).toBe(-3_000);
    expect(ancora.totaleCents).toBe(97_000);
    expect(totaleA(t, [conti[0]!], [], [{ id: 'ancora', ...ancora }])).toBe(
      97_000,
    );
    expect(
      totaleA(t, [conti[0]!], movimentiTardivi, [{ id: 'ancora', ...ancora }]),
    ).toBe(97_000);
    expect(
      totaleA(data('2026-09-15'), [conti[0]!], movimentiTardivi, [
        { id: 'ancora', ...ancora },
      ]),
    ).toBe(97_000);
  });

  it('conta il pranzo creato dopo l’allineamento nella data dell’àncora', () => {
    const t = data('2026-09-10');
    const esistente = [movimento('gia-esistente', '2026-09-10', -2_000)];
    const letture: LetturaConto[] = [
      { id: 'lettura', contoId: 'banca', data: t, saldoCents: 98_000 },
    ];
    const ancora = calcolaAncora(t, [conti[0]!], esistente, letture);

    expect(
      totaleA(
        t,
        [conti[0]!],
        [...esistente, movimento('pranzo', '2026-09-10', -1_500)],
        [{ id: 'ancora', ...ancora }],
      ),
    ).toBe(96_500);
  });

  it('usa il totale senza àncore prima della prima àncora', () => {
    const ancore: AncoraTotale[] = [
      {
        id: 'ancora',
        data: data('2026-09-10'),
        totaleCents: 50_000,
        movimentiCoperti: [],
      },
    ];
    const movimenti = [movimento('spesa', '2026-09-05', -1_000)];

    expect(totaleA(data('2026-09-06'), conti, movimenti, ancore)).toBe(
      totaleSenzaAncore(data('2026-09-06'), conti, movimenti),
    );
  });

  it('mantiene scarto zero senza letture e àncore, anche con trasferimenti storici', () => {
    const contiStorici: Conto[] = [
      { id: 'a', saldoInizialeCents: 50_000, dataApertura: data('2026-09-01') },
      { id: 'b', saldoInizialeCents: 20_000, dataApertura: data('2026-09-10') },
    ];
    const movimenti = [
      movimento('spesa-a', '2026-09-05', -5_000, 'a'),
      {
        ...movimento('trasferimento-a', '2026-09-12', -10_000, 'a'),
        transferGroupId: 't',
      },
      {
        ...movimento('trasferimento-b', '2026-09-12', 10_000, 'b'),
        transferGroupId: 't',
      },
    ];

    for (const giorno of ['2026-09-05', '2026-09-10', '2026-09-15']) {
      const d = data(giorno);
      expect(scartoA(d, contiStorici, movimenti, [], [])).toBe(0);
      expect(totaleA(d, contiStorici, movimenti, [])).toBe(
        saldiPerConto(d, contiStorici, movimenti).reduce(
          (totale, saldo) => totale + saldo.saldoCents,
          0,
        ),
      );
      expect(saldiSegnati(d, contiStorici, movimenti, [])).toEqual(
        saldiPerConto(d, contiStorici, movimenti).map((saldo) => ({
          ...saldo,
          origine: 'storico',
          dataLettura: null,
        })),
      );
    }
  });

  it('sceglie l’ultima delle due àncore applicabili', () => {
    const ancore: AncoraTotale[] = [
      {
        id: 'prima',
        data: data('2026-09-10'),
        totaleCents: 80_000,
        movimentiCoperti: [],
      },
      {
        id: 'seconda',
        data: data('2026-09-20'),
        totaleCents: 60_000,
        movimentiCoperti: [],
      },
    ];
    const movimenti = [
      movimento('dopo-prima', '2026-09-15', -1_000),
      movimento('dopo-seconda', '2026-09-25', -2_000),
    ];

    expect(totaleA(data('2026-09-15'), conti, movimenti, ancore)).toBe(79_000);
    expect(totaleA(data('2026-09-25'), conti, movimenti, ancore)).toBe(58_000);
  });

  it('aggiunge il saldo iniziale del conto aperto dopo l’àncora', () => {
    const ancore: AncoraTotale[] = [
      {
        id: 'ancora',
        data: data('2026-09-10'),
        totaleCents: 50_000,
        movimentiCoperti: [],
      },
    ];
    const contoNuovo: Conto = {
      id: 'nuovo',
      saldoInizialeCents: 20_000,
      dataApertura: data('2026-09-15'),
    };

    expect(
      totaleA(data('2026-09-14'), [conti[0]!, contoNuovo], [], ancore),
    ).toBe(50_000);
    expect(
      totaleA(data('2026-09-15'), [conti[0]!, contoNuovo], [], ancore),
    ).toBe(70_000);
  });

  it('ignora i movimenti senza conto nei saldi per conto ma li include nel totale', () => {
    const movimenti = [movimento('senza-conto', '2026-09-10', -1_000)];

    expect(saldiPerConto(data('2026-09-10'), conti, movimenti)).toEqual([
      { contoId: 'banca', saldoCents: 100_000 },
      { contoId: 'contanti', saldoCents: 10_000 },
    ]);
    expect(totaleSenzaAncore(data('2026-09-10'), conti, movimenti)).toBe(
      109_000,
    );
  });

  it('sceglie l’ultima lettura non futura e ne espone la data', () => {
    const letture: LetturaConto[] = [
      {
        id: 'prima',
        contoId: 'banca',
        data: data('2026-09-10'),
        saldoCents: 90_000,
      },
      {
        id: 'seconda',
        contoId: 'banca',
        data: data('2026-09-20'),
        saldoCents: 80_000,
      },
      {
        id: 'pari-data-piu-tardi',
        contoId: 'banca',
        data: data('2026-09-20'),
        saldoCents: 70_000,
      },
    ];

    expect(saldiSegnati(data('2026-09-15'), conti, [], letture)[0]).toEqual({
      contoId: 'banca',
      saldoCents: 90_000,
      origine: 'lettura',
      dataLettura: data('2026-09-10'),
    });
    expect(saldiSegnati(data('2026-09-20'), conti, [], letture)[0]).toEqual({
      contoId: 'banca',
      saldoCents: 70_000,
      origine: 'lettura',
      dataLettura: data('2026-09-20'),
    });
    expect(saldiSegnati(data('2026-09-05'), conti, [], letture)[0]).toEqual({
      contoId: 'banca',
      saldoCents: 100_000,
      origine: 'storico',
      dataLettura: null,
    });
  });
});
