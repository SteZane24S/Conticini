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

export const STILE_CAMPO_SELETTORE: CSSProperties = {
  maxWidth: '200px',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: 'var(--rosso)',
  fontSize: '13px',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_RIGA_CARD: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  border: '1px solid var(--color-divider)',
};

export const STILE_CELLA_CARD: CSSProperties = {
  padding: 'var(--space-4)',
  borderRight: '1px solid var(--color-divider)',
};

export const STILE_KICKER: CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

export const STILE_VALORE_CARD: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '26px',
  fontVariantNumeric: 'tabular-nums',
  marginTop: 'var(--space-2)',
};

export const STILE_CELLA_DESTRA: CSSProperties = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'center',
};
