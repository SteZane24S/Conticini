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

export const STILE_SEZIONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

export const STILE_GRID_CONTENUTI: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 360px) minmax(340px, 1fr)',
  gap: 'var(--space-8)',
  alignItems: 'start',
};

export const STILE_COLONNA_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_TITOLO_SEZIONE: CSSProperties = {
  margin: 0,
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-2)',
};
