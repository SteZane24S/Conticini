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

export const STILE_CAMPO_DATA: CSSProperties = {
  maxWidth: '200px',
};

export const STILE_ERRORE_GENERALE: CSSProperties = {
  color: 'var(--rosso)',
};

export const STILE_AVVISO: CSSProperties = {
  border: '2px solid var(--color-accent)',
  padding: 'var(--space-4)',
  display: 'flex',
  gap: 'var(--space-4)',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

export const STILE_AVVISO_TITOLO: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '17px',
  marginBottom: '4px',
};

export const STILE_AVVISO_TESTO: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '14px',
  flex: 1,
  minWidth: '220px',
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

export const STILE_RIGA_NUMERO: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 'var(--space-4)',
  margin: 'var(--space-3) 0 0',
  flexWrap: 'wrap',
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

export const STILE_NOTA_ATTENUATA: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '13.5px',
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

export const STILE_VALORE_CARD: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontSize: '26px',
  fontVariantNumeric: 'tabular-nums',
  marginTop: 'var(--space-2)',
};

export const STILE_GRID_SEZIONI: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.5fr)',
  gap: 'var(--space-8)',
};

export const STILE_TITOLO_SEZIONE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  borderBottom: '2px solid var(--color-divider)',
  paddingBottom: 'var(--space-2)',
};

export const STILE_RIGA_FISSA: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  padding: '11px var(--space-2) 11px 0',
  borderBottom: '1px solid var(--color-divider)',
};

export const STILE_RIGA_FISSA_ARRETRATA: CSSProperties = {
  background: 'var(--rosso-bg)',
};

export const STILE_NOME_FISSA: CSSProperties = {
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
};

export const STILE_META_FISSA: CSSProperties = {
  fontSize: '12px',
  color: 'var(--muted)',
  marginTop: '3px',
};

export const STILE_IMPORTO_FISSA: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  fontSize: '16px',
  paddingRight: 'var(--space-2)',
};

export const STILE_CELLA_DESTRA: CSSProperties = {
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

export const STILE_BARRA_CONTENITORE: CSSProperties = {
  height: '6px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-divider)',
  marginTop: '7px',
};

export function stileBarraRiempimento(
  percentuale: number,
  sforato: boolean,
): CSSProperties {
  return {
    height: '100%',
    width: `${Math.min(100, Math.max(0, percentuale))}%`,
    background: sforato ? 'var(--rosso)' : 'var(--verde)',
  };
}
