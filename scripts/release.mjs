import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

function generaIcona(percorso) {
  const size = 32;
  const rowSize = size * 4;
  const pixelDataSize = rowSize * size;
  const andMaskRowBytes = 4; // (32/8) già allineato a 4 byte
  const andMaskSize = andMaskRowBytes * size;
  const imageSize = 40 + pixelDataSize + andMaskSize;

  const buffer = Buffer.alloc(6 + 16 + imageSize);
  let offset = 0;

  buffer.writeUInt16LE(0, offset);
  offset += 2;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt16LE(1, offset);
  offset += 2;

  buffer.writeUInt8(size, offset);
  offset += 1;
  buffer.writeUInt8(size, offset);
  offset += 1;
  buffer.writeUInt8(0, offset);
  offset += 1;
  buffer.writeUInt8(0, offset);
  offset += 1;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt16LE(32, offset);
  offset += 2;
  buffer.writeUInt32LE(imageSize, offset);
  offset += 4;
  buffer.writeUInt32LE(22, offset);
  offset += 4;

  buffer.writeUInt32LE(40, offset);
  offset += 4;
  buffer.writeInt32LE(size, offset);
  offset += 4;
  buffer.writeInt32LE(size * 2, offset);
  offset += 4;
  buffer.writeUInt16LE(1, offset);
  offset += 2;
  buffer.writeUInt16LE(32, offset);
  offset += 2;
  buffer.writeUInt32LE(0, offset);
  offset += 4;
  buffer.writeUInt32LE(pixelDataSize, offset);
  offset += 4;
  buffer.writeInt32LE(0, offset);
  offset += 4;
  buffer.writeInt32LE(0, offset);
  offset += 4;
  buffer.writeUInt32LE(0, offset);
  offset += 4;
  buffer.writeUInt32LE(0, offset);
  offset += 4;

  const r = 0x2f;
  const g = 0x6f;
  const b = 0xd6;
  for (let i = 0; i < size * size; i++) {
    buffer.writeUInt8(b, offset);
    offset += 1;
    buffer.writeUInt8(g, offset);
    offset += 1;
    buffer.writeUInt8(r, offset);
    offset += 1;
    buffer.writeUInt8(0xff, offset);
    offset += 1;
  }
  // maschera AND: resta a zero, già azzerata da Buffer.alloc

  writeFileSync(percorso, buffer);
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.join(scriptDir, '..');

  console.log('\n[release] Build');
  function eseguiNpm(args) {
    if (process.platform === 'win32') {
      execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build'], {
        cwd: repoRoot,
        stdio: 'inherit',
      });
      return;
    }

    execFileSync('npm', args, { cwd: repoRoot, stdio: 'inherit' });
  }

  eseguiNpm(['run', 'build']);

  if (!existsSync(path.join(repoRoot, 'packages/web/dist'))) {
    throw new Error('La build web non ha prodotto packages/web/dist.');
  }

  console.log('\n[release] Calcolo percorsi');
  const conticiniRoot = path.join(repoRoot, '..');
  const appRoot = path.join(conticiniRoot, 'app');
  const programmaRoot = path.join(appRoot, 'programma');
  const serverRoot = path.join(programmaRoot, 'server');
  const distDir = path.join(serverRoot, 'dist');
  const serverNodeModules = path.join(serverRoot, 'node_modules');
  const webDistSrc = path.join(repoRoot, 'packages/web/dist');
  const webDistDest = path.join(programmaRoot, 'web', 'dist');
  const rootNodeModules = path.join(repoRoot, 'node_modules');

  console.log('\n[release] Pulizia');
  rmSync(programmaRoot, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  mkdirSync(serverNodeModules, { recursive: true });

  console.log('\n[release] Bundle server');
  await esbuild.build({
    entryPoints: [path.join(repoRoot, 'packages/server/src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: path.join(distDir, 'server.mjs'),
    external: ['better-sqlite3'],
    banner: {
      js: "import { createRequire as __conticiniCreateRequire } from 'node:module'; const require = __conticiniCreateRequire(import.meta.url);",
    },
    logLevel: 'info',
  });

  console.log('\n[release] Package bundle');
  const packageServer = JSON.parse(
    readFileSync(path.join(repoRoot, 'packages/server/package.json'), 'utf8'),
  );
  writeFileSync(
    path.join(serverRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'conticini-server-bundle',
        version: packageServer.version,
        type: 'module',
      },
      null,
      2,
    ) + '\n',
  );

  console.log('\n[release] Migrazioni');
  cpSync(
    path.join(repoRoot, 'packages/server/migrations'),
    path.join(serverRoot, 'migrations'),
    { recursive: true },
  );

  function copiaMinimoPacchetto(nome, fileRelativi) {
    const sorgente = path.join(rootNodeModules, nome);
    const destinazione = path.join(serverNodeModules, nome);

    if (!existsSync(sorgente)) {
      throw new Error(`Pacchetto richiesto non trovato: ${sorgente}`);
    }

    if (fileRelativi) {
      for (const fileRelativo of fileRelativi) {
        const origineFile = path.join(sorgente, fileRelativo);
        const destinazioneFile = path.join(destinazione, fileRelativo);
        mkdirSync(path.dirname(destinazioneFile), { recursive: true });
        cpSync(origineFile, destinazioneFile, { recursive: true });
      }
      return;
    }

    cpSync(sorgente, destinazione, { recursive: true });
  }

  console.log('\n[release] Moduli nativi');
  // better-sqlite3 resta esterno: include un binario nativo richiesto a runtime.
  copiaMinimoPacchetto('better-sqlite3', [
    'package.json',
    'lib',
    'build/Release/better_sqlite3.node',
  ]);
  copiaMinimoPacchetto('bindings');
  copiaMinimoPacchetto('file-uri-to-path');

  console.log('\n[release] Web dist');
  mkdirSync(path.dirname(webDistDest), { recursive: true });
  cpSync(webDistSrc, webDistDest, { recursive: true });

  console.log('\n[release] Launcher');
  writeFileSync(
    path.join(appRoot, 'Conticini.vbs'),
    readFileSync(path.join(scriptDir, 'launcher.vbs.template'), 'utf8'),
  );

  console.log('\n[release] Icona segnaposto');
  generaIcona(path.join(appRoot, 'Conticini.ico'));

  if (process.argv.includes('--collegamento')) {
    console.log('\n[release] Collegamento desktop');
    creaCollegamentoDesktop();
  }

  function creaCollegamentoDesktop() {
    const contenuto = [
      'Set fso = CreateObject("Scripting.FileSystemObject")',
      'Set shell = CreateObject("WScript.Shell")',
      'desktop = shell.SpecialFolders("Desktop")',
      'Set collegamento = shell.CreateShortcut(desktop & "\\Conticini.lnk")',
      `collegamento.TargetPath = "${appRoot}\\Conticini.vbs"`,
      `collegamento.WorkingDirectory = "${appRoot}"`,
      `collegamento.IconLocation = "${appRoot}\\Conticini.ico"`,
      'collegamento.WindowStyle = 1',
      'collegamento.Save',
    ].join('\r\n');
    const tmp = path.join(programmaRoot, '_crea-collegamento.vbs');
    writeFileSync(tmp, contenuto);
    try {
      execFileSync('cscript.exe', ['//nologo', tmp], { stdio: 'inherit' });
    } finally {
      rmSync(tmp, { force: true });
    }
  }

  console.log('\n[release] Rilascio completato in ' + programmaRoot);
}

main().catch((errore) => {
  console.error('\n[release] Errore:', errore);
  process.exit(1);
});
