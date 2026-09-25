import type { CSSProperties } from 'react';

export const STILE_PAGINA: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
};

export const STILE_INTESTAZIONE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-3)',
};

export const STILE_DESCRIZIONE: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '14px',
  maxWidth: '64ch',
  margin: 0,
};

export const STILE_LISTA: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  maxWidth: '860px',
};

export const STILE_CARD: CSSProperties = {
  border: '1px solid var(--color-divider)',
  padding: 'var(--space-4)',
};

export const STILE_INTESTAZIONE_CARD: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 'var(--space-3)',
  flexWrap: 'wrap',
  marginBottom: 'var(--space-3)',
};

export const STILE_NOME_OCCORRENZA: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '17px',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
  flexWrap: 'wrap',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_VUOTO: CSSProperties = {
  border: '1px solid var(--color-divider)',
  padding: 'var(--space-8) var(--space-4)',
  color: 'var(--muted)',
  fontSize: '14px',
};

export const STILE_RIQUADRO_SALDO: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 1.3fr) minmax(240px, 1fr)',
  border: '1px solid var(--color-divider)',
};

export const STILE_COLONNA_SALDO_PRINCIPALE: CSSProperties = {
  padding: 'var(--space-6)',
  borderRight: '2px solid var(--color-divider)',
};

export const STILE_COLONNA_SALDO_SECONDARIA: CSSProperties = {
  padding: 'var(--space-6)',
  background: 'var(--color-surface)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

export const STILE_KICKER: CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

export const STILE_NUMERO_GRANDE: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '54px',
  letterSpacing: '-0.03em',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 0.95,
};

export const STILE_NUMERO_MEDIO: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.02em',
  fontVariantNumeric: 'tabular-nums',
  margin: 'var(--space-2) 0 var(--space-1)',
};
