import type { ButtonHTMLAttributes } from 'react';

export interface BottoneProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primaria' | 'secondaria' | 'ghost' | 'icona';
  blocco?: boolean;
}

const CLASSI_VARIANTE = {
  primaria: 'btn-primary',
  secondaria: 'btn-secondary',
  ghost: 'btn-ghost',
  icona: 'btn-icon',
};

export function Bottone({
  variante = 'secondaria',
  blocco = false,
  className,
  type = 'button',
  ...resto
}: BottoneProps) {
  const classi = ['btn', CLASSI_VARIANTE[variante]];

  if (blocco) {
    classi.push('btn-block');
  }

  if (className) {
    classi.push(className);
  }

  return <button className={classi.join(' ')} type={type} {...resto} />;
}
