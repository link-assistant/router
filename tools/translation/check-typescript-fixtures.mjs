#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateSource } from './translate.mjs';
import { hostRuntimeAssets } from './host-assets.mjs';
import { effectRuntimeAssets } from './effect-assets.mjs';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/portable-cases.json', import.meta.url)));
export function checkTypeScriptFixtures(cases = fixtures, { compiler = process.env.ROUTER_TRANSLATION_TSC } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'router-forward-typescript-'));
  try {
    writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
    mkdirSync(join(directory, 'runtime'));
    const assets = hostRuntimeAssets(), effects = effectRuntimeAssets();
    assets.set('effects.mjs', effects.javascript); assets.set('effects.d.mts', effects.declarations);
    for (const [path, content] of assets) writeFileSync(join(directory, 'runtime', path), content);
    const files = cases.map((fixture, index) => {
      const path = join(directory, `fixture-${index}.ts`);
      writeFileSync(path, translateSource(fixture.source).typescript);
      return path;
    });
    let command = compiler, prefix = [];
    if (!command) {
      try {
        const require = createRequire(new URL('../../packages/javascript/package.json', import.meta.url));
        prefix = [require.resolve('typescript/bin/tsc')]; command = process.execPath;
      } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; command = 'tsc'; }
    }
    const result = spawnSync(command, [...prefix, '--strict', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--skipLibCheck', ...files], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    if (result.error) throw new Error(`TypeScript compiler unavailable: ${result.error.message}; install the repository TypeScript tooling or set ROUTER_TRANSLATION_TSC`);
    return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr, modules: files.length };
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkTypeScriptFixtures();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exitCode = result.status;
  else console.log(`Strict TypeScript passed for ${result.modules} independent executable fixture modules`);
}
