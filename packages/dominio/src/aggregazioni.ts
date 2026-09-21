import { type Ciclo } from './cicli.js';
import { aggiungiGiorni, confrontaDate, type DataISO } from './date.js';
import { type BudgetDefault, type BudgetOverride } from './prospetto.js';
import { type CategoriaConDettagli } from './repository.js';
import { saldoA, type Conto, type Movimento } from './saldi.js';
import { somma } from './soldi.js';

export interface IntervalloDate {
  dataInizio: DataISO;
  dataFineEsclusiva: DataISO | null;
}

export function intervalloCiclo(
  cicloId: string,
  cicli: Ciclo[],
): IntervalloDate {
  const cicliOrdinati = [...cicli].sort((a, b) =>
    confrontaDate(a.startDate, b.startDate),
  );
  const indice = cicliOrdinati.findIndex((ciclo) => ciclo.id === cicloId);

  if (indice === -1) {
    throw new Error('ciclo non trovato: ' + cicloId);
  }

  return {
    dataInizio: cicliOrdinati[indice]!.startDate,
    dataFineEsclusiva: cicliOrdinati[indice + 1]?.startDate ?? null,
  };
}

export interface RigaCategoriaSpesa {
  categoriaId: string;
  speseCents: number;
}

export interface RigaSettoreSpesa {
  settoreId: string;
  speseCents: number;
  categorie: RigaCategoriaSpesa[];
}

export function speseSettoreCategoria(
  movimenti: Movimento[],
  categorie: CategoriaConDettagli[],
  intervallo: IntervalloDate,
): RigaSettoreSpesa[] {
  const categorieConSpese = categorie
    .map((categoria) => {
      const speseCents = somma(
        movimenti
          .filter(
            (movimento) =>
              movimento.transferGroupId === null &&
              movimento.posizioneId === null &&
              movimento.categoriaId === categoria.id &&
              movimento.amountCents < 0 &&
              confrontaDate(movimento.data, intervallo.dataInizio) >= 0 &&
              (intervallo.dataFineEsclusiva === null ||
                confrontaDate(movimento.data, intervallo.dataFineEsclusiva) <
                  0),
          )
          .map((movimento) => -movimento.amountCents),
      );

      return {
        categoriaId: categoria.id,
        settoreId: categoria.settoreId,
        speseCents,
      };
    })
    .filter((categoria) => categoria.speseCents > 0);

  return Array.from(
    new Set(categorieConSpese.map((categoria) => categoria.settoreId)),
  ).map((settoreId) => {
    const categorieSettore = categorieConSpese.filter(
      (categoria) => categoria.settoreId === settoreId,
    );
    const categorie = categorieSettore.map(({ categoriaId, speseCents }) => ({
      categoriaId,
      speseCents,
    }));

    return {
      settoreId,
      speseCents: somma(categorie.map((categoria) => categoria.speseCents)),
      categorie,
    };
  });
}

export interface PuntoSaldoGiornaliero {
  data: DataISO;
  saldoCents: number;
}

export function saldoGiornaliero(
  dataInizio: DataISO,
  dataFine: DataISO,
  conti: Conto[],
  movimenti: Movimento[],
): PuntoSaldoGiornaliero[] {
  if (confrontaDate(dataFine, dataInizio) < 0) {
    throw new Error('intervallo non valido: dataFine precede dataInizio');
  }

  const punti: PuntoSaldoGiornaliero[] = [];

  for (
    let giorno = dataInizio;
    confrontaDate(giorno, dataFine) <= 0;
    giorno = aggiungiGiorni(giorno, 1)
  ) {
    punti.push({ data: giorno, saldoCents: saldoA(giorno, conti, movimenti) });
  }

  return punti;
}

export interface RigaCategoriaPrevistoSpeso {
  categoriaId: string;
  previstoCents: number;
  speseCents: number;
}

export interface PrevistoSpesoCiclo {
  cicloId: string;
  previstoTotaleCents: number;
  speseTotaleCents: number;
  categorie: RigaCategoriaPrevistoSpeso[];
}

export function previstoSpesoPerCiclo(
  cicloId: string,
  cicli: Ciclo[],
  budgetDefaults: BudgetDefault[],
  budgetOverrides: BudgetOverride[],
  movimenti: Movimento[],
  categorie: CategoriaConDettagli[],
): PrevistoSpesoCiclo {
  const intervallo = intervalloCiclo(cicloId, cicli);
  const spesePerCategoria = new Map(
    speseSettoreCategoria(movimenti, categorie, intervallo).flatMap((settore) =>
      settore.categorie.map((categoria) => [
        categoria.categoriaId,
        categoria.speseCents,
      ]),
    ),
  );
  const righe = budgetDefaults.map((budgetDefault) => {
    const override = budgetOverrides.find(
      (budgetOverride) =>
        budgetOverride.cicloId === cicloId &&
        budgetOverride.categoriaId === budgetDefault.categoriaId,
    );

    return {
      categoriaId: budgetDefault.categoriaId,
      previstoCents: override?.amountCents ?? budgetDefault.amountCents,
      speseCents: spesePerCategoria.get(budgetDefault.categoriaId) ?? 0,
    };
  });

  return {
    cicloId,
    previstoTotaleCents: somma(righe.map((riga) => riga.previstoCents)),
    speseTotaleCents: somma(righe.map((riga) => riga.speseCents)),
    categorie: righe,
  };
}
