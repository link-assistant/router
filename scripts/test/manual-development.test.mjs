import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { auditManualDevelopment, readWorkflowSources } from '../check-manual-development-workflows.mjs';
import { MANUAL_STAGES, MANUAL_WORKFLOW, MANUAL_AGGREGATE, RUST_BLOCK } from '../manual-development-policy.mjs';
import { runManualDevelopment } from '../check-manual-development-local.mjs';
import { auditWorkflows, STAGES } from '../check-js-first-workflows.mjs';
const require = createRequire(new URL('../ci/package.json', import.meta.url));
const { parse, stringify } = require('yaml');
const sources = readWorkflowSources();

function mutation(file, change) {
  const next = { ...sources }, doc = parse(next[file]);
  change(doc);
  next[file] = stringify(doc);
  return auditManualDevelopment(next);
}

test('actual manual workflow is SHA-pinned, fail-closed, and preserves the complete strict source policy', { timeout: 30_000 }, () => {
  assert.deepEqual(auditManualDevelopment(sources), []);
  const strict = parse(sources['javascript-first.yml']);
  assert.deepEqual(Object.keys(strict.jobs), [...STAGES, 'complete']);
  assert.equal(strict.jobs.parity['timeout-minutes'], 240);
  const before = { ...sources };
  delete before[MANUAL_WORKFLOW];
  for (const [name, source] of Object.entries(before)) {
    if (name === 'javascript-first.yml') continue;
    const doc = parse(source);
    for (const [id, job] of Object.entries(doc.jobs)) {
      if (job.uses === `./.github/workflows/${MANUAL_WORKFLOW}`) job.uses = './.github/workflows/javascript-first.yml';
      if (id !== 'javascript') job.if = job.if.slice(RUST_BLOCK.length, -1);
    }
    before[name] = stringify(doc);
  }
  assert.deepEqual(auditWorkflows(before), []);
  assert.ok(auditManualDevelopment(before).length > 0);
});

test('manual lane refuses missing, skipped, ignored, reordered or substituted checks', { timeout: 30_000 }, () => {
  const changes = [
    doc => { delete doc.jobs.typescript; },
    doc => { doc.jobs.parity = { 'runs-on': 'ubuntu-24.04', steps: [{ run: 'true' }] }; },
    doc => { doc.jobs.lint.if = '${{ false }}'; },
    doc => { doc.jobs['node-tests']['continue-on-error'] = true; },
    doc => { doc.jobs['bun-tests']['timeout-minutes'] = 30; },
    doc => { doc.jobs.typescript.steps.find(step => step.run === 'node scripts/check-native-typescript.mjs').run = 'true'; },
    doc => { doc.jobs.typescript.steps.find(step => step.run?.startsWith('npm run typecheck')).if = '${{ false }}'; },
    doc => { doc.jobs.lint.steps.find(step => step.run === 'npm ci --prefix js --ignore-scripts').run = 'npm install --prefix js'; },
    doc => { doc.jobs.lint.steps.reverse(); },
    doc => { doc.jobs.typescript.steps.at(-1).if = '${{ success() }}'; },
    doc => { doc.jobs.lint.steps.push({ run: 'cargo check' }); },
    doc => { doc.jobs.complete.steps[0].run = 'echo "all success"'; },
    doc => { doc.jobs.complete.needs.pop(); },
    doc => { doc.jobs.complete.if = '${{ success() }}'; },
  ];
  for (const [index, change] of changes.entries()) assert.ok(mutation(MANUAL_WORKFLOW, change).length, `mutation ${index}`);
});

test('immutable SHA, read-only permissions and explicit false Rust output cannot be bypassed', { timeout: 30_000 }, () => {
  for (const change of [
    doc => { doc.on.workflow_call.inputs.sha.required = false; },
    doc => { doc.on.workflow_call.outputs.rust_allowed.value = 'true'; },
    doc => { delete doc.on.workflow_call.outputs; },
    doc => { doc.on.push = null; },
    doc => { doc.permissions.contents = 'write'; },
    doc => { doc.jobs['node-tests'].steps[0].with.ref = 'main'; },
    doc => { doc.jobs['node-tests'].steps.find(step => step.env?.EXPECTED_SHA).run = 'true'; },
  ]) assert.ok(mutation(MANUAL_WORKFLOW, change).length);
});

test('every caller retains its false Rust guard, original dependencies, draft policy and source pins', { timeout: 30_000 }, () => {
  for (const change of [
    doc => { doc.jobs.test.if = "needs.javascript.result == 'success'"; },
    doc => { doc.jobs.test.needs = []; },
    doc => { doc.jobs.javascript.with.sha = 'main'; },
    doc => { doc.jobs.javascript.uses = './.github/workflows/javascript-first.yml'; },
    doc => { doc.jobs.javascript.if = '${{ false }}'; },
    doc => { doc.jobs.test['continue-on-error'] = true; },
    doc => { doc.concurrency['cancel-in-progress'] = true; },
  ]) assert.ok(mutation('release.yml', change).length);
  assert.ok(mutation('bindings.yml', doc => { delete doc.jobs.javascript.if; }).length);
  assert.ok(mutation('release.yml', doc => { doc.jobs['release-javascript'].with.sha = 'main'; }).length);
  assert.ok(mutation('javascript-first.yml', doc => { doc.jobs.parity.steps = [{ run: 'true' }]; }).length);
});

test('malformed and duplicate YAML keys fail closed', { timeout: 30_000 }, () => {
  for (const source of ['jobs: [', 'jobs: {}\njobs: {}\n', 'null\n']) {
    assert.ok(auditManualDevelopment({ ...sources, [MANUAL_WORKFLOW]: source }).length);
  }
});

test('aggregate executes and rejects failed, cancelled, skipped, missing and unknown stages', { timeout: 30_000 }, () => {
  const passed = Object.fromEntries(MANUAL_STAGES.map(([id]) => [id, { result: 'success' }]));
  const run = value => spawnSync(MANUAL_AGGREGATE, { shell: true, encoding: 'utf8', env: { ...process.env, STAGE_RESULTS: JSON.stringify(value) } });
  const green = run(passed);
  assert.equal(green.status, 0, green.stderr);
  assert.match(green.stdout, /strict parity is unverified/);
  for (const status of ['failure', 'cancelled', 'skipped']) assert.notEqual(run({ ...passed, lint: { result: status } }).status, 0);
  const missing = { ...passed }; delete missing.typescript;
  assert.notEqual(run(missing).status, 0);
  assert.notEqual(run({ ...passed, unreviewed: { result: 'success' } }).status, 0);
});

test('local runner executes all active commands and cannot produce strict parity evidence', () => {
  const visited = [];
  const report = runManualDevelopment({ run: (id, command) => { visited.push([id, command]); return { status: 0 }; } });
  assert.deepEqual(visited, MANUAL_STAGES.flatMap(([id, commands]) => commands.map(command => [id, command])));
  assert.equal(report.developmentChecksPassed, true);
  for (const key of ['strictParity', 'fullGatePassed', 'rustAllowed']) assert.equal(report[key], false);
  const failed = runManualDevelopment({ run: () => ({ status: null, signal: 'SIGTERM' }) });
  assert.equal(failed.developmentChecksPassed, false);
  assert.equal(failed.failures.length, MANUAL_STAGES.length);
  assert.ok(failed.failures.every(row => row.signal === 'SIGTERM'));
});
