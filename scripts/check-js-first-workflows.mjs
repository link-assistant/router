#!/usr/bin/env node
// Every runner job is gated, even if its shell script hides a Rust/Docker build.
// YAML is parsed structurally; comments, quoted strings, matrices and multiline
// conditions cannot masquerade as dependencies or satisfy this policy.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parityCheckBudgets } from './parity-check-budgets.mjs';
import {DRAFT_SUPPLEMENTS,DRAFT_SUPPLEMENT_CONDITION,DRAFT_SUPPLEMENT_PR_TYPES,readFixedNineDraftWorkflowSources} from './fixed-nine-draft-policy.mjs';
const require = createRequire(new URL('./ci/package.json', import.meta.url));
const { parseDocument } = require('yaml');
export const STAGES = ['lint', 'node-tests', 'bun-tests', 'typescript', 'parity', 'translation', 'profile-matrix', 'reverse-translation'];
const draftSupplementNames=new Set(DRAFT_SUPPLEMENTS);
function exact(a,b,depth=0){if(Object.is(a,b))return true;if(depth>=64||!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b)||Array.isArray(a)&&a.length!==b.length)return false;const left=Object.keys(a).sort(),right=Object.keys(b).sort();return left.length===right.length&&left.every((key,index)=>key===right[index]&&exact(a[key],b[key],depth+1));}
// Immutable reviewed source DATA supplies only this fixed table. It does not
// make skipped callers eight successful stages or grant Rust admission.
const reviewedDraftSupplementals=new Map(readFixedNineDraftWorkflowSources().files.filter(row=>draftSupplementNames.has(path.basename(row.path))).map(row=>{
 const document=parseDocument(row.after,{uniqueKeys:true,version:'1.2'});if(document.errors.length)throw TypeError('Fixed-nine reviewed workflow grammar differs');return [path.basename(row.path),document.toJS()];
}));
function auditDraftSupplement(name,workflow,errors){
 const reviewed=reviewedDraftSupplementals.get(name),trigger=workflow.on?.pull_request;
 if(!exact(trigger?.types,DRAFT_SUPPLEMENT_PR_TYPES)||!exact(workflow.on,reviewed.on))errors.push(`${name}: fixed-nine reviewed PR activities/paths and other triggers differ`);
 if(workflow.jobs?.javascript?.if!==DRAFT_SUPPLEMENT_CONDITION||!exact(workflow.jobs?.javascript,reviewed.jobs.javascript))errors.push(`${name}/javascript: exact fixed-nine draft caller gate missing`);
}

const success = (id) => `needs.${id}.result == 'success'`;
// Compare executable reviewed programs, rather than finding reassuring words
// in comments or strings that a no-op verifier could carry.
const normalizeProgram = program => String(program ?? '').trim().split('\n').map(line => line.trim()).join('\n');
const shaVerifier = normalizeProgram(`node --input-type=module -e "
  import {execFileSync} from 'node:child_process';
  const expected = process.env.EXPECTED_SHA;
  if (!/^[a-f0-9]{40}$/.test(expected) || execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim() !== expected) process.exit(1);
"`);
const aggregateVerifier = normalizeProgram(`node --input-type=module -e "
  const stages = Object.values(JSON.parse(process.env.STAGE_RESULTS));
  if (stages.length !== 8 || stages.some(stage => stage.result !== 'success')) {
    console.error('JavaScript gate rejected:', process.env.STAGE_RESULTS);
    process.exit(1);
  }
"`);

