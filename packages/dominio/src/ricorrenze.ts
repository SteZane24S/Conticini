import { confrontaDate, type DataISO, ultimoGiornoDelMese } from './date.js';

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

function anno(data: DataISO): number {
  return Number(data.slice(0, 4));
}

function mese(data: DataISO): number {
  return Number(data.slice(5, 7));
}

function creaData(anno: number, mese: number, giorno: number): DataISO {
  return `${String(anno).padStart(4, '0')}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}` as DataISO;
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
      indiceMese(anno(regola.startDate), mese(regola.startDate)),
      indiceMese(anno(da), mese(da)),
    );
    const max = indiceMese(anno(a), mese(a));

    for (let idx = min; idx <= max; idx += 1) {
      const annoCorrente = Math.floor(idx / 12);
      const meseCorrente = idx - annoCorrente * 12 + 1;
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, meseCorrente),
      );
      const scadenza = creaData(annoCorrente, meseCorrente, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  if (regola.tipo === 'yearly') {
    const min = Math.max(anno(regola.startDate), anno(da));
    const max = anno(a);

    for (let annoCorrente = min; annoCorrente <= max; annoCorrente += 1) {
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, regola.anchorMonth),
      );
      const scadenza = creaData(annoCorrente, regola.anchorMonth, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  if (regola.tipo === 'every_n_months') {
    const ref = indiceMese(anno(regola.startDate), regola.anchorMonth);
    const minIdx = Math.max(
      indiceMese(anno(regola.startDate), mese(regola.startDate)),
      indiceMese(anno(da), mese(da)),
    );
    const maxIdx = indiceMese(anno(a), mese(a));

    for (
      let k = Math.ceil((minIdx - ref) / regola.n), idx = ref + k * regola.n;
      idx <= maxIdx;
      k += 1, idx = ref + k * regola.n
    ) {
      if (idx < minIdx) {
        continue;
      }

      const annoCorrente = Math.floor(idx / 12);
      const meseCorrente = idx - annoCorrente * 12 + 1;
      const giorno = Math.min(
        regola.anchorDay,
        ultimoGiornoDelMese(annoCorrente, meseCorrente),
      );
      const scadenza = creaData(annoCorrente, meseCorrente, giorno);

      aggiungiOccorrenza(occorrenze, regola, scadenza, da, a);
    }
  }

  return occorrenze;
}
