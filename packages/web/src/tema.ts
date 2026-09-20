export type Tema = 'chiaro' | 'scuro';

const chiaveTema = 'conticini:tema';

function applicaTema(tema: Tema): void {
  document.documentElement.dataset.theme = tema === 'scuro' ? 'dark' : 'light';
}

export function applicaTemaSalvato(): void {
  const temaSalvato = localStorage.getItem(chiaveTema);
  const tema =
    temaSalvato === 'chiaro' || temaSalvato === 'scuro'
      ? temaSalvato
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'scuro'
        : 'chiaro';

  applicaTema(tema);
}

export function leggiTema(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'scuro' : 'chiaro';
}

export function impostaTema(tema: Tema): void {
  applicaTema(tema);
  localStorage.setItem(chiaveTema, tema);
}
