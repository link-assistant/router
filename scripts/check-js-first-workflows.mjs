#!/usr/bin/env node
// Every runner job is gated, even if its shell script hides a Rust/Docker build.
// YAML is parsed structurally; comments, quoted strings, matrices and multiline
// conditions cannot masquerade as dependencies or satisfy this policy.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('./ci/package.json', import.meta.url));
const { parseDocument } = require('yaml');
export const STAGES = ['lint', 'node-tests', 'bun-tests', 'typescript', 'parity', 'translation', 'reverse-translation'];
const success = (id) => `needs.${id}.result == 'success'`;
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
      lint: ['node scripts/lint-js-first.mjs', 'node --test scripts/test/check-js-first-workflows.test.mjs', 'node --test scripts/test/check-js-first-local.test.mjs', 'node scripts/check-js-first-workflows.mjs'],
      'node-tests': ['npm run native:test --prefix packages/javascript'],
      'bun-tests': ['npm run native:test:bun --prefix packages/javascript'],
      typescript: ['npm run typecheck --prefix packages/javascript', 'npm run native:typecheck --prefix packages/javascript', 'node scripts/regenerate-native-typescript.mjs --check', 'node scripts/check-native-typescript.mjs', 'node --test tools/translation/js-to-rust/test/native-typescript.test.mjs', 'node packages/javascript/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json', 'node tools/translation/check-typescript-fixtures.mjs', 'node scripts/build-js-first-ui.mjs'],
      parity: ['node --test experiments/issue-759/acceptance/*.test.mjs', 'node scripts/check-router-parity.mjs --strict'],
      translation: ['node scripts/translate-router.mjs --check', 'node --test tools/translation/test/*.test.mjs'],
      'reverse-translation': ['node scripts/regenerate-js-first.mjs --check', 'node --test tools/translation/js-to-rust/test/translator.test.mjs'],
    };
    for (const id of STAGES) {
      const job = gate.jobs?.[id];
      if (!job || !job['runs-on'] || Object.hasOwn(job, 'if') || job['continue-on-error'] || job.strategy?.['fail-fast'] === true) errors.push(`${gateName}/${id}: required unconditional failing stage missing`);
      const runs = (job?.steps ?? []).map(step => step.run);
      for (const command of required[id]) if (!runs.includes(command)) errors.push(`${gateName}/${id}: missing mandatory command ${command}`);
      if (!(job?.steps ?? []).some(step => step.env?.EXPECTED_SHA === '${{ inputs.sha }}' && step.run?.includes('rev-parse') && step.run?.includes('process.exit(1)'))) errors.push(`${gateName}/${id}: immutable SHA verification missing`);
      for (const step of job?.steps ?? []) {
        if (step['continue-on-error'] || Object.hasOwn(step, 'if')) errors.push(`${gateName}/${id}: checks cannot be conditional or ignore failures`);
        if (step.uses?.startsWith('actions/checkout@') && step.with?.ref !== '${{ inputs.sha }}') errors.push(`${gateName}/${id}: checkout must use inputs.sha`);
        if (/\b(?:cargo|rustc|rust-script|clippy-driver)\b|rust-toolchain|docker\/(?:build|setup-buildx)/.test(`${step.uses ?? ''}\n${step.run ?? ''}`)) errors.push(`${gateName}/${id}: Rust must not execute inside JavaScript gate`);
      }
      if (['bun-tests', 'typescript'].includes(id) && !(job?.steps ?? []).some(step => step.uses === 'oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6' && step.with?.['bun-version'] === '1.4.3')) errors.push(`${gateName}/${id}: required pinned Bun runtime missing`);
      if (!(job?.steps ?? []).some(step => step.uses?.startsWith('actions/checkout@'))) errors.push(`${gateName}/${id}: immutable checkout missing`);
    }
    const aggregate = gate.jobs?.complete;
    if (!aggregate || JSON.stringify([...dependencies(aggregate)].sort()) !== JSON.stringify([...STAGES].sort()) || aggregate.if !== '${{ always() }}' || aggregate['continue-on-error']) errors.push(`${gateName}/complete: must depend on every JavaScript stage`);
    const assertion = (aggregate?.steps ?? []).map(step => step.run ?? '').join('\n');
    if (!assertion.includes('Object.values') || !assertion.includes("!== 'success'") || !assertion.includes('process.exit(1)')) errors.push(`${gateName}/complete: must reject skipped, cancelled or failed stages`);
    if (Object.keys(gate.jobs ?? {}).some(id => ![...STAGES, 'complete'].includes(id))) errors.push(`${gateName}: unreviewed gate job`);
  }
  for (const [name, workflow] of documents) {
    if (name === gateName) continue;
    if (!workflow.jobs || !Object.keys(workflow.jobs).length) { errors.push(`${name}: jobs missing`); continue; }
    if (!workflow.concurrency?.group || workflow.concurrency?.['cancel-in-progress'] !== false) errors.push(`${name}: Rust workflows must set cancel-in-progress: false`);
    const js = workflow.jobs.javascript;
    if (!js || js.uses !== './.github/workflows/javascript-first.yml' || js.with?.sha !== '${{ github.sha }}' || Object.hasOwn(js, 'if') || js.needs || js['continue-on-error'] || js.strategy) errors.push(`${name}/javascript: unconditional same-SHA reusable gate missing`);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (id === 'javascript') continue;
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