export function guarded(condition, id) {
  const value = String(condition ?? '').trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  if (value === success(id)) return true;
  if (!value.startsWith(`${success(id)} && (`) || !value.endsWith(')')) return false;
  // Ensure the entire remaining condition is one parenthesized expression.
  let depth = 0, quote = '';
  const suffix = value.slice(success(id).length + 4);
  for (let index = 0; index < suffix.length; index++) {
    const ch = suffix[index];
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')' && --depth === 0) return index === suffix.length - 1;
  }
  return false;
}
function nestedGuard(condition, first, second) {
  const value = String(condition ?? '').trim().replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  return guarded(value, first) && guarded(value.slice(success(first).length + 5, -1), second);
}
function dependencies(job) { return Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : []; }
function parse(source, name, errors) {
  const document = parseDocument(source, { uniqueKeys: true, version: '1.2' });
  for (const error of document.errors) errors.push(`${name}: ${error.message}`);
  return document.toJS() ?? {};
}
export function auditWorkflows(sources) {
  const errors = [];
  const documents = new Map(Object.entries(sources).map(([name, source]) => [name, parse(source, name, errors)]));
  const gateName = 'javascript-first.yml';
  const gate = documents.get(gateName);
  if (!gate) errors.push(`${gateName}: missing reusable gate`);
  else {
    if (!gate.on?.workflow_call || Object.keys(gate.on).some(key => key !== 'workflow_call')) errors.push(`${gateName}: must only be workflow_call`);
    if (gate.on?.workflow_call?.inputs?.sha?.required !== true) errors.push(`${gateName}: required immutable SHA input missing`);
    const required = {
      lint: ['node scripts/prepare-bun-reverse-files.mjs --check', 'node scripts/lint-js-first.mjs', 'node --test --test-concurrency=1 scripts/test/run-bun-forward-files.test.mjs scripts/test/run-bun-reverse-files.test.mjs scripts/test/bun-reverse-inputs.test.mjs', 'node --test scripts/test/check-js-first-workflows.test.mjs', 'node --test scripts/test/check-js-first-local.test.mjs', 'node scripts/check-js-first-workflows.mjs'],
      'node-tests': ['npm run native:test --prefix js'],
      'bun-tests': ['npm run native:test:bun --prefix js'],
      typescript: ['node scripts/run-node-tests.mjs --outer-timeout-ms=180000 scripts/test/node-case-deadlines.test.mjs', 'npm run typecheck --prefix js', 'npm run native:typecheck --prefix js', 'node scripts/regenerate-native-typescript.mjs --check', 'node scripts/check-native-typescript.mjs', 'node scripts/run-node-tests.mjs --outer-timeout-ms=900000 tools/translation/js-to-rust/test/native-typescript.test.mjs', 'node js/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json', 'node tools/translation/check-typescript-fixtures.mjs', 'node scripts/check-profile-typescript.mjs', 'node scripts/check-owned-definition-typescript.mjs', 'node tools/translation/serialization-schema/native-descriptor.mjs --check', 'node tools/translation/serialization-schema/check-descriptor-typescript.mjs', 'node tools/translation/serialization-schema/bulk.mjs --check', 'node tools/translation/serialization-schema/check-bulk-typescript.mjs', 'node scripts/build-js-first-ui.mjs'],
      parity: ['node --test --test-concurrency=2 experiments/issue-759/acceptance/*.test.mjs', 'node scripts/check-router-parity.mjs --strict'],
      translation: ["node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --check", 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check', 'node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs'],
      'profile-matrix': ["node scripts/translate-router-flat-native-owned-field-meta.mjs --retain-output-text --profile-matrix --check", 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check'],
      'reverse-translation': ['node scripts/regenerate-js-first.mjs --check', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --check', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --profile-matrix --check', 'node scripts/run-node-tests.mjs --outer-timeout-ms=900000 --test-concurrency=2 tools/translation/js-to-rust/test/*.test.mjs', 'node scripts/run-bun-reverse-files.mjs --output-root js/node_modules/.bun-reverse-files'],
    };
    const packageInstall = 'npm ci --prefix js --ignore-scripts';
    for (const id of STAGES) {
      const job = gate.jobs?.[id];
      if (!job || !job['runs-on'] || Object.hasOwn(job, 'if') || job['continue-on-error'] || job.strategy?.['fail-fast'] === true) errors.push(`${gateName}/${id}: required unconditional failing stage missing`);
      const runs = (job?.steps ?? []).map(step => step.run);
      let deadlineEvidenceUpload = null;
      if (['typescript', 'translation', 'reverse-translation'].includes(id)) {
        const uploads = (job?.steps ?? []).filter(step => step.uses === 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
        const upload = uploads.length === 1 ? uploads[0] : null;
        const evidencePath = id === 'reverse-translation' ? 'js/node_modules/.node-case-deadlines/\njs/node_modules/.bun-reverse-files/\n' : 'js/node_modules/.node-case-deadlines/';
        const validShape = upload && !Object.hasOwn(upload, 'run') && job.steps.at(-1) === upload && upload.with?.name === 'node-case-deadlines-${{ github.job }}-${{ inputs.sha }}' && upload.with?.path === evidencePath && upload.with?.['include-hidden-files'] === true && upload.with?.['if-no-files-found'] === 'error';
        if (!validShape) errors.push(`${gateName}/${id}: missing mandatory command evidence uploader for complete Node deadline receipts/raws`);
        if (upload && upload.if !== '${{ always() }}') errors.push(`${gateName}/${id}: conditional deadline evidence loss is forbidden`);
        if (upload?.['continue-on-error']) errors.push(`${gateName}/${id}: deadline evidence uploader cannot ignore failures`);
        // Only this fully checked non-run action may retain evidence after a
        // failure. A name/uses marker never exempts an executable check.
        if (validShape && upload.if === '${{ always() }}' && !upload['continue-on-error']) deadlineEvidenceUpload = upload;
      }
      for (const command of required[id]) if (!runs.includes(command)) errors.push(`${gateName}/${id}: missing mandatory command ${command}`);
      const installations = id === 'lint'
        ? [['npm ci --prefix scripts/ci --ignore-scripts', required[id]], [packageInstall, ['node --test scripts/test/check-js-first-local.test.mjs']]]
        : [[packageInstall, required[id]]];
      if (id === 'typescript') installations.push(['npm ci --prefix ui --ignore-scripts', ['node scripts/build-js-first-ui.mjs']]);
      for (const [install, consumers] of installations) {
        const position = runs.indexOf(install);
        if (position < 0 || consumers.some(command => runs.indexOf(command) >= 0 && position >= runs.indexOf(command))) errors.push(`${gateName}/${id}: locked dependency install must precede its mandatory checks: ${install}`);
      }
      if (!(job?.steps ?? []).some(step => step.env?.EXPECTED_SHA === '${{ inputs.sha }}' && normalizeProgram(step.run) === shaVerifier)) errors.push(`${gateName}/${id}: immutable SHA verification missing`);
      for (const step of job?.steps ?? []) {
        if (step['continue-on-error'] || Object.hasOwn(step, 'if') && step !== deadlineEvidenceUpload) errors.push(`${gateName}/${id}: checks cannot be conditional or ignore failures`);
        if (step.uses?.startsWith('actions/checkout@') && step.with?.ref !== '${{ inputs.sha }}') errors.push(`${gateName}/${id}: checkout must use inputs.sha`);
        if (/\b(?:cargo|rustc|rust-script|clippy-driver)\b|rust-toolchain|docker\/(?:build|setup-buildx)/.test(`${step.uses ?? ''}\n${step.run ?? ''}`)) errors.push(`${gateName}/${id}: Rust must not execute inside JavaScript gate`);
      }
      if (['lint', 'bun-tests', 'typescript', 'translation', 'reverse-translation'].includes(id) && !(job?.steps ?? []).some(step => step.uses === 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6' && step.with?.['bun-version'] === '1.4.3')) errors.push(`${gateName}/${id}: required pinned Bun runtime missing`);
      if (!(job?.steps ?? []).some(step => step.uses?.startsWith('actions/checkout@'))) errors.push(`${gateName}/${id}: immutable checkout missing`);
    }
    const manifest = JSON.parse(fs.readFileSync(new URL('../parity/router-features.json', import.meta.url), 'utf8'));
    if (!(gate.jobs?.parity?.['timeout-minutes'] * 60_000 >= parityCheckBudgets(manifest, '/router').ciParityMs)) errors.push(`${gateName}/parity: deadline cannot contain all four bounded checker calls and acceptance overhead`);
    const aggregate = gate.jobs?.complete;
    if (!aggregate || JSON.stringify([...dependencies(aggregate)].sort()) !== JSON.stringify([...STAGES].sort()) || aggregate.if !== '${{ always() }}' || aggregate['continue-on-error']) errors.push(`${gateName}/complete: must depend on every JavaScript stage`);
    const aggregateSteps = aggregate?.steps ?? [];
    const assertion = aggregateSteps[0];
    if (aggregateSteps.length !== 1 || assertion?.env?.STAGE_RESULTS !== '${{ toJSON(needs) }}' || Object.hasOwn(assertion ?? {}, 'if') || assertion?.['continue-on-error'] || normalizeProgram(assertion?.run) !== aggregateVerifier) errors.push(`${gateName}/complete: must reject skipped, cancelled or failed stages with the unconditional reviewed program`);
    if (Object.keys(gate.jobs ?? {}).some(id => ![...STAGES, 'complete'].includes(id))) errors.push(`${gateName}: unreviewed gate job`);
  }
  for(const name of [...DRAFT_SUPPLEMENTS,'release.yml'])if(!documents.has(name))errors.push(`${name}: missing reviewed required workflow`);
  for (const [name, workflow] of documents) {
    if (name === gateName) continue;
    if (!workflow.jobs || !Object.keys(workflow.jobs).length) { errors.push(`${name}: jobs missing`); continue; }
    if (!workflow.concurrency?.group || workflow.concurrency?.['cancel-in-progress'] !== false) errors.push(`${name}: Rust workflows must set cancel-in-progress: false`);
    const js = workflow.jobs.javascript;
    const draftSupplement=draftSupplementNames.has(name);
    if(draftSupplement)auditDraftSupplement(name,workflow,errors);
    if (!js || js.uses !== './.github/workflows/javascript-first.yml' || js.with?.sha !== '${{ github.sha }}' || (draftSupplement?js.if!==DRAFT_SUPPLEMENT_CONDITION:Object.hasOwn(js, 'if')) || js.needs || js['continue-on-error'] || js.strategy) errors.push(`${name}/javascript: ${draftSupplement?'exact fixed-nine draft-selected':'unconditional'} same-SHA reusable gate missing`);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (id === 'javascript') continue;
      if (Object.hasOwn(job, 'continue-on-error') && job['continue-on-error'] !== false) errors.push(`${name}/${id}: gated verification must not ignore failures`);
      for (const step of job.steps ?? []) if (Object.hasOwn(step, 'continue-on-error') && step['continue-on-error'] !== false) errors.push(`${name}/${id}: gated verification step must not ignore failures`);
      if (job.concurrency?.['cancel-in-progress'] !== undefined && job.concurrency['cancel-in-progress'] !== false) errors.push(`${name}/${id}: job cancellation bypass`);
      if (!dependencies(job).includes('javascript') || !guarded(job.if, 'javascript')) errors.push(`${name}/${id}: explicit JavaScript success dependency missing`);
      if (job.uses === './.github/workflows/javascript-first.yml') {
        const expected = name === 'release.yml' && id === 'release-javascript' ? ['resolve-release-source', '${{ needs.resolve-release-source.outputs.sha }}'] : name === 'benchmarks.yml' && id === 'base-javascript' ? ['resolve-base', '${{ needs.resolve-base.outputs.sha }}'] : null;
        if (!expected || !dependencies(job).includes(expected[0]) || job.with?.sha !== expected[1] || job['continue-on-error'] || job.strategy) errors.push(`${name}/${id}: unreviewed dynamic SHA gate`);
      }
      for (const step of job.steps ?? []) {
        if (!step.uses?.startsWith('actions/checkout@')) continue;
        const ref = step.with?.ref;
        if (ref === undefined || ref === '${{ github.sha }}') continue;
        if (name === 'release.yml' && ref === '${{ needs.resolve-release-source.outputs.sha }}' && dependencies(job).includes('release-javascript') && nestedGuard(job.if, 'javascript', 'release-javascript')) continue;
        errors.push(`${name}/${id}: checkout source lacks an exact-SHA JavaScript gate`);
      }
      const shell = (job.steps ?? []).map(step => step.run ?? '').join('\n');
      if (/git\s+(?:checkout|switch|worktree\s+add)/.test(shell) && !(name === 'benchmarks.yml' && id === 'compare' && dependencies(job).includes('base-javascript') && job.if === "needs.javascript.result == 'success' && (needs.base-javascript.result == 'success')" && (job.steps ?? []).some(step => step.env?.BASE_REF === '${{ needs.resolve-base.outputs.sha }}'))) errors.push(`${name}/${id}: mutable shell source change lacks a reviewed SHA gate`);
      if (job.uses && !job.uses.startsWith('./.github/workflows/')) errors.push(`${name}/${id}: external reusable workflow needs an audited local wrapper`);
      if (job.uses?.startsWith('./.github/workflows/') && !documents.has(path.basename(job.uses))) errors.push(`${name}/${id}: missing local reusable workflow`);
    }
  }
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = path.resolve(process.argv[2] ?? '.github/workflows');
  const sources = Object.fromEntries(fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name)).map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
  const errors = auditWorkflows(sources);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`JavaScript-first gate verified in ${Object.keys(sources).length} workflows.`);
}
