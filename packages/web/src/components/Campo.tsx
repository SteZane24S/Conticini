import type { ReactNode } from 'react';

export interface CampoProps {
  etichetta: string;
  idCampo: string;
  children: ReactNode;
  errore?: string;
}

export function Campo({ etichetta, idCampo, children, errore }: CampoProps) {
  return (
    <div className="field">
      <label htmlFor={idCampo}>{etichetta}</label>
      {children}
      {errore ? <span>{errore}</span> : null}
    </div>
  );
}
