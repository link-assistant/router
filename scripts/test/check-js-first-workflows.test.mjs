import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { auditWorkflows, guarded } from '../check-js-first-workflows.mjs';
import { parityCheckBudgets } from '../parity-check-budgets.mjs';
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
test('locked repository dependencies are installed before every consuming stage, including forward and profile checks', () => {
  const jobs = parse(baseline['javascript-first.yml']).jobs;
  const installations = [
    ['lint', 'npm ci --prefix scripts/ci --ignore-scripts'],
    ['lint', 'npm ci --prefix js --ignore-scripts'],
    ...['node-tests', 'bun-tests', 'typescript', 'parity', 'translation', 'profile-matrix', 'reverse-translation'].map(id => [id, 'npm ci --prefix js --ignore-scripts']),
    ['typescript', 'npm ci --prefix ui --ignore-scripts'],
  ];
  for (const [id, command] of installations) {
    assert.ok(jobs[id].steps.some(step => step.run === command), `${id}: actual locked installation`);
    fails('javascript-first.yml', workflow => {
      workflow.jobs[id].steps = workflow.jobs[id].steps.filter(step => step.run !== command);
    }, 'locked dependency install must precede');
    fails('javascript-first.yml', workflow => {
      const steps = workflow.jobs[id].steps;
      const index = steps.findIndex(step => step.run === command);
      steps.push(...steps.splice(index, 1));
    }, 'locked dependency install must precede');
    fails('javascript-first.yml', workflow => {
      workflow.jobs[id].steps.find(step => step.run === command).run = command.replace('npm ci', 'npm install');
    }, 'locked dependency install must precede');
  }
  // An installation between the whole forward suite and canonical check is
  // still too late, even though it precedes the last command in that stage.
  fails('javascript-first.yml', workflow => {
    const steps = workflow.jobs.translation.steps;
    const index = steps.findIndex(step => step.run === 'npm ci --prefix js --ignore-scripts');
    const [install] = steps.splice(index, 1);
    steps.splice(steps.findIndex(step => step.run === 'node scripts/translate-router.mjs --check'), 0, install);
  }, 'locked dependency install must precede');
});
test('installed pre-commit hooks preserve generic checks without automatic Rust execution or cache cleanup', () => {
  const config = parse(fs.readFileSync(new URL('../../.pre-commit-config.yaml', import.meta.url), 'utf8'));
  const generic = config.repos.find(repo => repo.repo === 'https://github.com/pre-commit/pre-commit-hooks');
  assert.deepEqual(generic.hooks.map(hook => hook.id), ['trailing-whitespace', 'end-of-file-fixer', 'check-yaml', 'check-added-large-files', 'check-merge-conflict', 'check-toml', 'debug-statements']);
  for (const repo of config.repos) for (const hook of repo.hooks) {
    assert.doesNotMatch(`${hook.id}\n${hook.entry ?? ''}`, /\b(?:cargo|rustc|rustup|rust-script|clippy-driver)\b|clear-build-cache|sweep-build-artifacts/);
  }
});
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
test('Rust verification after JavaScript preserves hard failures without relying on local hooks', () => {
  for (const filename of Object.keys(baseline).filter(name => name !== 'javascript-first.yml')) {
    const workflow = parse(baseline[filename]), id = Object.keys(workflow.jobs).find(name => name !== 'javascript' && workflow.jobs[name].steps?.length);
    assert.ok(id, filename);
    for (const ignored of [true, '${{ true }}', '${{ matrix.experimental }}']) {
      fails(filename, value => { value.jobs[id]['continue-on-error'] = ignored; }, 'verification must not ignore failures');
      fails(filename, value => { value.jobs[id].steps[0]['continue-on-error'] = ignored; }, 'verification step must not ignore failures');
    }
    assert.deepEqual(mutate(filename, value => {
      value.jobs[id]['continue-on-error'] = false;
      value.jobs[id].steps[0]['continue-on-error'] = false;
    }), [], filename);
  }
  for (const ignored of [true, '${{ matrix.experimental }}']) fails('release.yml', workflow => {
    workflow.jobs.test.steps.find(step => /cargo test/.test(step.run ?? ''))['continue-on-error'] = ignored;
  }, 'verification step must not ignore failures');
});
test('every JavaScript stage and command is mandatory and cannot skip or ignore failures', () => {
  for (const id of ['lint', 'node-tests', 'bun-tests', 'typescript', 'parity', 'translation', 'profile-matrix', 'reverse-translation']) {
    fails('javascript-first.yml', workflow => { delete workflow.jobs[id]; }, 'stage missing');
    for (const condition of ['false', false, '', 0, null]) {
      fails('javascript-first.yml', workflow => { workflow.jobs[id].if = condition; }, 'stage missing');
      fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.at(-1).if = condition; }, 'conditional');
    }
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.at(-1)['continue-on-error'] = true; }, 'ignore failures');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.at(-1).run = 'echo inventory only'; }, 'mandatory command');
  }
  fails('javascript-first.yml', workflow => { workflow.jobs.parity.steps.at(-1).run = 'node scripts/check-router-parity.mjs'; }, 'mandatory command');
  for(const [id,command]of [['typescript', 'node scripts/check-owned-definition-typescript.mjs'], ['translation', 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check'], ['profile-matrix', 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check'], ['reverse-translation', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --check'], ['reverse-translation', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --profile-matrix --check']]) {
    fails('javascript-first.yml',workflow=>{workflow.jobs[id].steps=workflow.jobs[id].steps.filter(step=>step.run!==command);},'mandatory command');
    fails('javascript-first.yml',workflow=>{workflow.jobs[id].steps.find(step=>step.run===command).run='echo '+command;},'mandatory command');
    fails('javascript-first.yml',workflow=>{workflow.jobs[id].steps.find(step=>step.run===command).if='${{ false }}';},'conditional');
    fails('javascript-first.yml',workflow=>{workflow.jobs[id].steps.find(step=>step.run===command).run=command.includes('--owned-core-definitions')?command.replace('--owned-core-definitions','--old-definitions'):command+' --skip';},'mandatory command');
  }
});
test('heavy compiler and acceptance cohorts require two workers and every test file', () => {
  for (const [id, glob] of [['translation', 'tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs'], ['parity', 'experiments/issue-759/acceptance/*.test.mjs']]) {
    const prefix = id === 'translation' ? 'node scripts/run-node-tests.mjs --outer-timeout-ms=3600000' : 'node --test';
    const command = `${prefix} --test-concurrency=2 ${glob}`;
    assert.ok(parse(baseline['javascript-first.yml']).jobs[id].steps.some(step => step.run === command));
    for (const replacement of [
      `${prefix} ${glob}`,
      `${prefix} --test-concurrency=3 ${glob}`,
      `${prefix} --test-concurrency=2 ${glob.replace('*', 'one')}`,
      `${prefix} --test-concurrency=2 --test-name-pattern=only-one ${glob}`,
      ...(id === 'translation' ? [`node --test --test-concurrency=2 ${glob}`] : []),
    ]) fails('javascript-first.yml', workflow => {
      workflow.jobs[id].steps.find(step => step.run === command).run = replacement;
    }, 'mandatory command');
  }
});
test('aggregate rejects partial green, skipped and cancelled stages', () => {
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.needs.pop(); }, 'depend on every');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].run = 'echo success'; }, 'reject skipped');
});
test('independent profile freshness and strict TypeScript cannot be removed or replaced by canonical checks', () => {
  for (const [stage, command, substitute] of [
    ['profile-matrix', 'node scripts/translate-router.mjs --profile-matrix --check', 'node scripts/translate-router.mjs --check'],
    ['typescript', 'node scripts/check-profile-typescript.mjs', 'node js/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json'],
  ]) {
    assert.ok(parse(baseline['javascript-first.yml']).jobs[stage].steps.some(step => step.run === command));
    fails('javascript-first.yml', workflow => {
      workflow.jobs[stage].steps = workflow.jobs[stage].steps.filter(step => step.run !== command);
    }, `missing mandatory command ${command}`);
    fails('javascript-first.yml', workflow => {
      workflow.jobs[stage].steps.find(step => step.run === command).run = substitute;
    }, `missing mandatory command ${command}`);
  }
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

test('Bun runtime is required for lint engine checks, native JavaScript, compiled TypeScript and both translation directions', () => {
  for (const id of ['lint', 'bun-tests', 'typescript', 'translation', 'reverse-translation']) {
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps = workflow.jobs[id].steps.filter(step => !step.uses?.startsWith('oven-sh/setup-bun@')); }, 'pinned Bun runtime');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.find(step => step.uses?.startsWith('oven-sh/setup-bun@')).with['bun-version'] = 'latest'; }, 'pinned Bun runtime');
    fails('javascript-first.yml', workflow => { workflow.jobs[id].steps.find(step => step.uses?.startsWith('oven-sh/setup-bun@')).uses = 'oven-sh/setup-bun@main'; }, 'pinned Bun runtime');
  }
});

