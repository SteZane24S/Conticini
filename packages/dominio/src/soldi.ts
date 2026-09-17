export const LIMITE_IMPORTO_CENTS = 100_000_000_00;

export function parseImporto(input: string): number {
  const testo = input.trim();
  let parteIntera: string;
  let parteDecimale: string;

  if (/^-?\d+(\.\d{3})*(,\d{1,2})?$/.test(testo)) {
    const parti = testo.replaceAll('.', '').split(',');
    parteIntera = parti[0]!;
    parteDecimale = (parti[1] ?? '00').padEnd(2, '0');
  } else if (/^-?\d+(\.\d{1,2})?$/.test(testo)) {
    const parti = testo.split('.');
    parteIntera = parti[0]!;
    parteDecimale = (parti[1] ?? '00').padEnd(2, '0');
  } else {
    throw new Error('importo non valido: ' + input);
  }

  const cents = Number(parteIntera + parteDecimale);

  if (!Number.isSafeInteger(cents) || Math.abs(cents) > LIMITE_IMPORTO_CENTS) {
    throw new Error('importo non valido: ' + input);
  }

  return cents;
}

export function formatImporto(cents: number): string {
  const numero = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(cents / 100);

  return `${numero} €`;
}

export function somma(valori: number[]): number {
  const totale = valori.reduce((parziale, valore) => parziale + valore, 0);

  if (!Number.isSafeInteger(totale)) {
    throw new Error('overflow nella somma degli importi');
  }

  return totale;
}
