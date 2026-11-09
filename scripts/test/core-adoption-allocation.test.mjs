import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('complete source-adoption accounting freshly observes files and preserves every bound', {timeout: 10000}, () => {
  const fixture = fileURLToPath(new URL('./fixtures/core-adoption-allocation.py', import.meta.url));
  const controller = fileURLToPath(new URL('../propose-core-adoption.py', import.meta.url));
  const child = spawnSync('python3', ['-B', fixture, controller], {
    encoding: 'utf8', timeout: 8000, maxBuffer: 1024 * 1024,
  });
  assert.equal(child.signal, null, child.stderr);
  assert.equal(child.status, 0, child.stderr);
  const receipt = JSON.parse(child.stdout);
  assert.equal(receipt.freshStatObservations, receipt.completeScan.entriesAttempted + 1);
  for (const key of ['mutableFilesReobserved', 'directoryLinksNeverFollowed',
    'sparseLogicalSizeCounted', 'entryBoundRetained', 'specialNodeRefused', 'missingRootRefused',
    'disappearingChildStillCounted']) {
    assert.equal(receipt[key], true);
  }
});
