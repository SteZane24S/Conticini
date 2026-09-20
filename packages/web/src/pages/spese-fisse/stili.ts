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

export const STILE_GRID_SEZIONI: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(340px, 1.5fr) minmax(300px, 380px)',
  gap: 'var(--space-8)',
  alignItems: 'start',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'center',
};

export const STILE_RIGA_SPESA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: '11px var(--space-2) 11px 0',
  borderBottom: '1px solid var(--color-divider)',
};

export const STILE_NOME_SPESA: CSSProperties = {
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
};

export const STILE_META_SPESA: CSSProperties = {
  fontSize: '12px',
  color: 'var(--muted)',
  marginTop: '3px',
};

export const STILE_IMPORTO_SPESA: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  fontSize: '16px',
  paddingRight: 'var(--space-2)',
};

export const STILE_NOTA_ATTENUATA: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '13.5px',
};
