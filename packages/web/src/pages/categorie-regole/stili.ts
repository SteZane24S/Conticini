import type { CSSProperties } from 'react';

export const STILE_SEZIONE: CSSProperties = { marginBottom: '2rem' };

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: '#c0392b',
  fontSize: '0.85rem',
  margin: '0.25rem 0 0',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: '#c0392b',
  margin: '0.5rem 0 0',
};

export function messaggioErrore(errore: unknown): string {
  return errore instanceof Error ? errore.message : 'Errore imprevisto.';
}
