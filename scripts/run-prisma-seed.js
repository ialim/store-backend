#!/usr/bin/env node
/**
 * Runs the Prisma seed using the compiled JS output when available
 * (e.g. in production Docker images) and falls back to ts-node for
 * local development where only the TypeScript source exists.
 */
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const distSeed = resolve(__dirname, '..', 'dist', 'prisma', 'seed.js');
const tsSeed = resolve(__dirname, '..', 'prisma', 'seed.ts');

function runNode(path) {
  const result = spawnSync(process.execPath, [path], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 0;
}

function runTsNode(path) {
  const tsNodeBin =
    process.platform === 'win32'
      ? 'ts-node.cmd'
      : 'ts-node';
  const tsNodePath = join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    tsNodeBin,
  );

  const command = existsSync(tsNodePath) ? tsNodePath : 'ts-node';
  const result = spawnSync(command, [path], {
    stdio: 'inherit',
    env: process.env,
    shell: !existsSync(tsNodePath),
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 0;
}

(async () => {
  if (existsSync(distSeed)) {
    process.exitCode = runNode(distSeed);
    return;
  }

  if (!existsSync(tsSeed)) {
    console.error('[prisma:seed] Could not find seed script.');
    process.exitCode = 1;
    return;
  }

  process.exitCode = runTsNode(tsSeed);
})();
