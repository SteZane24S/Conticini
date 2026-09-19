import { describe, expect, it } from 'vitest';

import {
  intervalloCiclo,
  previstoSpesoPerCiclo,
  saldoGiornaliero,
  speseSettoreCategoria,
  type IntervalloDate,
} from './aggregazioni.js';
import { type Ciclo } from './cicli.js';
import { parseDataISO, type DataISO } from './date.js';
import { type CategoriaConDettagli } from './repository.js';
import { saldoA, type Conto, type Movimento } from './saldi.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

function movimento(
  id: string,
  dataMovimento: string,
  amountCents: number,
  categoriaId: string | null,
  transferGroupId: string | null = null,
): Movimento {
  return {
    id,
    data: data(dataMovimento),
    amountCents,
    contoId: 'conto',
    categoriaId,
    transferGroupId,
  };
}

const categorie: CategoriaConDettagli[] = [
  { id: 'c1', kind: 'uscita', nome: 'Casa', settoreId: 's1' },
  { id: 'c2', kind: 'uscita', nome: 'Spesa', settoreId: 's1' },
  { id: 'c3', kind: 'uscita', nome: 'Auto', settoreId: 's2' },
];

describe('aggregazioni', () => {
  it('calcola lintervallo ordinando i cicli e lascia aperto lultimo', () => {
    const cicli: Ciclo[] = [
      {
        id: 'c2',
        startDate: data('2024-02-01'),
        expectedNextDate: null,
        expectedAmountCents: null,
      },
      {
        id: 'c1',
        startDate: data('2024-01-01'),
        expectedNextDate: null,
        expectedAmountCents: null,
      },
      {
        id: 'c3',
        startDate: data('2024-03-01'),
        expectedNextDate: null,
        expectedAmountCents: null,
      },
    ];

    expect(intervalloCiclo('c2', cicli)).toEqual({
      dataInizio: data('2024-02-01'),
      dataFineEsclusiva: data('2024-03-01'),
    });
    expect(intervalloCiclo('c3', cicli).dataFineEsclusiva).toBeNull();
    expect(() => intervalloCiclo('assente', cicli)).toThrow(
      'ciclo non trovato: assente',
    );
  });

  it('aggrega le sole uscite categorizzate non trasferimento nellintervallo', () => {
    const intervallo: IntervalloDate = {
      dataInizio: data('2024-01-01'),
      dataFineEsclusiva: data('2024-02-01'),
    };
    const risultato = speseSettoreCategoria(
      [
        movimento('inizio', '2024-01-01', -100, 'c1'),
        movimento('c2', '2024-01-15', -200, 'c2'),
        movimento('trasferimento', '2024-01-15', -500, 'c1', 't1'),
        movimento('senza-categoria', '2024-01-15', -500, null),
        movimento('entrata', '2024-01-15', 500, 'c1'),
        movimento('fine', '2024-02-01', -500, 'c1'),
      ],
      categorie,
      intervallo,
    );

    expect(risultato).toEqual([
      {
        settoreId: 's1',
        speseCents: 300,
        categorie: [
          { categoriaId: 'c1', speseCents: 100 },
          { categoriaId: 'c2', speseCents: 200 },
        ],
      },
    ]);
  });

  it('non applica un limite superiore quando lintervallo e aperto', () => {
    expect(
      speseSettoreCategoria(
        [movimento('futura', '2099-01-01', -100, 'c1')],
        categorie,
        { dataInizio: data('2024-01-01'), dataFineEsclusiva: null },
      ),
    ).toEqual([
      {
        settoreId: 's1',
        speseCents: 100,
        categorie: [{ categoriaId: 'c1', speseCents: 100 }],
      },
    ]);
  });

  it('produce un saldo per ogni giorno dellintervallo chiuso', () => {
    const conti: Conto[] = [
      {
        id: 'conto',
        saldoInizialeCents: 1_000,
        dataApertura: data('2024-01-01'),
      },
    ];
    const movimenti = [movimento('spesa', '2024-01-02', -200, 'c1')];
    const risultato = saldoGiornaliero(
      data('2024-01-01'),
      data('2024-01-03'),
      conti,
      movimenti,
    );

    expect(risultato).toHaveLength(3);
    expect(risultato.map((punto) => punto.saldoCents)).toEqual([
      saldoA(data('2024-01-01'), conti, movimenti),
      saldoA(data('2024-01-02'), conti, movimenti),
      saldoA(data('2024-01-03'), conti, movimenti),
    ]);
    expect(() =>
      saldoGiornaliero(
        data('2024-01-03'),
        data('2024-01-01'),
        conti,
        movimenti,
      ),
    ).toThrow('intervallo non valido: dataFine precede dataInizio');
  });

  it('calcola previsto e speso con override, default e categorie senza spese', () => {
    const risultato = previstoSpesoPerCiclo(
      'c1',
      [
        {
          id: 'c2',
          startDate: data('2024-02-01'),
          expectedNextDate: null,
          expectedAmountCents: null,
        },
        {
          id: 'c1',
          startDate: data('2024-01-01'),
          expectedNextDate: null,
          expectedAmountCents: null,
        },
      ],
      [
        { categoriaId: 'c1', amountCents: 1_000 },
        { categoriaId: 'c2', amountCents: 2_000 },
      ],
      [{ cicloId: 'c1', categoriaId: 'c1', amountCents: 1_500 }],
      [movimento('spesa', '2024-01-15', -300, 'c1')],
      categorie,
    );

    expect(risultato).toEqual({
      cicloId: 'c1',
      previstoTotaleCents: 3_500,
      speseTotaleCents: 300,
      categorie: [
        { categoriaId: 'c1', previstoCents: 1_500, speseCents: 300 },
        { categoriaId: 'c2', previstoCents: 2_000, speseCents: 0 },
      ],
    });
  });
});
