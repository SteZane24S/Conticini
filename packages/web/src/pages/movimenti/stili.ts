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

export const STILE_SEZIONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
};

export const STILE_BARRA_INSERIMENTO: CSSProperties = {
  border: '1px solid var(--color-divider)',
  background: 'var(--color-surface)',
  padding: 'var(--space-3)',
};

export const STILE_RIGA_CAMPI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

export const STILE_CAMPO_STRETTO: CSSProperties = {
  width: '130px',
};

export const STILE_CAMPO_CON_SUGGERIMENTI: CSSProperties = {
  position: 'relative',
  flex: '1',
  minWidth: '220px',
};

export const STILE_ELENCO_SUGGERIMENTI: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  zIndex: 20,
  background: 'var(--color-bg)',
  border: '2px solid var(--color-divider)',
  boxShadow: 'var(--shadow-md)',
  maxHeight: '200px',
  overflowY: 'auto',
};

export const STILE_VOCE_SUGGERIMENTO: CSSProperties = {
  padding: '8px 10px',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--space-3)',
  fontSize: '13.5px',
  borderBottom: '1px solid var(--color-divider)',
};

export const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-2)',
  alignItems: 'center',
};

export const STILE_ERRORE_CAMPO: CSSProperties = {
  color: 'var(--rosso)',
  fontSize: '0.85rem',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_MESSAGGIO_SUCCESSO: CSSProperties = {
  color: 'var(--verde)',
};

export const STILE_FORM_CATEGORIA: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  border: '1px solid var(--color-divider)',
  padding: 'var(--space-4)',
  maxWidth: '420px',
};

export const STILE_GRUPPO_RADIO: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
};

export const STILE_RIGA_FILTRI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-3)',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
};

export const STILE_RIGA_TOTALI: CSSProperties = {
  display: 'flex',
  gap: 'var(--space-6)',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  padding: 'var(--space-3) 0',
  borderTop: '2px solid var(--color-divider)',
  borderBottom: '2px solid var(--color-divider)',
  fontSize: '14px',
};

export const STILE_VALORE_TOTALE: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
};

export const STILE_CELLA_DESTRA: CSSProperties = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

export const STILE_IMPORTO_RIGA: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
};

export const STILE_FORM_MODIFICA: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--space-3)',
  alignItems: 'flex-end',
  padding: 'var(--space-3)',
  background: 'var(--color-surface)',
};
