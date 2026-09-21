import type { FastifyInstance } from 'fastify';
import type {
  MotivoMovimentoAnterioreApertura,
  MotivoSaldamentoNonValido,
  MotivoSegnoNonCoerente,
  MotivoTrasferimentoNonValido,
  MotivoVincoloPrevisioneFissa,
} from '@conticini/dominio';

export class ErroreApi extends Error {
  readonly status: number;
  readonly codice: string;
  readonly campo?: string;

  constructor(
    status: number,
    codice: string,
    messaggio: string,
    campo?: string,
  ) {
    super(messaggio);
    this.name = 'ErroreApi';
    this.status = status;
    this.codice = codice;
    this.campo = campo;
  }
}

type MotivoDominio =
  | MotivoTrasferimentoNonValido
  | MotivoSegnoNonCoerente
  | MotivoMovimentoAnterioreApertura
  | MotivoSaldamentoNonValido
  | MotivoVincoloPrevisioneFissa;

const MESSAGGI_DOMINIO: Record<MotivoDominio, string> = {
  numero_movimenti: 'Un trasferimento richiede esattamente due movimenti.',
  stesso_conto: 'Le due gambe del trasferimento devono avere conti diversi.',
  date_diverse: 'Le due gambe del trasferimento devono avere la stessa data.',
  importi_non_opposti:
    'Gli importi delle due gambe del trasferimento devono essere opposti.',
  categoria_non_nulla: 'Un trasferimento non può avere una categoria.',
  segno_non_coerente:
    "Il segno dell'importo non è coerente con il tipo della categoria.",
  movimento_anteriore_apertura:
    'La data del movimento è precedente alla data di apertura del conto.',
  previsione_e_fissa_su_stessa_categoria:
    'Una categoria con previsione non può avere spese fisse attive, e viceversa.',
  importo_non_positivo: "L'importo del saldamento deve essere positivo.",
  importo_supera_residuo:
    "L'importo del saldamento supera il residuo della posizione.",
};

export function erroreNonTrovato(entita: string, id: string): ErroreApi {
  return new ErroreApi(404, 'non_trovato', `${entita} non trovato: ${id}`);
}

export function erroreNomeDuplicato(campo: string, valore: string): ErroreApi {
  return new ErroreApi(
    409,
    'nome_duplicato',
    `Esiste già un elemento con questo nome: ${valore}`,
    campo,
  );
}

export function erroreSettoreConCategorie(id: string): ErroreApi {
  return new ErroreApi(
    409,
    'settore_con_categorie',
    `Il settore ha categorie attive: elimina prima le categorie. (${id})`,
  );
}

export function erroreBackupNonValido(messaggio: string): ErroreApi {
  return new ErroreApi(400, 'backup_non_valido', messaggio);
}

export function erroreCategoriaTecnica(campo?: string): ErroreApi {
  return new ErroreApi(
    422,
    'categoria_tecnica',
    'Questa categoria è riservata al sistema e non è selezionabile.',
    campo,
  );
}

export function erroreCategoriaTecnicaProtetta(): ErroreApi {
  return new ErroreApi(
    409,
    'categoria_tecnica_protetta',
    'Questa categoria è riservata al sistema: non si rinomina né si elimina.',
  );
}

export function erroreMovimentoDiSaldamento(): ErroreApi {
  return new ErroreApi(
    422,
    'movimento_di_saldamento',
    'Questo movimento è un saldamento: annullalo dalla pagina Debiti e crediti.',
  );
}

export function erroreEliminazionePosizioneConSaldamenti(
  id: string,
): ErroreApi {
  return new ErroreApi(
    409,
    'posizione_con_saldamenti',
    `La posizione ha saldamenti collegati: non si può eliminare. (${id})`,
  );
}

export function erroreSaldamentoInConflitto(): ErroreApi {
  return new ErroreApi(
    409,
    'saldamento_in_conflitto',
    'Questo operazioneId è già stato usato per un saldamento con dati diversi.',
    'operazioneId',
  );
}

export function erroreDominio(
  motivo: MotivoDominio,
  campo?: string,
): ErroreApi {
  return new ErroreApi(
    422,
    motivo,
    MESSAGGI_DOMINIO[motivo] ?? 'Regola di dominio non rispettata.',
    campo,
  );
}

export function erroreValidazione(
  messaggio: string,
  campo?: string,
): ErroreApi {
  return new ErroreApi(400, 'richiesta_non_valida', messaggio, campo);
}

export function registraGestoreErrori(app: FastifyInstance): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ErroreApi) {
      reply.code(error.status).send({
        ok: false,
        errore: {
          codice: error.codice,
          messaggio: error.message,
          ...(error.campo !== undefined ? { campo: error.campo } : {}),
        },
      });
      return;
    }
    app.log.error(error);
    reply.code(500).send({
      ok: false,
      errore: {
        codice: 'errore_interno',
        messaggio: 'Errore interno del server.',
      },
    });
  });
}
