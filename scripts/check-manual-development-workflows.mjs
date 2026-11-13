#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { auditWorkflows } from './check-js-first-workflows.mjs';
import { MANUAL_WORKFLOW, RUST_BLOCK, MANUAL_OUTPUTS, manualJobs } from './manual-development-policy.mjs';
const require = createRequire(new URL('./ci/package.json', import.meta.url));
const { parseDocument, stringify } = require('yaml');

export function readWorkflowSources(directory = '.github/workflows') {
  return Object.fromEntries(fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name))
    .map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]));
}

export function auditManualDevelopment(sources) {
  const errors = [], documents = new Map();
  for (const [name, source] of Object.entries(sources)) {
    try {
      const doc = parseDocument(source, { uniqueKeys: true, version: '1.2' });
      if (doc.errors.length) errors.push(...doc.errors.map(error => `${name}: ${error.message}`));
      else documents.set(name, doc.toJS());
    } catch (error) { errors.push(`${name}: ${error.message}`); }
  }
  if (errors.length) return errors;
  const manual = documents.get(MANUAL_WORKFLOW);
  if (!manual || !isDeepStrictEqual(Object.keys(manual).sort(), ['jobs', 'name', 'on', 'permissions'])) {
    errors.push(`${MANUAL_WORKFLOW}: required reusable manual development workflow missing or unexpected fields`);
  }
  const call = manual?.on?.workflow_call;
  if (!call || Object.keys(manual.on).length !== 1 ||
      !isDeepStrictEqual(Object.keys(call).sort(), ['inputs', 'outputs']) ||
      Object.keys(call.inputs ?? {}).length !== 1 || call.inputs?.sha?.required !== true || call.inputs?.sha?.type !== 'string' ||
      !isDeepStrictEqual(call.outputs, MANUAL_OUTPUTS)) errors.push(`${MANUAL_WORKFLOW}: immutable SHA input and aggregate-derived Rust admission output required`);
  if (!isDeepStrictEqual(manual?.permissions, { contents: 'read' })) errors.push(`${MANUAL_WORKFLOW}: read-only permissions required`);
  const expected = manualJobs();
  if (!isDeepStrictEqual(Object.keys(manual?.jobs ?? {}).sort(), Object.keys(expected).sort())) errors.push(`${MANUAL_WORKFLOW}: exact active development stages and aggregate required`);
  for (const [id, job] of Object.entries(expected)) {
    if (!isDeepStrictEqual(manual?.jobs?.[id], job)) errors.push(`${MANUAL_WORKFLOW}/${id}: required complete commands, SHA checks, original deadlines and failure handling differ`);
  }

  // Independently check the actual manual lane above. Then audit a *structural
  // policy projection* with the original strict audit: restore only the caller
  // edge and remove only the additional, validated Rust admission guard.
  // This checks conserved source policy, never claims those strict jobs ran.
  const projected = { ...sources };
  delete projected[MANUAL_WORKFLOW];
  const manualRef = `./.github/workflows/${MANUAL_WORKFLOW}`;
  for (const [name, workflow] of documents) {
    if (name === MANUAL_WORKFLOW || name === 'javascript-first.yml') continue;
    if (workflow?.jobs?.javascript?.uses !== manualRef) errors.push(`${name}/javascript: temporary manual development caller required`);
    for (const [id, job] of Object.entries(workflow?.jobs ?? {})) {
      if (job.uses === manualRef) job.uses = './.github/workflows/javascript-first.yml';
      if (id === 'javascript') continue;
      const condition = job.if;
      if (typeof condition !== 'string' || !condition.startsWith(RUST_BLOCK) || !condition.endsWith(')')) {
        errors.push(`${name}/${id}: explicit same-SHA Rust/release admission guard missing`);
      } else job.if = condition.slice(RUST_BLOCK.length, -1);
    }
    projected[name] = stringify(workflow);
  }
  try { errors.push(...auditWorkflows(projected)); }
  catch (error) { errors.push(`Conserved strict source policy: ${error.message}`); }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = auditManualDevelopment(readWorkflowSources(process.argv[2]));
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('Temporary manual development workflow policy verified. Automated translation is suspended; strict parity is unverified; Rust CI runs only after every active stage passes for the same SHA.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
