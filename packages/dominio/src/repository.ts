import { type Conto, type Movimento } from './saldi.js';
import { type Ciclo } from './cicli.js';
import { type Posizione } from './posizioni.js';
import {
  type OccorrenzaFissa,
  type BudgetDefault,
  type BudgetOverride,
} from './prospetto.js';
import { type RegolaRicorrenza } from './ricorrenze.js';
import { type Categoria } from './validazioni.js';
import {
  type RegolaCategoria,
  type SuggerimentoDescrizione,
} from './regole.js';

export interface Settore {
  id: string;
  nome: string;
}

export interface ContoConDettagli extends Conto {
  nome: string;
  archiviato: boolean;
}

export interface CategoriaConDettagli extends Categoria {
  nome: string;
  settoreId: string;
}

export interface MovimentoConDettagli extends Movimento {
  descrizione: string;
  descrizioneNorm: string;
}

export interface CicloConDettagli extends Ciclo {
  salaryTransactionId: string;
}

export interface RicorrenzaFissa {
  id: string;
  nome: string;
  regola: RegolaRicorrenza;
  amountCents: number;
  contoId: string;
  categoriaId: string;
  mode: 'auto' | 'manual';
  active: boolean;
}

export interface OccorrenzaFissaConDettagli extends OccorrenzaFissa {
  ricorrenzaId: string;
  periodo: string;
}

export interface RepositorioConti {
  elenca(): Promise<ContoConDettagli[]>;
  ottieni(id: string): Promise<ContoConDettagli | null>;
  crea(dati: Omit<ContoConDettagli, 'id'>): Promise<ContoConDettagli>;
  aggiorna(
    id: string,
    dati: Partial<Omit<ContoConDettagli, 'id'>>,
  ): Promise<ContoConDettagli>;
  archivia(id: string): Promise<void>;
}

export interface RepositorioSettori {
  elenca(): Promise<Settore[]>;
  ottieni(id: string): Promise<Settore | null>;
  crea(dati: Omit<Settore, 'id'>): Promise<Settore>;
  aggiorna(id: string, dati: Partial<Omit<Settore, 'id'>>): Promise<Settore>;
  elimina(id: string): Promise<void>;
}

export interface RepositorioCategorie {
  elenca(): Promise<CategoriaConDettagli[]>;
  ottieni(id: string): Promise<CategoriaConDettagli | null>;
  crea(dati: Omit<CategoriaConDettagli, 'id'>): Promise<CategoriaConDettagli>;
  aggiorna(
    id: string,
    dati: Partial<Omit<CategoriaConDettagli, 'id'>>,
  ): Promise<CategoriaConDettagli>;
  elimina(id: string): Promise<void>;
}

export interface RepositorioMovimenti {
  elenca(): Promise<MovimentoConDettagli[]>;
  ottieni(id: string): Promise<MovimentoConDettagli | null>;
  crea(dati: Omit<MovimentoConDettagli, 'id'>): Promise<MovimentoConDettagli>;
  aggiorna(
    id: string,
    dati: Partial<Omit<MovimentoConDettagli, 'id'>>,
  ): Promise<MovimentoConDettagli>;
  elimina(id: string): Promise<void>;
}

export interface RepositorioCicli {
  elenca(): Promise<CicloConDettagli[]>;
  ottieni(id: string): Promise<CicloConDettagli | null>;
  crea(dati: Omit<CicloConDettagli, 'id'>): Promise<CicloConDettagli>;
  aggiorna(
    id: string,
    dati: Partial<Omit<CicloConDettagli, 'id'>>,
  ): Promise<CicloConDettagli>;
}

export interface RepositorioRicorrenzeFisse {
  elenca(): Promise<RicorrenzaFissa[]>;
  ottieni(id: string): Promise<RicorrenzaFissa | null>;
  crea(dati: Omit<RicorrenzaFissa, 'id'>): Promise<RicorrenzaFissa>;
  aggiorna(
    id: string,
    dati: Partial<Omit<RicorrenzaFissa, 'id'>>,
  ): Promise<RicorrenzaFissa>;
  elimina(id: string): Promise<void>;
}

export interface RepositorioOccorrenzeFisse {
  elenca(): Promise<OccorrenzaFissaConDettagli[]>;
  ottieni(id: string): Promise<OccorrenzaFissaConDettagli | null>;
  aggiorna(
    id: string,
    dati: Partial<Omit<OccorrenzaFissaConDettagli, 'id'>>,
  ): Promise<OccorrenzaFissaConDettagli>;
}

export interface RepositorioBudgetDefault {
  elenca(): Promise<BudgetDefault[]>;
  imposta(dati: BudgetDefault): Promise<BudgetDefault>;
  elimina(categoriaId: string): Promise<void>;
}

export interface RepositorioBudgetOverride {
  elenca(cicloId: string): Promise<BudgetOverride[]>;
  imposta(dati: BudgetOverride): Promise<BudgetOverride>;
}

export interface RepositorioRegoleCategoria {
  elenca(): Promise<RegolaCategoria[]>;
  ottieni(id: string): Promise<RegolaCategoria | null>;
  crea(
    dati: Omit<RegolaCategoria, 'id' | 'deletedAt' | 'createdAt'>,
  ): Promise<RegolaCategoria>;
  aggiorna(
    id: string,
    dati: Partial<Omit<RegolaCategoria, 'id' | 'deletedAt' | 'createdAt'>>,
  ): Promise<RegolaCategoria>;
  elimina(id: string): Promise<void>;
}

export interface PosizioneConResiduo extends Posizione {
  residuoCents: number;
}

export interface RepositorioPosizioni {
  elenca(): Promise<PosizioneConResiduo[]>;
  ottieni(id: string): Promise<PosizioneConResiduo | null>;
  crea(
    dati: Omit<Posizione, 'id' | 'dataApertura'>,
  ): Promise<PosizioneConResiduo>;
  aggiorna(
    id: string,
    dati: Partial<Pick<Posizione, 'descrizione'>>,
  ): Promise<PosizioneConResiduo>;
  elimina(id: string): Promise<void>;
}

export interface ServizioApprendimento {
  suggerisciCategoria(descrizione: string): Promise<string | null>;
  suggerimentiDescrizione(
    prefisso: string,
    limite: number,
  ): Promise<SuggerimentoDescrizione[]>;
}
