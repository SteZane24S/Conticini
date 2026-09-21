import { type DataISO } from './date.js';
import { type EsitoValidazione } from './validazioni.js';
import { NAMESPACE_CONTICINI, uuidv5 } from './identita.js';
import { somma } from './soldi.js';

export type VersoPosizione = 'debito' | 'credito';

export interface Posizione {
  id: string;
  descrizione: string;
  verso: VersoPosizione;
  importoInizialeCents: number; // con segno: negativo per debito, positivo per credito
  dataApertura: DataISO;
}

export const ID_SETTORE_TECNICO_DEBITI_CREDITI = uuidv5(
  'settore-debiti-crediti',
  NAMESPACE_CONTICINI,
);
export const ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI = uuidv5(
  'categoria-pagamento-debiti',
  NAMESPACE_CONTICINI,
);
export const ID_CATEGORIA_TECNICA_INCASSO_CREDITI = uuidv5(
  'categoria-incasso-crediti',
  NAMESPACE_CONTICINI,
);

export function segnoMovimentoSaldamento(verso: VersoPosizione): 1 | -1 {
  return verso === 'debito' ? -1 : 1;
}

export function categoriaSaldamentoPer(verso: VersoPosizione): string {
  return verso === 'debito'
    ? ID_CATEGORIA_TECNICA_PAGAMENTO_DEBITI
    : ID_CATEGORIA_TECNICA_INCASSO_CREDITI;
}

export interface MovimentoSaldamento {
  amountCents: number;
}

export function calcolaResiduoCents(
  importoInizialeCents: number,
  movimentiCollegati: MovimentoSaldamento[],
): number {
  return (
    importoInizialeCents - somma(movimentiCollegati.map((m) => m.amountCents))
  );
}

export type MotivoSaldamentoNonValido =
  'importo_non_positivo' | 'importo_supera_residuo';

export function validaSaldamento(
  importoRichiestoCents: number,
  residuoCents: number,
): EsitoValidazione<MotivoSaldamentoNonValido> {
  if (importoRichiestoCents <= 0) {
    return { valido: false, motivo: 'importo_non_positivo' };
  }
  if (importoRichiestoCents > Math.abs(residuoCents)) {
    return { valido: false, motivo: 'importo_supera_residuo' };
  }
  return { valido: true };
}

export interface RigaPosizioneNetto {
  verso: VersoPosizione;
  residuoCents: number; // con segno, stessa convenzione di importoInizialeCents
}

export interface TotaleNetto {
  soldiSuiContiCents: number;
  creditiDaIncassareCents: number;
  debitiDaPagareCents: number;
  nettoCents: number;
}

export function calcolaTotaleNetto(
  soldiSuiContiCents: number,
  posizioni: RigaPosizioneNetto[],
): TotaleNetto {
  const creditiDaIncassareCents = somma(
    posizioni.filter((p) => p.verso === 'credito').map((p) => p.residuoCents),
  );
  const debitiDaPagareCents = somma(
    posizioni.filter((p) => p.verso === 'debito').map((p) => -p.residuoCents),
  );
  return {
    soldiSuiContiCents,
    creditiDaIncassareCents,
    debitiDaPagareCents,
    nettoCents: somma([
      soldiSuiContiCents,
      creditiDaIncassareCents,
      -debitiDaPagareCents,
    ]),
  };
}
