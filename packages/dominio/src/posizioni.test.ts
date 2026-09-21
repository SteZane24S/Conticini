import { describe, expect, it } from 'vitest';

import {
  calcolaResiduoCents,
  calcolaTotaleNetto,
  categoriaSaldamentoPer,
  ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
  ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
  ID_SETTORE_TECNICO_DEBITI_CREDITI,
  segnoMovimentoSaldamento,
  validaSaldamento,
} from './posizioni.js';

describe('posizioni', () => {
  it('calcola il residuo sottraendo i movimenti collegati allimporto iniziale', () => {
    expect(calcolaResiduoCents(-20_000, [{ amountCents: -5_000 }])).toBe(
      -15_000,
    );
    expect(calcolaResiduoCents(20_000, [{ amountCents: 5_000 }])).toBe(15_000);
  });

  it('rifiuta un saldamento con importo non positivo', () => {
    expect(validaSaldamento(0, -10_000)).toEqual({
      valido: false,
      motivo: 'importo_non_positivo',
    });
  });

  it('rifiuta un saldamento superiore al residuo', () => {
    expect(validaSaldamento(10_001, -10_000)).toEqual({
      valido: false,
      motivo: 'importo_supera_residuo',
    });
  });

  it('valida un saldamento uguale al residuo', () => {
    expect(validaSaldamento(10_000, -10_000)).toEqual({ valido: true });
  });

  it('calcola il totale netto con soli debiti', () => {
    expect(
      calcolaTotaleNetto(100_000, [{ verso: 'debito', residuoCents: -20_000 }]),
    ).toEqual({
      soldiSuiContiCents: 100_000,
      creditiDaIncassareCents: 0,
      debitiDaPagareCents: 20_000,
      nettoCents: 80_000,
    });
  });

  it('calcola il totale netto con soli crediti', () => {
    expect(
      calcolaTotaleNetto(100_000, [{ verso: 'credito', residuoCents: 20_000 }]),
    ).toEqual({
      soldiSuiContiCents: 100_000,
      creditiDaIncassareCents: 20_000,
      debitiDaPagareCents: 0,
      nettoCents: 120_000,
    });
  });

  it('calcola il totale netto con debiti e crediti', () => {
    expect(
      calcolaTotaleNetto(100_000, [
        { verso: 'debito', residuoCents: -20_000 },
        { verso: 'credito', residuoCents: 5_000 },
      ]),
    ).toEqual({
      soldiSuiContiCents: 100_000,
      creditiDaIncassareCents: 5_000,
      debitiDaPagareCents: 20_000,
      nettoCents: 85_000,
    });
  });

  it('calcola il totale netto senza posizioni', () => {
    expect(calcolaTotaleNetto(100_000, [])).toEqual({
      soldiSuiContiCents: 100_000,
      creditiDaIncassareCents: 0,
      debitiDaPagareCents: 0,
      nettoCents: 100_000,
    });
  });

  it('restituisce il segno del movimento di saldamento per verso', () => {
    expect(segnoMovimentoSaldamento('debito')).toBe(-1);
    expect(segnoMovimentoSaldamento('credito')).toBe(1);
  });

  it('restituisce la categoria tecnica di saldamento per verso', () => {
    expect(categoriaSaldamentoPer('debito')).toBe(
      ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI,
    );
    expect(categoriaSaldamentoPer('credito')).toBe(
      ID_CATEGORIA_TECNICA_INCASSO_CREDITI,
    );
  });

  it('mantiene gli identificatori tecnici deterministici concordati', () => {
    expect(ID_SETTORE_TECNICO_DEBITI_CREDITI).toBe(
      'd69f8576-297f-5e81-9b8f-3e08ff260840',
    );
    expect(ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI).toBe(
      '5977fe44-56c3-5051-ab56-e2dfe1de792b',
    );
    expect(ID_CATEGORIA_TECNICA_INCASSO_CREDITI).toBe(
      '0241aadc-5e40-504f-a15a-56cc766936b1',
    );
  });
});
