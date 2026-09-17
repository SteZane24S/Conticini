import { describe, expect, it } from 'vitest';

import { parseDataISO } from './date.js';
import {
  categoriaDaRegole,
  suggerimentiDescrizione,
  suggerisciCategoria,
  type RegolaCategoria,
  type VoceStorico,
} from './regole.js';

describe('categoriaDaRegole', () => {
  it('restituisce null quando nessuna regola corrisponde', () => {
    expect(
      categoriaDaRegole('spesa al supermercato', [
        {
          id: 'r1',
          pattern: 'affitto',
          categoriaId: 'casa',
          priority: 1,
          active: true,
          deletedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ).toBeNull();
  });

  it('restituisce la categoria di una regola attiva contenuta nella descrizione', () => {
    expect(
      categoriaDaRegole('spesa al supermercato', [
        {
          id: 'r1',
          pattern: 'supermercato',
          categoriaId: 'spesa',
          priority: 1,
          active: true,
          deletedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ).toBe('spesa');
  });

  it('esclude una regola inattiva', () => {
    expect(
      categoriaDaRegole('spesa al supermercato', [
        {
          id: 'r1',
          pattern: 'supermercato',
          categoriaId: 'spesa',
          priority: 1,
          active: false,
          deletedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ).toBeNull();
  });

  it('esclude una regola eliminata', () => {
    expect(
      categoriaDaRegole('spesa al supermercato', [
        {
          id: 'r1',
          pattern: 'supermercato',
          categoriaId: 'spesa',
          priority: 1,
          active: true,
          deletedAt: '2026-02-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ).toBeNull();
  });

  it('preferisce la regola con priorita piu alta', () => {
    const regole: RegolaCategoria[] = [
      {
        id: 'r1',
        pattern: 'bar',
        categoriaId: 'tempo-libero',
        priority: 1,
        active: true,
        deletedAt: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'r2',
        pattern: 'bar',
        categoriaId: 'ristorazione',
        priority: 2,
        active: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(categoriaDaRegole('colazione al bar', regole)).toBe('ristorazione');
  });

  it('a parita di priorita preferisce il pattern piu lungo', () => {
    const regole: RegolaCategoria[] = [
      {
        id: 'r1',
        pattern: 'bar',
        categoriaId: 'tempo-libero',
        priority: 1,
        active: true,
        deletedAt: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'r2',
        pattern: 'bar del centro',
        categoriaId: 'ristorazione',
        priority: 1,
        active: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(categoriaDaRegole('colazione al bar del centro', regole)).toBe(
      'ristorazione',
    );
  });

  it('a parita di priorita e lunghezza preferisce la regola piu recente', () => {
    const regole: RegolaCategoria[] = [
      {
        id: 'r1',
        pattern: 'bar',
        categoriaId: 'tempo-libero',
        priority: 1,
        active: true,
        deletedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'r2',
        pattern: 'bar',
        categoriaId: 'ristorazione',
        priority: 1,
        active: true,
        deletedAt: null,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    expect(categoriaDaRegole('colazione al bar', regole)).toBe('ristorazione');
  });

  it('confronta senza distinzione tra maiuscole e accenti', () => {
    expect(
      categoriaDaRegole('Bar Città', [
        {
          id: 'r1',
          pattern: 'bar citta',
          categoriaId: 'ristorazione',
          priority: 1,
          active: true,
          deletedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    ).toBe('ristorazione');
  });
});

describe('suggerimentiDescrizione', () => {
  it('raggruppa le descrizioni normalizzate e conta la frequenza', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'spesa casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1200,
        data: parseDataISO('2026-01-02'),
      },
      {
        descrizione: 'Spesa Auto',
        descrizioneNorm: 'spesa auto',
        categoriaId: 'auto',
        amountCents: -2000,
        data: parseDataISO('2026-01-03'),
      },
    ];

    expect(suggerimentiDescrizione('spesa', storico, 3)).toEqual([
      {
        descrizione: 'spesa casa',
        categoriaId: 'casa',
        amountCentsRecente: -1200,
      },
      {
        descrizione: 'Spesa Auto',
        categoriaId: 'auto',
        amountCentsRecente: -2000,
      },
    ]);
  });

  it('a parita di frequenza preferisce il gruppo con voce piu recente', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'Spesa Auto',
        descrizioneNorm: 'spesa auto',
        categoriaId: 'auto',
        amountCents: -2000,
        data: parseDataISO('2026-02-01'),
      },
    ];

    expect(
      suggerimentiDescrizione('spesa', storico, 2).map(
        (voce) => voce.descrizione,
      ),
    ).toEqual(['Spesa Auto', 'Spesa Casa']);
  });

  it('sceglie la categoria piu frequente nel gruppo', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'spesa casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1200,
        data: parseDataISO('2026-01-02'),
      },
      {
        descrizione: 'SPESA CASA',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'altro',
        amountCents: -1300,
        data: parseDataISO('2026-01-03'),
      },
    ];

    expect(suggerimentiDescrizione('spesa casa', storico, 1)[0]).toEqual({
      descrizione: 'SPESA CASA',
      categoriaId: 'casa',
      amountCentsRecente: -1300,
    });
  });

  it('a parita di frequenza di categoria preferisce quella della voce piu recente', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'spesa casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'altro',
        amountCents: -1200,
        data: parseDataISO('2026-02-01'),
      },
    ];

    expect(
      suggerimentiDescrizione('spesa casa', storico, 1)[0]?.categoriaId,
    ).toBe('altro');
  });

  it('rispetta il limite e mantiene i migliori gruppi', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa A',
        descrizioneNorm: 'spesa a',
        categoriaId: 'a',
        amountCents: -100,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'Spesa A',
        descrizioneNorm: 'spesa a',
        categoriaId: 'a',
        amountCents: -101,
        data: parseDataISO('2026-01-02'),
      },
      {
        descrizione: 'Spesa B',
        descrizioneNorm: 'spesa b',
        categoriaId: 'b',
        amountCents: -200,
        data: parseDataISO('2026-02-01'),
      },
      {
        descrizione: 'Spesa C',
        descrizioneNorm: 'spesa c',
        categoriaId: 'c',
        amountCents: -300,
        data: parseDataISO('2026-03-01'),
      },
      {
        descrizione: 'Spesa D',
        descrizioneNorm: 'spesa d',
        categoriaId: 'd',
        amountCents: -400,
        data: parseDataISO('2026-04-01'),
      },
      {
        descrizione: 'Spesa E',
        descrizioneNorm: 'spesa e',
        categoriaId: 'e',
        amountCents: -500,
        data: parseDataISO('2026-05-01'),
      },
    ];

    expect(
      suggerimentiDescrizione('spesa', storico, 2).map(
        (voce) => voce.descrizione,
      ),
    ).toEqual(['Spesa A', 'Spesa E']);
  });

  it('restituisce nessun risultato per un limite non positivo', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'Spesa Auto',
        descrizioneNorm: 'spesa auto',
        categoriaId: 'auto',
        amountCents: -2000,
        data: parseDataISO('2026-01-02'),
      },
    ];

    expect(suggerimentiDescrizione('spesa', storico, 0)).toEqual([]);
    expect(suggerimentiDescrizione('spesa', storico, -1)).toEqual([]);
  });

  it('normalizza il prefisso ignorando maiuscole e accenti', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Bar Città',
        descrizioneNorm: 'bar citta',
        categoriaId: 'bar',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
    ];

    expect(suggerimentiDescrizione('  BAR CITTÀ ', storico, 1)).toEqual([
      {
        descrizione: 'Bar Città',
        categoriaId: 'bar',
        amountCentsRecente: -1000,
      },
    ]);
  });

  it('esclude le voci che non iniziano col prefisso normalizzato', () => {
    const storico: VoceStorico[] = [
      {
        descrizione: 'Spesa Casa',
        descrizioneNorm: 'spesa casa',
        categoriaId: 'casa',
        amountCents: -1000,
        data: parseDataISO('2026-01-01'),
      },
      {
        descrizione: 'Casa Spesa',
        descrizioneNorm: 'casa spesa',
        categoriaId: 'casa',
        amountCents: -1200,
        data: parseDataISO('2026-01-02'),
      },
    ];

    expect(suggerimentiDescrizione('spesa', storico, 2)).toHaveLength(1);
    expect(suggerimentiDescrizione('spesa', storico, 2)[0]?.descrizione).toBe(
      'Spesa Casa',
    );
  });
});

describe('suggerisciCategoria', () => {
  it('preferisce la categoria della regola a quella dello storico', () => {
    expect(
      suggerisciCategoria(
        'Pagamento palestra',
        [
          {
            id: 'r1',
            pattern: 'palestra',
            categoriaId: 'salute',
            priority: 1,
            active: true,
            deletedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        [
          {
            descrizione: 'pagamento palestra',
            descrizioneNorm: 'pagamento palestra',
            categoriaId: 'sport',
            amountCents: -3000,
            data: parseDataISO('2026-01-01'),
          },
        ],
      ),
    ).toBe('salute');
  });

  it('usa la categoria piu frequente dello storico per descrizione identica', () => {
    expect(
      suggerisciCategoria(
        '  CAFFÈ  AL BAR ',
        [],
        [
          {
            descrizione: 'caffe al bar',
            descrizioneNorm: 'caffe al bar',
            categoriaId: 'bar',
            amountCents: -1000,
            data: parseDataISO('2026-01-01'),
          },
          {
            descrizione: 'Caffè al bar',
            descrizioneNorm: 'caffe al bar',
            categoriaId: 'bar',
            amountCents: -1200,
            data: parseDataISO('2026-01-02'),
          },
          {
            descrizione: 'caffe al bar',
            descrizioneNorm: 'caffe al bar',
            categoriaId: 'altro',
            amountCents: -1300,
            data: parseDataISO('2026-01-03'),
          },
        ],
      ),
    ).toBe('bar');
  });

  it('restituisce null senza regola o voce di storico corrispondente', () => {
    expect(
      suggerisciCategoria(
        'Descrizione assente',
        [],
        [
          {
            descrizione: 'Altra descrizione',
            descrizioneNorm: 'altra descrizione',
            categoriaId: 'altro',
            amountCents: -1000,
            data: parseDataISO('2026-01-01'),
          },
        ],
      ),
    ).toBeNull();
  });
});
