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
