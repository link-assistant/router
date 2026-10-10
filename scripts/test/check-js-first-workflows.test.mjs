import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { auditWorkflows, guarded } from '../check-js-first-workflows.mjs';
const require = createRequire(new URL('../ci/package.json', import.meta.url));
const { parse, stringify } = require('yaml');
const directory = new URL('../../.github/workflows/', import.meta.url);
const baseline = Object.fromEntries(fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name)).map(name => [name, fs.readFileSync(new URL(name, directory), 'utf8')]));
function mutate(filename, operation) {
  const sources = { ...baseline };
  const workflow = parse(sources[filename]);
  operation(workflow);
  sources[filename] = stringify(workflow);
  return auditWorkflows(sources);
}
function fails(filename, operation, expected) { assert.ok(mutate(filename, operation).some(error => error.includes(expected))); }
test('all repository workflows satisfy the policy', () => assert.deepEqual(auditWorkflows(baseline), []));
test('explicit top-level conjunction protects against success, skipped, cancelled, failure and always bypasses', () => {
  assert.equal(guarded("needs.javascript.result == 'success'", 'javascript'), true);
  assert.equal(guarded("needs.javascript.result == 'success' && (always() && (true || false))", 'javascript'), true);
  for (const expression of ['always()', "needs.javascript.result != 'failure'", "needs.javascript.result == 'success' || always()", "needs.javascript.result == 'success' && (false) || (true)", "needs.javascript.result == 'success' && ((false)) || (true)", 'success()', "contains(toJSON(needs), 'success')"]) assert.equal(guarded(expression, 'javascript'), false, expression);
});
test('Rust-only PR, schedule, dispatch, release and push use the same unconditional gate', () => {
  for (const filename of Object.keys(baseline).filter(name => name !== 'javascript-first.yml')) {
    fails(filename, workflow => { delete workflow.jobs.javascript; }, 'gate missing');
    fails(filename, workflow => { workflow.jobs.javascript.if = 'false'; }, 'gate missing');
    fails(filename, workflow => { workflow.jobs.javascript.with.sha = '${{ github.event.pull_request.head.sha }}'; }, 'gate missing');
    fails(filename, workflow => { workflow.jobs.javascript['continue-on-error'] = true; }, 'gate missing');
  }
});
test('obscured cargo and Docker commands still require a gate because every runner is audited', () => {
  fails('fuzz.yml', workflow => { workflow.jobs.hidden = { 'runs-on': 'ubuntu-latest', steps: [{ run: 'python scripts/build.py' }] }; }, 'success dependency missing');
  fails('docker-build.yml', workflow => { delete workflow.jobs.runtime.needs; }, 'success dependency missing');
  fails('release.yml', workflow => { workflow.jobs.test.if = 'always()'; }, 'success dependency missing');
});
test('every JavaScript stage and command is mandatory and cannot skip or ignore failures', () => {
  for (const id of ['lint', 'node-tests', 'bun-tests', 'typescript', 'parity', 'translation', 'reverse-translation']) {
    fails('javascript-first.yml', workflow => { delete workflow.jobs[id]; }, 'stage missing');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].if = 'false'; }, 'stage missing');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.at(-1)['continue-on-error'] = true; }, 'ignore failures');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.at(-1).run = 'echo inventory only'; }, 'mandatory command');
  }
  fails('javascript-first.yml', workflow => { workflow.jobs.parity.steps.at(-1).run = 'node scripts/check-router-parity.mjs'; }, 'mandatory command');
});
test('aggregate rejects partial green, skipped and cancelled stages', () => {
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.needs.pop(); }, 'depend on every');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].run = 'echo success'; }, 'reject skipped');
});
test('no Rust setup or Rust compilation inside the JavaScript stage', () => {
  for (const run of ['cargo test', 'rust-script x.rs', 'docker/build-push-action@abc']) fails('javascript-first.yml', workflow => { workflow.jobs.lint.steps.push({ run }); }, 'Rust must not execute');
});
test('Rust stage cancellation is forbidden at workflow and job scope', () => {
  fails('mutants.yml', workflow => { workflow.concurrency['cancel-in-progress'] = true; }, 'cancel-in-progress');
  fails('release.yml', workflow => { workflow.jobs.lint.concurrency = { group: 'x', 'cancel-in-progress': '${{ true }}' }; }, 'cancellation bypass');
});
test('source checkout drift and base worktree builds cannot bypass their SHA gate', () => {
  fails('release.yml', workflow => { workflow.jobs['publish-release-artifacts'].steps[0].with.ref = 'main'; }, 'exact-SHA');
  fails('release.yml', workflow => { workflow.jobs['publish-release-artifacts'].needs = ['javascript']; }, 'exact-SHA');
  fails('release.yml', workflow => { workflow.jobs['publish-release-artifacts'].if = "needs.javascript.result == 'success' && (needs.release-javascript.result == 'success' && (false) || true)"; }, 'exact-SHA');
  fails('benchmarks.yml', workflow => { workflow.jobs.compare.needs = ['javascript']; }, 'mutable shell source');
  fails('javascript-first.yml', workflow => { workflow.jobs.lint.steps[0].with.ref = 'main'; }, 'inputs.sha');
});
test('external or missing reusable workflows require an audited local wrapper', () => {
  fails('fuzz.yml', workflow => { workflow.jobs.hidden = { needs: ['javascript'], if: "needs.javascript.result == 'success'", uses: 'outside/repo/workflow.yml@main' }; }, 'audited local wrapper');
  fails('fuzz.yml', workflow => { workflow.jobs.hidden = { needs: ['javascript'], if: "needs.javascript.result == 'success'", uses: './.github/workflows/missing.yml' }; }, 'missing local');
});
test('duplicate YAML keys are rejected rather than choosing a convenient one', () => {
  const sources = { ...baseline, 'bypass.yml': 'name: Bad\non: push\njobs:\n  hidden:\n    runs-on: ubuntu-latest\njobs:\n  hidden:\n    runs-on: ubuntu-latest\n' };
  assert.ok(auditWorkflows(sources).some(error => error.includes('Map keys must be unique')));
});
