import { describe, expect, it } from 'vitest';

import { parseDataISO, type DataISO } from './date.js';
import { type Conto, type Movimento } from './saldi.js';
import {
  validaDataApertura,
  validaAperturaDopoAncora,
  validaArchiviazioneConto,
  validaDataLettura,
  validaSegnoCategoria,
  validaTrasferimento,
  validaVincoloPrevisioneFissa,
  type Categoria,
} from './validazioni.js';

function data(value: string): DataISO {
  return parseDataISO(value);
}

describe('validaTrasferimento', () => {
  it('valida due movimenti opposti su conti diversi, nella stessa data e senza categoria', () => {
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

    expect(validaTrasferimento(movimenti)).toEqual({ valido: true });
  });

  it('rifiuta un trasferimento con un solo movimento', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'numero_movimenti',
    });
  });

  it('rifiuta un trasferimento con tre movimenti', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-b',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'b',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-c',
        data: data('2024-01-10'),
        amountCents: 0,
        contoId: 'c',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'numero_movimenti',
    });
  });

  it('rifiuta due movimenti sullo stesso conto', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-b',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'stesso_conto',
    });
  });

  it('rifiuta due movimenti con date diverse', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-b',
        data: data('2024-01-11'),
        amountCents: 5_000,
        contoId: 'b',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'date_diverse',
    });
  });

  it('rifiuta due movimenti con importi non opposti', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'a',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-b',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'b',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'importi_non_opposti',
    });
  });

  it('rifiuta due movimenti con categoria non nulla', () => {
    const movimenti: Movimento[] = [
      {
        id: 'movimento-a',
        data: data('2024-01-10'),
        amountCents: -5_000,
        contoId: 'a',
        categoriaId: 'categoria',
        transferGroupId: 't1',
        posizioneId: null,
      },
      {
        id: 'movimento-b',
        data: data('2024-01-10'),
        amountCents: 5_000,
        contoId: 'b',
        categoriaId: null,
        transferGroupId: 't1',
        posizioneId: null,
      },
    ];

    expect(validaTrasferimento(movimenti)).toEqual({
      valido: false,
      motivo: 'categoria_non_nulla',
    });
  });
});

describe('validaSegnoCategoria', () => {
  const movimentoEntrata: Movimento = {
    id: 'movimento',
    data: data('2024-01-10'),
    amountCents: 5_000,
    contoId: 'conto',
    categoriaId: 'categoria',
    transferGroupId: null,
    posizioneId: null,
  };
  const movimentoUscita: Movimento = {
    ...movimentoEntrata,
    amountCents: -5_000,
  };
  const categoriaEntrata: Categoria = { id: 'categoria', kind: 'entrata' };
  const categoriaUscita: Categoria = { id: 'categoria', kind: 'uscita' };

  it('valida una categoria entrata con importo positivo', () => {
    expect(validaSegnoCategoria(movimentoEntrata, categoriaEntrata)).toEqual({
      valido: true,
    });
  });

  it('rifiuta una categoria entrata con importo negativo', () => {
    expect(validaSegnoCategoria(movimentoUscita, categoriaEntrata)).toEqual({
      valido: false,
      motivo: 'segno_non_coerente',
    });
  });

  it('valida una categoria uscita con importo negativo', () => {
    expect(validaSegnoCategoria(movimentoUscita, categoriaUscita)).toEqual({
      valido: true,
    });
  });

  it('rifiuta una categoria uscita con importo positivo', () => {
    expect(validaSegnoCategoria(movimentoEntrata, categoriaUscita)).toEqual({
      valido: false,
      motivo: 'segno_non_coerente',
    });
  });
});

