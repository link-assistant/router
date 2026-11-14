// Author the temporary workflow requested in PR #785 without changing any
// strict translation job, its tests or deadlines. YAML ranges select only the
// actual caller scalars; no embedded shell, comments or sources are rewritten.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { MANUAL_WORKFLOW, RUST_BLOCK, MANUAL_OUTPUTS, manualJobs } from '../../scripts/manual-development-policy.mjs';
const require = createRequire(new URL('../../scripts/ci/package.json', import.meta.url));
const { parseDocument, stringify } = require('yaml');
const directory = '.github/workflows';
const workflow = { name: 'JavaScript Development (temporary manual translation)',
  on: { workflow_call: { inputs: { sha: { description: 'Immutable source commit for temporary manual development checks', required: true, type: 'string' } }, outputs: MANUAL_OUTPUTS } },
  permissions: { contents: 'read' }, jobs: manualJobs() };
fs.writeFileSync(`${directory}/${MANUAL_WORKFLOW}`, '# Temporary policy: docs/development/manual-translation-development.md\n' + stringify(workflow, { lineWidth: 0 }));
for (const name of fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name) && !['javascript-first.yml', MANUAL_WORKFLOW].includes(name))) {
  const file = `${directory}/${name}`, source = fs.readFileSync(file, 'utf8');
  const document = parseDocument(source, { uniqueKeys: true, version: '1.2' });
  if (document.errors.length) throw Error(`Malformed workflow: ${name}`);
  const jobs = document.get('jobs', true), edits = [];
  for (const { key, value: job } of jobs.items) {
    const uses = job.get('uses', true);
    if (uses?.value === './.github/workflows/javascript-first.yml') edits.push({ range: uses.range, value: `./.github/workflows/${MANUAL_WORKFLOW}` });
    if (key.value === 'javascript') continue;
    const condition = job.get('if', true);
    if (!condition || typeof condition.value !== 'string' || !condition.value.startsWith("needs.javascript.result == 'success'")) throw Error(`Unreviewed caller guard: ${name}/${key.value}`);
    edits.push({ range: condition.range, value: `${RUST_BLOCK}${condition.value})` });
  }
  let result = source;
  for (const edit of edits.sort((a, b) => b.range[0] - a.range[0])) result = result.slice(0, edit.range[0]) + edit.value + result.slice(edit.range[1]);
  const after = parseDocument(result, { uniqueKeys: true, version: '1.2' });
  if (after.errors.length) throw Error(`Malformed edited workflow: ${name}`);
  // Complete inverse before writing the authored caller changes.
  let restored = result;
  const reverse = [];
  for (const { key, value: job } of after.get('jobs', true).items) {
    const uses = job.get('uses', true);
    if (uses?.value === `./.github/workflows/${MANUAL_WORKFLOW}`) reverse.push({ range: uses.range, value: './.github/workflows/javascript-first.yml' });
    if (key.value !== 'javascript') {
      const condition = job.get('if', true);
      if (!condition.value.startsWith(RUST_BLOCK) || !condition.value.endsWith(')')) throw Error('Caller inverse guard differs');
      reverse.push({ range: condition.range, value: condition.value.slice(RUST_BLOCK.length, -1) });
    }
  }
  for (const edit of reverse.sort((a, b) => b.range[0] - a.range[0])) restored = restored.slice(0, edit.range[0]) + edit.value + restored.slice(edit.range[1]);
  if (restored !== source) throw Error(`Complete caller inverse differs: ${name}`);
  fs.writeFileSync(file, result);
  console.log(JSON.stringify({ file, changedScalars: edits.length, completeInverse: true }));
}
