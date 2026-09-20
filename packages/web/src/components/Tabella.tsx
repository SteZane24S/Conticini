import type { TableHTMLAttributes } from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TabellaProps extends TableHTMLAttributes<HTMLTableElement> {}

export function Tabella({ className, children, ...resto }: TabellaProps) {
  return (
    <table className={`table ${className ?? ''}`.trim()} {...resto}>
      {children}
    </table>
  );
}
