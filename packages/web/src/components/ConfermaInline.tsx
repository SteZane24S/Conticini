import type { CSSProperties } from 'react';

const STILE_AZIONI: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

export interface ConfermaInlineProps {
  domanda: string;
  onConferma: () => void;
  onAnnulla: () => void;
}

export function ConfermaInline({
  domanda,
  onConferma,
  onAnnulla,
}: ConfermaInlineProps) {
  return (
    <span style={STILE_AZIONI}>
      <span>{domanda}</span>
      <button type="button" onClick={onConferma}>
        Sì
      </button>
      <button type="button" onClick={onAnnulla}>
        Annulla
      </button>
    </span>
  );
}
