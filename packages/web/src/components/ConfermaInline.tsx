import type { CSSProperties } from 'react';

import { Bottone } from './Bottone.js';

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
      <Bottone variante="primaria" onClick={onConferma}>
        Sì
      </Bottone>
      <Bottone variante="secondaria" onClick={onAnnulla}>
        Annulla
      </Bottone>
    </span>
  );
}
