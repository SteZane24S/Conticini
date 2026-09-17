import { confrontaDate } from './date.js';
import { type Conto, type Movimento } from './saldi.js';

export type TipoCategoria = 'entrata' | 'uscita';

export interface Categoria {
  id: string;
  kind: TipoCategoria;
}

export type EsitoValidazione<TMotivo extends string> =
  { valido: true } | { valido: false; motivo: TMotivo };

export type MotivoTrasferimentoNonValido =
  | 'numero_movimenti'
  | 'stesso_conto'
  | 'date_diverse'
  | 'importi_non_opposti'
  | 'categoria_non_nulla';

export function validaTrasferimento(
  movimenti: Movimento[],
): EsitoValidazione<MotivoTrasferimentoNonValido> {
  if (movimenti.length !== 2) {
    return { valido: false, motivo: 'numero_movimenti' };
  }

  const a = movimenti[0]!;
  const b = movimenti[1]!;
  if (a.contoId === b.contoId) {
    return { valido: false, motivo: 'stesso_conto' };
  }
  if (confrontaDate(a.data, b.data) !== 0) {
    return { valido: false, motivo: 'date_diverse' };
  }
  if (a.amountCents !== -b.amountCents) {
    return { valido: false, motivo: 'importi_non_opposti' };
  }
  if (a.categoriaId !== null || b.categoriaId !== null) {
    return { valido: false, motivo: 'categoria_non_nulla' };
  }

  return { valido: true };
}

export type MotivoSegnoNonCoerente = 'segno_non_coerente';

export function validaSegnoCategoria(
  movimento: Movimento,
  categoria: Categoria,
): EsitoValidazione<MotivoSegnoNonCoerente> {
  const segnoCoerente =
    categoria.kind === 'entrata'
      ? movimento.amountCents > 0
      : movimento.amountCents < 0;

  if (!segnoCoerente) {
    return { valido: false, motivo: 'segno_non_coerente' };
  }

  return { valido: true };
}

export type MotivoMovimentoAnterioreApertura = 'movimento_anteriore_apertura';

export function validaDataApertura(
  movimento: Movimento,
  conto: Conto,
): EsitoValidazione<MotivoMovimentoAnterioreApertura> {
  if (confrontaDate(movimento.data, conto.dataApertura) < 0) {
    return { valido: false, motivo: 'movimento_anteriore_apertura' };
  }

  return { valido: true };
}

export type MotivoVincoloPrevisioneFissa =
  'previsione_e_fissa_su_stessa_categoria';

export function validaVincoloPrevisioneFissa(
  haPrevisione: boolean,
  haFisseAttive: boolean,
): EsitoValidazione<MotivoVincoloPrevisioneFissa> {
  if (haPrevisione && haFisseAttive) {
    return {
      valido: false,
      motivo: 'previsione_e_fissa_su_stessa_categoria',
    };
  }

  return { valido: true };
}
