import type { CSSProperties } from 'react';

export const STILE_PAGINA: CSSProperties = {
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
  maxWidth: '900px',
};

export const STILE_SEZIONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

export const STILE_TABELLA: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

export const STILE_CELLA: CSSProperties = {
  borderBottom: '1px solid #ddd',
  padding: '0.5rem',
  textAlign: 'left',
};

export const STILE_FORM: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  border: '1px solid #ccc',
  padding: '1rem',
  maxWidth: '400px',
};

export const STILE_CAMPO: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: '#b00020',
  fontSize: '0.85rem',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: '#b00020',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

export const STILE_AVVISO: CSSProperties = {
  color: '#9a6700',
  fontWeight: 600,
};
