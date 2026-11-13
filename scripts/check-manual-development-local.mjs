#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { fingerprint, runStageCommand } from './check-js-first-local.mjs';
import { MANUAL_STAGES } from './manual-development-policy.mjs';

// Deliberately has no strict stamp writer. Keep the full gate and its verifier
// intact; a manual development receipt must never unlock bounded Rust builds.
export function runManualDevelopment({ run = runStageCommand } = {}) {
  const failures = [];
  for (const [id, commands] of MANUAL_STAGES) {
    console.log(`Manual development stage: ${id}`);
    for (const command of commands) {
      const result = run(id, command);
      if (result.status !== 0) {
        failures.push({ stage: id, command, status: result.status, signal: result.signal ?? null });
        break;
      }
    }
  }
  return { version: 1, scope: 'temporary-manual-development',
    stages: MANUAL_STAGES.map(([id]) => id), failures,
    developmentChecksPassed: failures.length === 0,
    strictParity: false, fullGatePassed: false, rustAllowed: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--receipt')) throw Error('Usage: check-manual-development-local.mjs [--receipt PATH]');
    const receiptPath = path.resolve(args[1] ?? path.join(os.tmpdir(), 'router-manual-development.json'));
    fs.rmSync(receiptPath, { force: true });
    const fingerprintOptions = process.env.ROUTER_JS_FIRST_FINGERPRINT_PROGRESS === '1'
      ? { progress: record => process.stderr.write(JSON.stringify({ event: 'javascript-gate-fingerprint', ...record }) + '\n') }
      : undefined;
    const before = fingerprint(receiptPath, fingerprintOptions);
    const report = runManualDevelopment();
    const after = fingerprint(receiptPath, fingerprintOptions);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw Error('Source changed during manual development checks. Rerun the checks.');
    fs.writeFileSync(receiptPath, JSON.stringify({ ...report, ...after, checkedAt: new Date().toISOString() }, null, 2) + '\n');
    console.log(`Manual development receipt: ${receiptPath}; strict parity remains unverified; this local receipt never authorizes local Rust tools.`);
    if (!report.developmentChecksPassed) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
