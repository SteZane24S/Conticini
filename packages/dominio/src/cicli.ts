import { confrontaDate, type DataISO } from './date.js';

export interface Ciclo {
  id: string;
  startDate: DataISO;
  expectedNextDate: DataISO | null;
  expectedAmountCents: number | null;
}

export function cicloContenente(d: DataISO, cicli: Ciclo[]): Ciclo | null {
  let trovato: Ciclo | null = null;

  for (const ciclo of [...cicli].sort((a, b) =>
    confrontaDate(a.startDate, b.startDate),
  )) {
    if (confrontaDate(ciclo.startDate, d) <= 0) {
      trovato = ciclo;
    } else {
      break;
    }
  }

  return trovato;
}
