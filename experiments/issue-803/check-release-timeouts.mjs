#!/usr/bin/env node
// Node replica of `darwin_release_artifact_legs_have_room_to_finish_the_release_build`
// in rust/tests/ci_regressions_test.rs (issue #803). Local Rust tools are not run
// in this repository (AGENTS.md), so this mirrors the same string checks.
// Usage: node experiments/issue-803/check-release-timeouts.mjs [path/to/release.yml]
import fs from 'node:fs';

const file = process.argv[2] ?? '.github/workflows/release.yml';
const workflow = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const failures = [];
const between = (text, start, end) => {
  const a = text.indexOf(start);
  if (a < 0) return null;
  const rest = text.slice(a + start.length);
  const b = rest.indexOf(end);
  return b < 0 ? null : rest.slice(0, b);
};
const job = between(workflow, '\n  publish-release-artifacts:\n', '\n  publish-integration-artifacts:\n');
if (!job) throw new Error('publish-release-artifacts job not found');
const jobLevel = job.split('\n').filter(line => line.startsWith('    timeout-minutes:'));
if (JSON.stringify(jobLevel) !== JSON.stringify(['    timeout-minutes: ${{ matrix.timeout-minutes }}'])) {
  failures.push(`job deadline must come from each matrix leg, found ${JSON.stringify(jobLevel)}`);
}
const matrix = between(job, '        include:\n', '\n    runs-on:') ?? '';
const legs = matrix.split('          - os: ').slice(1);
if (legs.length !== 4) failures.push(`expected 4 legs, found ${legs.length}`);
let darwin = 0;
for (const leg of legs) {
  const os = leg.split('\n')[0].trim();
  const line = leg.split('\n').map(l => l.trim()).find(l => l.startsWith('timeout-minutes: '));
  if (!line) { failures.push(`matrix leg ${os} must declare timeout-minutes`); continue; }
  const minutes = Number(line.slice('timeout-minutes: '.length));
  if (!Number.isInteger(minutes)) { failures.push(`matrix leg ${os} timeout must be a number`); continue; }
  if (os === 'darwin') { darwin += 1; if (minutes < 60) failures.push(`Darwin leg needs >= 60 minutes, found ${minutes}`); }
  else if (os === 'linux') { if (minutes < 30 || minutes > 45) failures.push(`Linux leg deadline out of range: ${minutes}`); }
  else failures.push(`unexpected platform ${os}`);
}
if (darwin !== 2) failures.push(`both Darwin slices must get the longer deadline (found ${darwin})`);
if (!workflow.includes('timeout-minutes: ${{ matrix.timeout-minutes }}')) failures.push('release lint snippet missing');

if (failures.length) { console.error(`FAIL ${file}\n- ${failures.join('\n- ')}`); process.exitCode = 1; }
else console.log(`PASS ${file}: Darwin legs and Linux legs have separate matrix deadlines`);
