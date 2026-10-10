import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { repository, temporary } from './helpers.mjs';

const run = script => new Promise(resolve => {
  execFile(process.execPath, [script, '--strict'], { timeout: 15_000, maxBuffer: 1_048_576 }, (error, stdout, stderr) => resolve({ status: error ? error.code : 0, output: stdout + stderr }));
});
async function isolatedChecker(t, edit) {
  const directory = await temporary(t);
  await mkdir(join(directory, 'scripts'));
  await mkdir(join(directory, 'parity'));
  // Mirror references by symlink, keeping only the edited proof inputs local.
  // No source checkout or generated inventory is copied or modified.
  for (const name of await readdir(repository)) {
    if (['scripts', 'parity', 'packages'].includes(name) || name.startsWith('.') && name !== '.git') continue;
    await symlink(join(repository, name), join(directory, name));
  }
  for (const name of await readdir(join(repository, 'scripts'))) if (name !== 'check-router-parity.mjs') await symlink(join(repository, 'scripts', name), join(directory, 'scripts', name));
  for (const name of await readdir(join(repository, 'parity'))) if (name !== 'router-features.json') await symlink(join(repository, 'parity', name), join(directory, 'parity', name));
  await mkdir(join(directory, 'packages/javascript/native'), { recursive: true });
  for (const name of await readdir(join(repository, 'packages'))) if (name !== 'javascript') await symlink(join(repository, 'packages', name), join(directory, 'packages', name));
  for (const name of await readdir(join(repository, 'packages/javascript'))) if (name !== 'native') await symlink(join(repository, 'packages/javascript', name), join(directory, 'packages/javascript', name));
  for (const name of await readdir(join(repository, 'packages/javascript/native'))) if (name !== 'operations.mjs') await symlink(join(repository, 'packages/javascript/native', name), join(directory, 'packages/javascript/native', name));
  await writeFile(join(directory, 'packages/javascript/native/operations.mjs'), await readFile(join(repository, 'packages/javascript/native/operations.mjs')));
  await writeFile(join(directory, 'scripts/check-router-parity.mjs'), await readFile(join(repository, 'scripts/check-router-parity.mjs')));
  const manifest = JSON.parse(await readFile(join(repository, 'parity/router-features.json')));
  await edit(manifest, directory);
  await writeFile(join(directory, 'parity/router-features.json'), JSON.stringify(manifest));
  return run(join(directory, 'scripts/check-router-parity.mjs'));
}

test('strict parity rejects a draft even when a superficial fixture runner claims green', async t => {
  const result = await isolatedChecker(t, async (manifest, directory) => {
    const observations = [];
    for (const feature of manifest.features) {
      const id = `stub:${feature.id}`;
      observations.push([id, { operation: feature.operation, success: feature.status !== 'unsupported' }]);
      feature.evidence = [{ file: 'parity/stub.mjs', fixture: id }];
    }
    // Deliberately no router execution: this cannot unlock the full-parity gate.
    await writeFile(join(directory, 'parity/stub.mjs'), `export async function runParityFixtures() { return new Map(${JSON.stringify(observations)}); }\n`);
  });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Strict native parity failed/);
});

test('promoting partial operation statuses without implementation changes cannot unlock strict parity', async t => {
  const result = await isolatedChecker(t, async manifest => {
    for (const feature of manifest.features) { feature.status = 'implemented'; feature.gaps = []; }
  });
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Dispatcher support status disagrees/);
});

test('even green evidence for every operation cannot unlock uncovered HTTP routes or carried translations', async t => {
  const result = await isolatedChecker(t, async (manifest, directory) => {
    const support = {}, evidence = [];
    for (const feature of manifest.features.filter(feature => feature.operation)) {
      support[feature.operation] = 'implemented';
      feature.status = 'implemented';
      feature.gaps = [];
      const fixture = `synthetic-covered:${feature.operation}`;
      feature.evidence = [{ file: 'parity/covered-operations.mjs', fixture }];
      evidence.push([fixture, { operation: feature.operation, success: true }]);
    }
    await writeFile(join(directory, 'packages/javascript/native/operations.mjs'), `export const nativeOperationSupport = ${JSON.stringify(support)};\n`);
    await writeFile(join(directory, 'parity/covered-operations.mjs'), `export async function runOperationFixtures() { return new Map(${JSON.stringify(evidence)}); }\n`);
  });
  assert.equal(result.status, 1, 'A catalog-only proof must not authorize full router parity: ' + result.output);
  assert.match(result.output, /carried/i);
  assert.match(result.output, /route/i);
});
