import type { ReactNode } from 'react';

export interface SchedaProps {
  kicker?: string;
  titolo?: string;
  meta?: ReactNode;
  elevazione?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

export function Scheda({
  kicker,
  titolo,
  meta,
  elevazione,
  children,
}: SchedaProps) {
  const className = ['card', elevazione ? `elev-${elevazione}` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {kicker ? <div className="card-kicker">{kicker}</div> : null}
      {titolo ? <div className="card-title">{titolo}</div> : null}
      {children ? <div className="card-body">{children}</div> : null}
      {meta ? <div className="card-meta">{meta}</div> : null}
    </div>
  );
}