test('both reverse translator engines must discover every current and future test file', () => {
  const glob = 'tools/translation/js-to-rust/test/*.test.mjs';
  for (const [command, replacements] of [
    [`node scripts/run-node-tests.mjs --outer-timeout-ms=900000 --test-concurrency=2 ${glob}`, [
      'node --test tools/translation/js-to-rust/test/translator.test.mjs',
      `node --test --test-concurrency=2 --test-name-pattern=one ${glob}`,
    ]],
    [`bun test ${glob}`, ['bun test tools/translation/js-to-rust/test/translator.test.mjs', `bun test --test-name-pattern=one ${glob}`]],
  ]) {
    assert.ok(parse(baseline['javascript-first.yml']).jobs['reverse-translation'].steps.some(step => step.run === command));
    fails('javascript-first.yml', workflow => {
      workflow.jobs['reverse-translation'].steps = workflow.jobs['reverse-translation'].steps.filter(step => step.run !== command);
    }, `missing mandatory command ${command}`);
    for (const replacement of [...replacements, `${command} || true`]) fails('javascript-first.yml', workflow => {
      workflow.jobs['reverse-translation'].steps.find(step => step.run === command).run = replacement;
    }, `missing mandatory command ${command}`);
    for (const bypass of ['if', 'continue-on-error']) fails('javascript-first.yml', workflow => {
      workflow.jobs['reverse-translation'].steps.find(step => step.run === command)[bypass] = true;
    }, 'conditional or ignore failures');
  }
});

