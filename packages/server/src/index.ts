import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildApp } from './app.js';
import { openDatabase } from './database.js';
import { loadEnv } from './env.js';
import { ensureMeta } from './meta.js';
import { runMigrations } from './migrations-runner.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export type InstanceStatus = 'free' | 'conticini' | 'occupied';

export async function checkExistingInstance(
  port: number,
  fetchImpl: typeof fetch = fetch,
): Promise<InstanceStatus> {
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/api/salute`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return 'occupied';
    const body = (await response.json()) as {
      ok?: unknown;
      versione?: unknown;
    };
    return body.ok === true && typeof body.versione === 'string'
      ? 'conticini'
      : 'occupied';
  } catch (error) {
    const cause =
      error instanceof Error
        ? (error.cause as NodeJS.ErrnoException | undefined)
        : undefined;
    if (cause?.code === 'ECONNREFUSED') return 'free';
    return 'occupied';
  }
}

function readVersione(): string {
  const packageJsonPath = path.join(currentDir, '../package.json');
  const raw = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    version: string;
  };
  return raw.version;
}

async function main(): Promise<void> {
  const env = loadEnv();

  const status = await checkExistingInstance(env.port);
  if (status === 'conticini') {
    console.log(`Istanza Conticini già in esecuzione sulla porta ${env.port}.`);
    process.exit(0);
  }
  if (status === 'occupied') {
    console.error(
      `Porta ${env.port} occupata da un processo che non è Conticini.`,
    );
    process.exit(1);
  }

  const db = openDatabase(env.dataDir);
  runMigrations(db);
  const meta = ensureMeta(db);

  const { app, getLastHeartbeatMs } = buildApp({
    port: env.port,
    datasetId: meta.datasetId,
    db,
    deviceId: meta.deviceId,
    versione: readVersione(),
    webDistPath: path.join(currentDir, '../../web/dist'),
  });

  if (!env.dev) {
    setInterval(() => {
      const idleMs = Date.now() - getLastHeartbeatMs();
      if (idleMs > env.idleMinutes * 60_000) {
        void app
          .close()
          .then(() => process.exit(0))
          .catch((err: unknown) => {
            console.error(err);
            process.exit(1);
          });
      }
    }, 60_000).unref();
  }

  await app.listen({ host: '127.0.0.1', port: env.port });
}

function isMainModule(): boolean {
  if (process.argv[1] === undefined) return false;
  const invoked = pathToFileURL(process.argv[1]).href;
  if (process.platform === 'win32') {
    return import.meta.url.toLowerCase() === invoked.toLowerCase();
  }
  return import.meta.url === invoked;
}

if (isMainModule()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
