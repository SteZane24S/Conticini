import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface DialogoProps {
  aperto: boolean;
  titolo: string;
  onChiudi: () => void;
  azioni?: ReactNode;
  children?: ReactNode;
}

export function Dialogo({
  aperto,
  titolo,
  onChiudi,
  azioni,
  children,
}: DialogoProps) {
  useEffect(() => {
    if (!aperto) {
      return undefined;
    }

    const gestisciTasto = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onChiudi();
      }
    };

    document.addEventListener('keydown', gestisciTasto);

    return () => {
      document.removeEventListener('keydown', gestisciTasto);
    };
  }, [aperto, onChiudi]);

  if (!aperto) {
    return null;
  }

  return (
    <div className="dialog-backdrop" onClick={onChiudi}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-title">{titolo}</div>
        <div className="dialog-body">{children}</div>
        {azioni ? <div className="dialog-actions">{azioni}</div> : null}
      </div>
    </div>
  );
}
