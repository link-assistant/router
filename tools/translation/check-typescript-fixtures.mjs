#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { translateSource } from './translate.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/portable-cases.json', import.meta.url)));
const directory = mkdtempSync(join(tmpdir(), 'router-forward-typescript-'));
try {
  const files = fixtures.map((fixture, index) => {
    const path = join(directory, `fixture-${index}.ts`);
    writeFileSync(path, translateSource(fixture.source).typescript);
    return path;
  });
  const compiler = process.env.ROUTER_TRANSLATION_TSC ?? 'tsc';
  const result = spawnSync(compiler, ['--strict', '--noEmit', '--target', 'ES2022', '--module', 'ESNext', '--skipLibCheck', ...files], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.error) throw new Error(`TypeScript compiler unavailable: ${result.error.message}; install the repository TypeScript tooling or set ROUTER_TRANSLATION_TSC`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else console.log(`Strict TypeScript passed for ${files.length} independent executable fixture modules`);
} finally { rmSync(directory, { recursive: true, force: true }); }
