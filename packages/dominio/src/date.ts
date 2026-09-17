export type DataISO = string & { readonly __brand: 'DataISO' };

export function isDataISO(value: string): value is DataISO {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const anno = Number(value.slice(0, 4));
  const mese = Number(value.slice(5, 7));
  const giorno = Number(value.slice(8, 10));

  return (
    mese >= 1 &&
    mese <= 12 &&
    giorno >= 1 &&
    giorno <= ultimoGiornoDelMese(anno, mese)
  );
}

export function parseDataISO(value: string): DataISO {
  if (!isDataISO(value)) {
    throw new Error('data non valida: ' + value);
  }

  return value as DataISO;
}

export function confrontaDate(a: DataISO, b: DataISO): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function oggiLocale(now: Date): DataISO {
  const anno = now.getFullYear();
  const mese = String(now.getMonth() + 1).padStart(2, '0');
  const giorno = String(now.getDate()).padStart(2, '0');

  return `${anno}-${mese}-${giorno}` as DataISO;
}

export function ultimoGiornoDelMese(anno: number, mese: number): number {
  return new Date(anno, mese, 0).getDate();
}

export function aggiungiMesi(data: DataISO, n: number): DataISO {
  const anno = Number(data.slice(0, 4));
  const mese = Number(data.slice(5, 7));
  const giorno = Number(data.slice(8, 10));
  const idx = anno * 12 + (mese - 1) + n;
  const nuovoAnno = Math.floor(idx / 12);
  const nuovoMeseZeroBased = idx - nuovoAnno * 12;
  const nuovoMese = nuovoMeseZeroBased + 1;
  const nuovoGiorno = Math.min(
    giorno,
    ultimoGiornoDelMese(nuovoAnno, nuovoMese),
  );

  return `${nuovoAnno}-${String(nuovoMese).padStart(2, '0')}-${String(nuovoGiorno).padStart(2, '0')}` as DataISO;
}
