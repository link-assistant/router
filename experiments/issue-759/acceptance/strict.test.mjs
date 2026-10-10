import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
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
  for (const path of ['packages', 'docs', 'src', 'tools']) await symlink(join(repository, path), join(directory, path), 'dir');
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
