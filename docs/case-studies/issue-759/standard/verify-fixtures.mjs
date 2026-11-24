#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
for (const [fixture, strict, expectedStatus] of [['complete', true, 0], ['incomplete', true, 1], ['incomplete', false, 0], ['missing-inventory', false, 1]]) {
  const result = spawnSync(process.execPath, [path.join(root, 'check-parity.template.mjs'), path.join(root, 'fixtures', `${fixture}.json`), '--root', path.join(root, 'fixtures'), ...(strict ? ['--strict'] : [])], { encoding: 'utf8' });
  assert.equal(result.status, expectedStatus, `${fixture}: ${result.stderr}`);
}
const measurement = spawnSync(process.execPath, [path.resolve(root, '../../../../scripts/measure-js-first.mjs'), path.join(root, 'fixtures/github-metadata.json')], { encoding: 'utf8' });
assert.equal(measurement.status, 0, measurement.stderr);
const report = JSON.parse(measurement.stdout);
assert.equal(report.summary.workflowRunCount, 1);
assert.equal(report.summary.archivedRunAttempts, 2);
assert.equal(report.summary.observedRerunAttempts, 1);
assert.equal(report.summary.cumulativeJobExecutionSeconds, 120);
assert.equal(report.summary.peakRssBytes, null);
assert.equal(report.summary.peakTargetDiskBytes, null);
assert.equal(report.summary.archivedSynchronizeEvents, null);
console.log('Synthetic strict/incomplete/inventory and archived measurement fixtures pass.');