describe('validaDataApertura', () => {
  const conto: Conto = {
    id: 'conto',
    saldoInizialeCents: 0,
    dataApertura: data('2024-01-10'),
  };

  it('valida un movimento nella data di apertura del conto', () => {
    const movimento: Movimento = {
      id: 'movimento',
      data: data('2024-01-10'),
      amountCents: -5_000,
      contoId: 'conto',
      categoriaId: null,
      transferGroupId: null,
      posizioneId: null,
    };

    expect(validaDataApertura(movimento, conto)).toEqual({ valido: true });
  });

  it('rifiuta un movimento anteriore alla data di apertura del conto', () => {
    const movimento: Movimento = {
      id: 'movimento',
      data: data('2024-01-09'),
      amountCents: -5_000,
      contoId: 'conto',
      categoriaId: null,
      transferGroupId: null,
      posizioneId: null,
    };

    expect(validaDataApertura(movimento, conto)).toEqual({
      valido: false,
      motivo: 'movimento_anteriore_apertura',
    });
  });

  it('valida un movimento successivo alla data di apertura del conto', () => {
    const movimento: Movimento = {
      id: 'movimento',
      data: data('2024-01-11'),
      amountCents: -5_000,
      contoId: 'conto',
      categoriaId: null,
      transferGroupId: null,
      posizioneId: null,
    };

    expect(validaDataApertura(movimento, conto)).toEqual({ valido: true });
  });

  it('valida un movimento senza conto anteriore a qualunque apertura', () => {
    expect(
      validaDataApertura(
        {
          id: 'senza-conto',
          data: data('2024-01-01'),
          amountCents: -5_000,
          contoId: null,
          categoriaId: null,
          transferGroupId: null,
          posizioneId: null,
        },
        conto,
      ),
    ).toEqual({ valido: true });
  });
});

describe('validaAperturaDopoAncora', () => {
  const ancora = {
    id: 'ancora',
    data: data('2024-01-10'),
    totaleCents: 0,
    movimentiCoperti: [],
  };

  it('rifiuta l’apertura uguale o anteriore all’àncora e valida quella successiva', () => {
    expect(validaAperturaDopoAncora(data('2024-01-10'), ancora)).toEqual({
      valido: false,
      motivo: 'apertura_non_successiva_ancora',
    });
    expect(validaAperturaDopoAncora(data('2024-01-09'), ancora)).toEqual({
      valido: false,
      motivo: 'apertura_non_successiva_ancora',
    });
    expect(validaAperturaDopoAncora(data('2024-01-11'), ancora)).toEqual({
      valido: true,
    });
    expect(validaAperturaDopoAncora(data('2024-01-09'), null)).toEqual({
      valido: true,
    });
  });
});

describe('validaArchiviazioneConto', () => {
  it('valida soltanto il saldo segnato pari a zero', () => {
    expect(validaArchiviazioneConto(0)).toEqual({ valido: true });
    expect(validaArchiviazioneConto(-1)).toEqual({
      valido: false,
      motivo: 'saldo_segnato_non_zero',
    });
    expect(validaArchiviazioneConto(1)).toEqual({
      valido: false,
      motivo: 'saldo_segnato_non_zero',
    });
  });
});

describe('validaDataLettura', () => {
  const conto: Conto = {
    id: 'conto',
    saldoInizialeCents: 0,
    dataApertura: data('2024-01-10'),
  };
  const oggi = data('2024-01-20');

  it('valida la lettura di oggi e quella del giorno di apertura', () => {
    expect(validaDataLettura(oggi, oggi, conto)).toEqual({ valido: true });
    expect(validaDataLettura(data('2024-01-10'), oggi, conto)).toEqual({
      valido: true,
    });
  });

  it('rifiuta le letture future e anteriori all’apertura', () => {
    expect(validaDataLettura(data('2024-01-21'), oggi, conto)).toEqual({
      valido: false,
      motivo: 'lettura_futura',
    });
    expect(validaDataLettura(data('2024-01-09'), oggi, conto)).toEqual({
      valido: false,
      motivo: 'lettura_anteriore_apertura',
    });
  });
});

describe('validaVincoloPrevisioneFissa', () => {
  it('valida una categoria senza previsione e senza fisse attive', () => {
    expect(validaVincoloPrevisioneFissa(false, false)).toEqual({
      valido: true,
    });
  });

  it('valida una categoria con previsione e senza fisse attive', () => {
    expect(validaVincoloPrevisioneFissa(true, false)).toEqual({ valido: true });
  });

  it('valida una categoria senza previsione e con fisse attive', () => {
    expect(validaVincoloPrevisioneFissa(false, true)).toEqual({ valido: true });
  });

  it('rifiuta una categoria con previsione e fisse attive', () => {
    expect(validaVincoloPrevisioneFissa(true, true)).toEqual({
      valido: false,
      motivo: 'previsione_e_fissa_su_stessa_categoria',
    });
  });
});
