export interface Env {
  dataDir: string;
  port: number;
  idleMinutes: number;
  dev: boolean;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const dataDir = source.CONTICINI_DATA_DIR;
  if (!dataDir) {
    throw new Error('CONTICINI_DATA_DIR è obbligatoria');
  }

  return {
    dataDir,
    port: source.CONTICINI_PORT ? Number(source.CONTICINI_PORT) : 47300,
    idleMinutes: source.CONTICINI_IDLE_MINUTES
      ? Number(source.CONTICINI_IDLE_MINUTES)
      : 10,
    dev: source.CONTICINI_DEV === '1',
  };
}
