import type { ReactNode } from 'react';

export interface EtichettaProps {
  variante?: 'accent' | 'accent2' | 'neutral' | 'outline';
  children: ReactNode;
}

const CLASSI_VARIANTE = {
  accent: 'tag-accent',
  accent2: 'tag-accent-2',
  neutral: 'tag-neutral',
  outline: 'tag-outline',
};

export function Etichetta({ variante = 'neutral', children }: EtichettaProps) {
  return <span className={`tag ${CLASSI_VARIANTE[variante]}`}>{children}</span>;
}
