import { confrontaDate, type DataISO } from './date.js';
import { normalizzaTesto } from './testo.js';

export interface RegolaCategoria {
  id: string;
  pattern: string; // già normalizzato (minuscolo, senza accenti, spazi compressi)
  categoriaId: string;
  priority: number;
  active: boolean;
  deletedAt: string | null;
  createdAt: string; // timestamp ISO 8601, confrontabile lessicograficamente
}

export function categoriaDaRegole(
  descrizione: string,
  regole: RegolaCategoria[],
): string | null {
  const descrizioneNormalizzata = normalizzaTesto(descrizione);
  const candidati = regole
    .filter(
      (regola) =>
        regola.active === true &&
        regola.deletedAt === null &&
        descrizioneNormalizzata.includes(regola.pattern),
    )
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      if (a.pattern.length !== b.pattern.length) {
        return b.pattern.length - a.pattern.length;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  return candidati[0]?.categoriaId ?? null;
}

export interface VoceStorico {
  descrizione: string;
  descrizioneNorm: string; // già normalizzata, coerente con normalizzaTesto(descrizione)
  categoriaId: string | null;
  amountCents: number;
  data: DataISO;
}

export interface SuggerimentoDescrizione {
  descrizione: string;
  categoriaId: string | null;
  amountCentsRecente: number;
}

function categoriaPiuUsata(voci: VoceStorico[]): string | null {
  const frequenze = new Map<
    string,
    { frequenza: number; dataPiuRecente: DataISO }
  >();

  for (const voce of voci) {
    if (voce.categoriaId === null) {
      continue;
    }

    const frequenza = frequenze.get(voce.categoriaId);
    if (frequenza === undefined) {
      frequenze.set(voce.categoriaId, {
        frequenza: 1,
        dataPiuRecente: voce.data,
      });
      continue;
    }

    frequenza.frequenza += 1;
    if (confrontaDate(voce.data, frequenza.dataPiuRecente) > 0) {
      frequenza.dataPiuRecente = voce.data;
    }
  }

  let migliore: {
    categoriaId: string;
    frequenza: number;
    dataPiuRecente: DataISO;
  } | null = null;

  for (const [categoriaId, frequenza] of frequenze) {
    if (
      migliore === null ||
      frequenza.frequenza > migliore.frequenza ||
      (frequenza.frequenza === migliore.frequenza &&
        confrontaDate(frequenza.dataPiuRecente, migliore.dataPiuRecente) > 0)
    ) {
      migliore = {
        categoriaId,
        frequenza: frequenza.frequenza,
        dataPiuRecente: frequenza.dataPiuRecente,
      };
    }
  }

  return migliore?.categoriaId ?? null;
}

export function suggerimentiDescrizione(
  prefisso: string,
  storico: VoceStorico[],
  limite: number,
): SuggerimentoDescrizione[] {
  const prefissoNormalizzato = normalizzaTesto(prefisso);
  const gruppi = new Map<string, VoceStorico[]>();

  for (const voce of storico) {
    if (!voce.descrizioneNorm.startsWith(prefissoNormalizzato)) {
      continue;
    }

    const gruppo = gruppi.get(voce.descrizioneNorm);
    if (gruppo === undefined) {
      gruppi.set(voce.descrizioneNorm, [voce]);
    } else {
      gruppo.push(voce);
    }
  }

  const gruppiOrdinati = [...gruppi.values()]
    .map((voci) => {
      const recente = voci.reduce((precedente, voce) =>
        confrontaDate(voce.data, precedente.data) > 0 ? voce : precedente,
      );

      return {
        voci,
        frequenza: voci.length,
        dataPiuRecente: recente.data,
        suggerimento: {
          descrizione: recente.descrizione,
          categoriaId: categoriaPiuUsata(voci),
          amountCentsRecente: recente.amountCents,
        },
      };
    })
    .sort(
      (a, b) =>
        b.frequenza - a.frequenza ||
        confrontaDate(b.dataPiuRecente, a.dataPiuRecente),
    );
  if (limite <= 0) {
    return [];
  }

  return gruppiOrdinati
    .slice(0, limite)
    .map(({ suggerimento }) => suggerimento);
}

export function suggerisciCategoria(
  descrizione: string,
  regole: RegolaCategoria[],
  storico: VoceStorico[],
): string | null {
  const categoriaDaRegola = categoriaDaRegole(descrizione, regole);
  if (categoriaDaRegola !== null) {
    return categoriaDaRegola;
  }

  const descrizioneNormalizzata = normalizzaTesto(descrizione);
  return categoriaPiuUsata(
    storico.filter((voce) => voce.descrizioneNorm === descrizioneNormalizzata),
  );
}
