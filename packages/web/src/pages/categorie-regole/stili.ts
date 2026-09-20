import type { CSSProperties } from 'react';

export const STILE_PAGINA: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export const STILE_INTESTAZIONE: CSSProperties = {
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-3)',
};

export const STILE_GRID_SEZIONI: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 1fr) minmax(380px, 1.25fr)',
  gap: 'var(--space-8)',
  alignItems: 'start',
};

export const STILE_SEZIONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

export const STILE_TITOLO_SEZIONE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-2)',
};

export const STILE_ELENCO_SETTORI: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
};

export const STILE_RIGA_SETTORE: CSSProperties = {
  padding: 'var(--space-3) 0',
  borderBottom: '1px solid var(--color-divider)',
};

export const STILE_INTESTAZIONE_SETTORE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
};

export const STILE_NOME_SETTORE: CSSProperties = {
  fontWeight: 600,
  fontSize: '1.05rem',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
};

export const STILE_ELENCO_CATEGORIE: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 'var(--space-2) 0 0 var(--space-4)',
};

export const STILE_RIGA_CATEGORIA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) 0',
  borderBottom: '1px solid var(--color-divider)',
};

export const STILE_NOME_CATEGORIA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
};

export const STILE_BADGE_ENTRATA: CSSProperties = {
  fontSize: '0.75rem',
  padding: 'var(--space-1)',
  background: 'var(--verde-bg)',
  color: 'var(--verde)',
};

export const STILE_BADGE_USCITA: CSSProperties = {
  fontSize: '0.75rem',
  padding: 'var(--space-1)',
  background: 'var(--rosso-bg)',
  color: 'var(--rosso)',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

export const STILE_PANNELLO_ANTEPRIMA: CSSProperties = {
  border: '1px solid var(--color-divider)',
  background: 'var(--color-surface)',
  padding: 'var(--space-4)',
};

export const STILE_ELENCO_ANTEPRIMA: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 'var(--space-2) 0 0',
};

export const STILE_RIGA_ANTEPRIMA: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  padding: 'var(--space-1) 0',
};

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: 'var(--rosso)',
  fontSize: '0.85rem',
  margin: 'var(--space-1) 0 0',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
  margin: 'var(--space-2) 0 0',
};

export function messaggioErrore(errore: unknown): string {
  return errore instanceof Error ? errore.message : 'Errore imprevisto.';
}
