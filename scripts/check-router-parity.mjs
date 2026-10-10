#!/usr/bin/env node
/** Executable draft inventory validation; --strict is the full parity/Rust gate. */
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'parity/router-features.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(root, 'packages/javascript/catalog.json'), 'utf8'));
const docs = await readFile(resolve(root, 'docs/integration/operations.md'), 'utf8');
const strict = process.argv.includes('--strict');
if (process.argv.slice(2).some(argument => argument !== '--strict')) throw new Error('Usage: check-router-parity.mjs [--strict]');
const { nativeOperationSupport } = await import('../packages/javascript/native/operations.mjs');
const errors = [], gaps = [], ids = new Set(), operations = new Set(), runners = new Map();
async function localFile(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error('Evidence paths must be nonempty repository-relative paths');
  const absolute = resolve(root, path);
  if (relative(root, absolute).startsWith('..')) throw new Error(`Evidence escapes repository: ${path}`);
  if (!(await stat(absolute)).isFile()) throw new Error(`Evidence is not a file: ${path}`);
  return absolute;
}
if (manifest.schema !== 'link-assistant-router/native-parity/v1' || !Array.isArray(manifest.features)) errors.push('Invalid manifest schema/features');
const expected = new Set(catalog.operations.map(operation => operation.name));
const documented = [...docs.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
if (documented.length !== expected.size || documented.some(name => !expected.has(name))) errors.push('Operation matrix and canonical catalog disagree');
for (const feature of manifest.features ?? []) {
  try {
    if (!feature.id || ids.has(feature.id)) throw new Error(`Missing/duplicate feature id: ${feature.id}`);
    ids.add(feature.id);
    if (!['implemented', 'partial', 'unsupported'].includes(feature.status)) throw new Error(`Invalid status for ${feature.id}`);
    if (feature.operation) {
      if (!expected.has(feature.operation) || operations.has(feature.operation)) throw new Error(`Unknown/duplicate operation ${feature.operation}`);
      operations.add(feature.operation);
      if (feature.status !== (nativeOperationSupport[feature.operation] ?? 'unsupported')) throw new Error(`Dispatcher support status disagrees for ${feature.operation}`);
      const schema = await localFile(`packages/javascript/schemas/${feature.operation.replaceAll('.', '-')}.v1.json`);
      const contract = JSON.parse(await readFile(schema, 'utf8'));
      if (contract.properties.operation.const !== feature.operation) throw new Error(`Operation schema mismatch ${feature.operation}`);
    }
    if (!Array.isArray(feature.implementation) || !feature.implementation.length) throw new Error(`Missing implementation references for ${feature.id}`);
    for (const file of feature.implementation) await localFile(file);
    if (!Array.isArray(feature.evidence) || !feature.evidence.length) throw new Error(`Missing executable evidence for ${feature.id}`);
    for (const evidence of feature.evidence) {
      const path = await localFile(evidence.file);
      if (typeof evidence.fixture !== 'string' || !evidence.fixture) throw new Error(`Missing fixture id for ${feature.id}`);
      if (!runners.has(path)) {
        runners.set(path, (async () => {
          const module = await import(pathToFileURL(path).href);
          const run = module.runParityFixtures ?? module.runOperationFixtures;
          if (typeof run !== 'function') throw new Error(`Evidence module must export runParityFixtures/runOperationFixtures: ${evidence.file}`);
          const results = await run();
          if (!(results instanceof Map)) throw new Error(`Evidence runner must return Map: ${evidence.file}`);
          return results;
        })());
      }
      const result = (await runners.get(path)).get(evidence.fixture);
      if (!result || typeof result.success !== 'boolean') throw new Error(`Fixture did not run: ${evidence.fixture}`);
      if (feature.operation && result.operation !== feature.operation) throw new Error(`Fixture covers another operation: ${feature.id}`);
      if (feature.status !== 'unsupported' && !result.success) throw new Error(`Successful native behavior missing: ${feature.id}`);
      if (feature.status === 'unsupported' && result.success) throw new Error(`Unsupported entry has success evidence: ${feature.id}`);
    }
    if (feature.status !== 'implemented') {
      if (!Array.isArray(feature.gaps) || !feature.gaps.length || feature.gaps.some(gap => typeof gap !== 'string' || !gap)) throw new Error(`Incomplete entry needs explicit gaps: ${feature.id}`);
      gaps.push(feature.id);
    }
  } catch (error) { errors.push(`${feature.id ?? 'unknown'}: ${error.message}`); }
}
for (const operation of expected) if (!operations.has(operation)) errors.push(`Missing operation inventory: ${operation}`);
for (const error of errors) console.error(error);
console.log(`Native parity inventory: ${ids.size} entries; ${operations.size}/${expected.size} operations; ${gaps.length} draft gaps; ${errors.length} validation errors.`);
if (gaps.length) console.log(`Incomplete native features: ${gaps.join(', ')}`);
if (strict && gaps.length) console.error('Strict native parity failed: partial and unsupported features do not satisfy full behavioral parity. Rust must remain gated.');
else if (!errors.length && gaps.length) console.log('Draft inventory validation passed; this result does not certify feature parity or unlock Rust builds.');
process.exitCode = errors.length || (strict && gaps.length) ? 1 : 0;
