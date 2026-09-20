import type { CSSProperties } from 'react';

export const STILE_PAGINA: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export const STILE_INTESTAZIONE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 'var(--space-6)',
  flexWrap: 'wrap',
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-3)',
};

export const STILE_SELETTORE: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-4)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const STILE_SEZIONE: CSSProperties = {
  border: '1px solid var(--color-divider)',
  padding: 'var(--space-4)',
};

export const STILE_TITOLO_SEZIONE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-2)',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_NOTA_ATTENUATA: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '13.5px',
};