test('verifier comments, substituted result data and conditional aggregation cannot spoof executable assertions', () => {
  fails('javascript-first.yml', workflow => { workflow.jobs.lint.steps.find(step => step.env?.EXPECTED_SHA).run = '# rev-parse process.exit(1)\necho success'; }, 'SHA verification missing');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].run = '# Object.values stages.result !== \'success\' process.exit(1)\necho success'; }, 'unconditional reviewed program');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].env.STAGE_RESULTS = '{"fake":{"result":"success"}}'; }, 'unconditional reviewed program');
  for (const condition of [false, 'false', null, 0, '']) fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].if = condition; }, 'unconditional reviewed program');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0]['continue-on-error'] = true; }, 'unconditional reviewed program');
});

test('profile matrix has an independent immutable job and the aggregate rejects its cancellation', () => {
  const jobs = parse(baseline['javascript-first.yml']).jobs;
  assert.equal(jobs['profile-matrix']['timeout-minutes'], 60);
  assert.ok(!jobs.translation.steps.some(step => step.run?.includes('--profile-matrix')));
  assert.ok(jobs.complete.needs.includes('profile-matrix'));
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.needs = workflow.jobs.complete.needs.filter(id => id !== 'profile-matrix'); }, 'depend on every');
  fails('javascript-first.yml', workflow => { workflow.jobs['profile-matrix'].steps[0].with.ref = 'main'; }, 'inputs.sha');
  fails('javascript-first.yml', workflow => { workflow.jobs.complete.steps[0].run = workflow.jobs.complete.steps[0].run.replace('stages.length !== 8', 'stages.length !== 7'); }, 'unconditional reviewed program');
});

