import {
  annoDi,
  confrontaDate,
  costruisciData,
  type DataISO,
  meseDi,
  ultimoGiornoDelMese,
} from './date.js';

export interface Occorrenza {
  periodo: string;
  scadenza: DataISO;
}

export interface RicorrenzaMensile {
  tipo: 'monthly';
  anchorDay: number;
  startDate: DataISO;
  endDate?: DataISO;
}

export interface RicorrenzaOgniNMesi {
  tipo: 'every_n_months';
  n: number;
  anchorMonth: number;
  anchorDay: number;
  startDate: DataISO;
  endDate?: DataISO;
}

export interface RicorrenzaAnnuale {
  tipo: 'yearly';
  anchorMonth: number;
  anchorDay: number;
  startDate: DataISO;
  endDate?: DataISO;
}

export type RegolaRicorrenza =
  RicorrenzaMensile | RicorrenzaOgniNMesi | RicorrenzaAnnuale;

export function monthly(
  anchorDay: number,
  startDate: DataISO,
  endDate?: DataISO,
): RicorrenzaMensile {
  return { tipo: 'monthly', anchorDay, startDate, endDate };
}

export function everyNMonths(
  n: number,
  anchorMonth: number,
  anchorDay: number,
  startDate: DataISO,
  endDate?: DataISO,
): RicorrenzaOgniNMesi {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('n deve essere un intero positivo: ' + n);
  }

  return {
    tipo: 'every_n_months',
    n,
    anchorMonth,
    anchorDay,
    startDate,
    endDate,
  };
}

export function yearly(
  anchorMonth: number,
  anchorDay: number,
  startDate: DataISO,
  endDate?: DataISO,
): RicorrenzaAnnuale {
  return { tipo: 'yearly', anchorMonth, anchorDay, startDate, endDate };
}

function indiceMese(anno: number, mese: number): number {
  return anno * 12 + (mese - 1);
}

function aggiungiOccorrenza(
  occorrenze: Occorrenza[],
  regola: RegolaRicorrenza,
  scadenza: DataISO,
  da: DataISO,
  a: DataISO,
): void {
  if (
    confrontaDate(scadenza, da) >= 0 &&
    confrontaDate(scadenza, a) <= 0 &&
    confrontaDate(scadenza, regola.startDate) >= 0 &&
    (!regola.endDate || confrontaDate(scadenza, regola.endDate) <= 0)
  ) {
    occorrenze.push({ periodo: scadenza.slice(0, 7), scadenza });
  }
}

export function occorrenzeTra(
  regola: RegolaRicorrenza,
  da: DataISO,
  a: DataISO,
): Occorrenza[] {
  const occorrenze: Occorrenza[] = [];

  if (regola.tipo === 'monthly') {
    const min = Math.max(
      indiceMese(annoDi(regola.startDate), meseDi(regola.startDate)),
      indiceMese(annoDi(da), meseDi(da)),
    );
    const max = indiceMese(annoDi(a), meseDi(a));

    for (let idx = min; idx <= max; idx += 1) {
      const annoCorrente = Math.floor(idx / 12);
      const meseCorrente = idx - annoCorrente * 12 + 1;
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, meseCorrente),
      );
      const scadenza = costruisciData(annoCorrente, meseCorrente, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  if (regola.tipo === 'yearly') {
    const min = Math.max(annoDi(regola.startDate), annoDi(da));
    const max = annoDi(a);

    for (let annoCorrente = min; annoCorrente <= max; annoCorrente += 1) {
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, regola.anchorMonth),
      );
      const scadenza = costruisciData(annoCorrente, regola.anchorMonth, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  if (regola.tipo === 'every_n_months') {
    const ref = indiceMese(annoDi(regola.startDate), regola.anchorMonth);
    const minIdx = Math.max(
      indiceMese(annoDi(regola.startDate), meseDi(regola.startDate)),
      indiceMese(annoDi(da), meseDi(da)),
    );
    const maxIdx = indiceMese(annoDi(a), meseDi(a));

    for (
      let k = Math.ceil((minIdx - ref) / regola.n), idx = ref + k * regola.n;
      idx <= maxIdx;
      k += 1, idx = ref + k * regola.n
    ) {
      const annoCorrente = Math.floor(idx / 12);
      const meseCorrente = idx - annoCorrente * 12 + 1;
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, meseCorrente),
      );
      const scadenza = costruisciData(annoCorrente, meseCorrente, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  return occorrenze;
}
