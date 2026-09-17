import { confrontaDate, type DataISO } from './date.js';
import { somma } from './soldi.js';
import { cicloContenente, type Ciclo } from './cicli.js';
import {
  saldoA,
  saldiPerConto,
  type Conto,
  type Movimento,
  type SaldoConto,
} from './saldi.js';

export type StatoOccorrenzaFissa = 'pending' | 'paid' | 'skipped';

export interface MovimentoCollegato {
  data: DataISO;
}

export interface OccorrenzaFissa {
  id: string;
  scadenza: DataISO;
  amountCentsPrevisto: number;
  categoriaId: string | null;
  contoId: string;
  stato: StatoOccorrenzaFissa;
  movimentoCollegato: MovimentoCollegato | null;
}

export interface BudgetDefault {
  categoriaId: string;
  amountCents: number;
}

export interface BudgetOverride {
  cicloId: string;
  categoriaId: string;
  amountCents: number;
}

export interface RigaCategoria {
  categoriaId: string;
  previstoCents: number;
  speseCents: number;
  residuoCents: number;
  sforamentoCents: number;
}

export type MotivoSaldoPrevistoAssente =
  'orizzonte_mancante' | 'orizzonte_superato' | 'nessun_ciclo';

export interface Prospetto {
  data: DataISO;
  dataFutura: boolean;
  saldoTotaleCents: number;
  saldiPerConto: SaldoConto[];
  fisseAncoraDaPagare: OccorrenzaFissa[];
  totaleFisseAncoraDaPagareCents: number;
  categorie: RigaCategoria[];
  saldoPrevistoCents: number | null;
  motivoSaldoPrevistoAssente: MotivoSaldoPrevistoAssente | null;
  dopoAccreditoCents: number | null;
}

export interface DatiProspetto {
  conti: Conto[];
  movimenti: Movimento[];
  cicli: Ciclo[];
  occorrenzeFisse: OccorrenzaFissa[];
  budgetDefaults: BudgetDefault[];
  budgetOverrides: BudgetOverride[];
}

export function prospetto(
  d: DataISO,
  oggi: DataISO,
  dati: DatiProspetto,
): Prospetto {
  const ciclo = cicloContenente(d, dati.cicli);
  const e = ciclo?.expectedNextDate ?? null;
  const eValida = e !== null && confrontaDate(e, d) > 0;
  const pagataEntroD = (occorrenza: OccorrenzaFissa): boolean =>
    occorrenza.movimentoCollegato !== null &&
    confrontaDate(occorrenza.movimentoCollegato.data, d) <= 0;

  // Gli arretrati sono un fatto su D, anche senza ciclo o orizzonte.
  const arretrate = dati.occorrenzeFisse.filter(
    (occorrenza) =>
      occorrenza.stato !== 'skipped' &&
      !pagataEntroD(occorrenza) &&
      confrontaDate(occorrenza.scadenza, d) <= 0,
  );
  const inOrizzonte =
    eValida && e !== null
      ? dati.occorrenzeFisse.filter(
          (occorrenza) =>
            occorrenza.stato !== 'skipped' &&
            !pagataEntroD(occorrenza) &&
            confrontaDate(occorrenza.scadenza, d) > 0 &&
            confrontaDate(occorrenza.scadenza, e) < 0,
        )
      : [];
  const fisseAncoraDaPagare = [...arretrate, ...inOrizzonte];
  const totaleFisseAncoraDaPagareCents = somma(
    fisseAncoraDaPagare.map((occorrenza) => occorrenza.amountCentsPrevisto),
  );
  const categorie = ciclo
    ? dati.budgetDefaults.map((budgetDefault) => {
        const override = dati.budgetOverrides.find(
          (budgetOverride) =>
            budgetOverride.cicloId === ciclo.id &&
            budgetOverride.categoriaId === budgetDefault.categoriaId,
        );
        const previstoCents =
          override?.amountCents ?? budgetDefault.amountCents;
        const speseCents = -somma(
          dati.movimenti
            .filter(
              (movimento) =>
                movimento.categoriaId === budgetDefault.categoriaId &&
                confrontaDate(movimento.data, ciclo.startDate) >= 0 &&
                confrontaDate(movimento.data, d) <= 0,
            )
            .map((movimento) => movimento.amountCents),
        );
        const residuoCents = Math.max(0, previstoCents - speseCents);
        const sforamentoCents = Math.max(0, speseCents - previstoCents);

        return {
          categoriaId: budgetDefault.categoriaId,
          previstoCents,
          speseCents,
          residuoCents,
          sforamentoCents,
        };
      })
    : [];
  const totaleResiduiCents = somma(
    categorie.map((categoria) => categoria.residuoCents),
  );
  let saldoPrevistoCents: number | null;
  let motivoSaldoPrevistoAssente: MotivoSaldoPrevistoAssente | null;

  if (!ciclo) {
    saldoPrevistoCents = null;
    motivoSaldoPrevistoAssente = 'nessun_ciclo';
  } else if (e === null) {
    saldoPrevistoCents = null;
    motivoSaldoPrevistoAssente = 'orizzonte_mancante';
  } else if (!eValida) {
    saldoPrevistoCents = null;
    motivoSaldoPrevistoAssente = 'orizzonte_superato';
  } else {
    saldoPrevistoCents = somma([
      saldoA(d, dati.conti, dati.movimenti),
      -totaleFisseAncoraDaPagareCents,
      -totaleResiduiCents,
    ]);
    motivoSaldoPrevistoAssente = null;
  }

  const dopoAccreditoCents =
    saldoPrevistoCents !== null && ciclo?.expectedAmountCents != null
      ? somma([saldoPrevistoCents, ciclo.expectedAmountCents])
      : null;

  return {
    data: d,
    dataFutura: confrontaDate(d, oggi) > 0,
    saldoTotaleCents: saldoA(d, dati.conti, dati.movimenti),
    saldiPerConto: saldiPerConto(d, dati.conti, dati.movimenti),
    fisseAncoraDaPagare,
    totaleFisseAncoraDaPagareCents,
    categorie,
    saldoPrevistoCents,
    motivoSaldoPrevistoAssente,
    dopoAccreditoCents,
  };
}