test('parity job covers three sequential acceptance checkers and the final checker', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../../parity/router-features.json', import.meta.url)));
  const budget = parityCheckBudgets(manifest, '/router');
  const minutes = parse(baseline['javascript-first.yml']).jobs.parity['timeout-minutes'];
  assert.ok(minutes * 60_000 >= budget.ciParityMs, JSON.stringify(budget));
  fails('javascript-first.yml', workflow => { workflow.jobs.parity['timeout-minutes'] = Math.floor(budget.ciParityMs / 60_000) - 1; }, 'deadline cannot contain');
  const synthetic = { features: [{ evidence: [
    { file: 'test/a.mjs', test: 'a' }, { file: 'test/../test/a.mjs', test: 'b' },
    { file: 'test/b.mjs', test: 'c' }, { file: 'test/fixture.mjs', fixture: 'd' },
  ] }] };
  const two = parityCheckBudgets(synthetic, '/router');
  assert.equal(two.evidenceFiles.length, 2);
  const three = parityCheckBudgets({ features: [...synthetic.features, { evidence: [{ file: 'test/c.mjs', test: 'e' }] }] }, '/router');
  assert.equal(three.checkerMs - two.checkerMs, 180_000);
  assert.equal(three.ciParityMs - two.ciParityMs, 720_000);
});

test('native and source-discovered schema freshness and strict TS are mandatory', () => {
  for (const command of [
    'node tools/translation/serialization-schema/native-descriptor.mjs --check',
    'node tools/translation/serialization-schema/check-descriptor-typescript.mjs',
    'node tools/translation/serialization-schema/bulk.mjs --check',
    'node tools/translation/serialization-schema/check-bulk-typescript.mjs',
  ]) {
    assert.ok(parse(baseline['javascript-first.yml']).jobs.typescript.steps.some(step => step.run === command));
    fails('javascript-first.yml', workflow => { workflow.jobs.typescript.steps = workflow.jobs.typescript.steps.filter(step => step.run !== command); }, 'mandatory command');
  }
});

test('compiler case-deadline audits and complete always-retained raw receipts cannot be bypassed',()=>{
 for(const id of ['typescript','translation','reverse-translation']){
  const job=parse(baseline['javascript-first.yml']).jobs[id];
  const uploader=job.steps.find(step=>step.uses==='actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');assert.ok(uploader);
  for(const change of [step=>{step.if='false';},step=>{step['continue-on-error']=true;},step=>{step.with['include-hidden-files']=false;},step=>{step.with.path='unrelated/';},step=>{step.with['if-no-files-found']='ignore';}])fails('javascript-first.yml',workflow=>{change(workflow.jobs[id].steps.find(step=>step.uses===uploader.uses));},'deadline');
  fails('javascript-first.yml',workflow=>{const command=workflow.jobs[id].steps.find(step=>step.run?.startsWith('node scripts/run-node-tests.mjs'));command.run=command.run.replace(/node scripts\/run-node-tests\.mjs --outer-timeout-ms=\d+/u,'node --test');},'mandatory command');
  for(const bypass of ['if','continue-on-error'])fails('javascript-first.yml',workflow=>{const step=workflow.jobs[id].steps.find(step=>step.run?.startsWith('node scripts/run-node-tests.mjs'));step[bypass]=bypass==='if'?'${{ always() }}':true;step.name=uploader.name;},'conditional or ignore failures');
  fails('javascript-first.yml',workflow=>{const selected=workflow.jobs[id],step=selected.steps.find(step=>step.run?.startsWith('node scripts/run-node-tests.mjs'));selected.steps=selected.steps.filter(item=>item.uses!==uploader.uses);Object.assign(step,{uses:uploader.uses,with:uploader.with,if:'${{ always() }}'});},'conditional or ignore failures');
  fails('javascript-first.yml',workflow=>{const step=workflow.jobs[id].steps.find(step=>step.uses===uploader.uses);step.run='echo forged upload and check';},'deadline');
  fails('javascript-first.yml',workflow=>{workflow.jobs[id].steps.unshift({name:uploader.name,uses:'actions/checkout@forged',if:'${{ always() }}',with:{ref:'${{ inputs.sha }}'}});},'conditional or ignore failures');
 }
});
