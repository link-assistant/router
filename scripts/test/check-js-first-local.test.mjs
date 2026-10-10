import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fingerprint, verifyStamp, stages } from '../check-js-first-local.mjs';
test('green stamps require strict parity, every stage and unchanged tracked/untracked source', () => {
  const previous = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'router-gate-stamp-'));
  try {
    process.chdir(directory);
    execFileSync('git', ['init', '-q']);
    execFileSync('git', ['config', 'user.name', 'Gate Test']);
    execFileSync('git', ['config', 'user.email', 'gate@example.invalid']);
    fs.writeFileSync('source.js', 'export const value = 1;\n');
    execFileSync('git', ['add', 'source.js']);
    execFileSync('git', ['commit', '-qm', 'fixture']);
    const stampPath = path.join(directory, 'stamp.json');
    const identity = fingerprint(stampPath);
    const valid = { version: 1, ...identity, checkedAt: new Date().toISOString(), stages: stages.map(([id]) => id), strictParity: true };
    const stamp = (overrides = {}) => fs.writeFileSync(stampPath, JSON.stringify({ ...valid, ...overrides }));
    stamp(); assert.deepEqual(verifyStamp(stampPath), identity);
    stamp({ strictParity: false }); assert.throws(() => verifyStamp(stampPath), /full strict checks/);
    stamp({ stages: ['lint', 'node-tests'] }); assert.throws(() => verifyStamp(stampPath), /full strict checks/);
    stamp({ headSha: 'a'.repeat(40) }); assert.throws(() => verifyStamp(stampPath), /different commit/);
    stamp(); fs.writeFileSync('source.js', 'export const value = 2;\n'); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.writeFileSync('source.js', 'export const value = 1;\n'); assert.deepEqual(verifyStamp(stampPath), identity);
    fs.chmodSync('source.js', 0o755); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.chmodSync('source.js', 0o644); assert.deepEqual(verifyStamp(stampPath), identity);
    fs.writeFileSync('new.js', '// new source'); assert.throws(() => verifyStamp(stampPath), /different commit/);
    fs.unlinkSync('new.js'); fs.unlinkSync('source.js'); assert.throws(() => verifyStamp(stampPath), /different commit/);
  } finally { process.chdir(previous); fs.rmSync(directory, { recursive: true, force: true }); }
});
