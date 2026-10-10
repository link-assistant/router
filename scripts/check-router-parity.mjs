#!/usr/bin/env node
/** Execute native evidence and validate the entire declared Rust/OpenAPI scope. */
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
const exec = promisify(execFile), root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'parity/router-features.json'), 'utf8'));
const catalog = JSON.parse(await readFile(resolve(root, 'packages/javascript/catalog.json'), 'utf8'));
const spec = JSON.parse(await readFile(resolve(root, 'openapi/router.yaml'), 'utf8'));
const docs = await readFile(resolve(root, 'docs/integration/operations.md'), 'utf8');
const strict = process.argv.includes('--strict');
if (process.argv.slice(2).some(argument => argument !== '--strict')) throw new Error('Usage: check-router-parity.mjs [--strict]');
const { nativeOperationSupport } = await import('../packages/javascript/native/operations.mjs');
const errors = [], gaps = [], ids = new Set(), operations = new Set(), routes = new Set(), runners = new Map();
const expected = new Set(catalog.operations.map(operation => operation.name));
const httpMethods = new Set(['get','post','put','patch','delete','options','head','trace']);
const expectedRoutes = new Set(Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods).filter(method => httpMethods.has(method)).map(method => `${method.toUpperCase()} ${path}`)));
const mandatory = ['native.authorization','native.persistence','native.accounts','native.routing','native.configuration','native.http','native.protocols','native.streams','native.management','native.operations'];
async function localFile(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error('Evidence paths must be nonempty repository-relative paths');
  const absolute = resolve(root, path);
  if (relative(root, absolute).startsWith('..')) throw new Error(`Evidence escapes repository: ${path}`);
  if (!(await stat(absolute)).isFile()) throw new Error(`Evidence is not a file: ${path}`);
  return absolute;
}
async function runEvidence(evidence) {
  const path = await localFile(evidence.file), key = `${evidence.test ? 'test:' : 'fixture:'}${path}`;
  if (!runners.has(key)) runners.set(key, (async () => {
    if (evidence.test) {
      const { stdout } = await exec(process.execPath, ['--test','--test-reporter=tap',path], { cwd: root, timeout: 60_000, maxBuffer: 4_194_304 });
      return new Map([...stdout.matchAll(/^ok \d+ - (.+)$/gm)].filter(match => !match[1].includes('# SKIP')).map(match => [match[1], { success: true }]));
    }
    const module = await import(pathToFileURL(path).href), run = module.runParityFixtures ?? module.runOperationFixtures;
    if (typeof run !== 'function') throw new Error(`Evidence module needs runParityFixtures/runOperationFixtures: ${evidence.file}`);
    const results = await run();
    if (!(results instanceof Map)) throw new Error(`Evidence runner must return Map: ${evidence.file}`);
    return results;
  })());
  const name = evidence.test ?? evidence.fixture;
  if (typeof name !== 'string' || !name) throw new Error('Missing executable fixture/test name');
  const result = (await runners.get(key)).get(name);
  if (!result || typeof result.success !== 'boolean') throw new Error(`Evidence case did not execute successfully: ${name}`);
  return result;
}
if (manifest.schema !== 'link-assistant-router/native-parity/v1' || !Array.isArray(manifest.features)) errors.push('Invalid manifest schema/features');
const documented = [...docs.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
if (documented.length !== expected.size || documented.some(name => !expected.has(name))) errors.push('Operation matrix and canonical catalog disagree');
for (const feature of manifest.features ?? []) {
  try {
    if (!feature.id || ids.has(feature.id)) throw new Error(`Missing/duplicate feature id: ${feature.id}`);
    ids.add(feature.id);
    if (!['implemented','partial','unsupported'].includes(feature.status)) throw new Error('Invalid feature status');
    if (feature.operation) {
      if (!expected.has(feature.operation) || operations.has(feature.operation)) throw new Error(`Unknown/duplicate operation ${feature.operation}`);
      operations.add(feature.operation);
      if (feature.status !== (nativeOperationSupport[feature.operation] ?? 'unsupported')) throw new Error(`Dispatcher support status disagrees for ${feature.operation}`);
      const contract = JSON.parse(await readFile(await localFile(`packages/javascript/schemas/${feature.operation.replaceAll('.', '-')}.v1.json`), 'utf8'));
      if (contract.properties.operation.const !== feature.operation) throw new Error('Operation schema mismatch');
    }
    let route;
    if (feature.route) {
      route = `${feature.route.method} ${feature.route.path}`;
      if (!expectedRoutes.has(route) || routes.has(route)) throw new Error(`Unknown/duplicate OpenAPI route: ${route}`);
      routes.add(route);
    }
    for (const field of ['implementation','rust']) {
      if (!Array.isArray(feature[field]) || !feature[field].length) throw new Error(`Missing ${field} references`);
      for (const file of feature[field]) await localFile(file);
    }
    if (!Array.isArray(feature.evidence) || !feature.evidence.length) throw new Error('Missing executable evidence');
    for (const evidence of feature.evidence) {
      const result = await runEvidence(evidence);
      if (feature.operation && result.operation !== feature.operation) throw new Error('Fixture covers another operation');
      if (route && result.route !== route) throw new Error('Fixture covers another OpenAPI route');
      if (feature.status !== 'unsupported' && !result.success) throw new Error('Successful native behavior missing');
      if (feature.status === 'unsupported' && result.success) throw new Error('Unsupported entry has success evidence');
      // HTTP success proves only the tested native subset, never the entire Rust route contract.
      if (route && result.success && feature.status !== 'partial' && !result.fullParity) throw new Error('Route evidence does not certify full Rust contract parity');
    }
    if (feature.status !== 'implemented') {
      if (!Array.isArray(feature.gaps) || !feature.gaps.length || feature.gaps.some(gap => typeof gap !== 'string' || !gap)) throw new Error('Incomplete entry needs explicit gaps');
      gaps.push(feature.id);
    }
  } catch (error) { errors.push(`${feature.id ?? 'unknown'}: ${error.message}`); }
}
for (const operation of expected) if (!operations.has(operation)) errors.push(`Missing operation inventory: ${operation}`);
for (const route of expectedRoutes) if (!routes.has(route)) errors.push(`Missing OpenAPI route inventory: ${route}`);
for (const id of mandatory) if (!ids.has(id)) errors.push(`Missing native feature inventory: ${id}`);
const coveredNative = new Set((manifest.features ?? []).flatMap(feature => feature.implementation ?? []));
for (const name of await readdir(resolve(root, 'packages/javascript/native'))) {
  if (name.endsWith('.mjs') && !coveredNative.has(`packages/javascript/native/${name}`)) errors.push(`Native module missing feature/evidence references: ${name}`);
}
let translation;
try {
  if (manifest.translation_inventory !== 'parity/rust-source-inventory.json') throw new Error('Canonical Rust source inventory reference is required');
  translation = JSON.parse(await readFile(await localFile(manifest.translation_inventory), 'utf8'));
  const { stdout } = await exec('git', ['ls-files','-z','--','*.rs'], { cwd: root, maxBuffer: 4_194_304 });
  const tracked = new Set(stdout.split('\0').filter(Boolean)), seen = new Set(), totals = { sources: 0, executable: 0, carried: 0, preserved: 0 };
  for (const source of translation.sources ?? []) {
    if (!tracked.has(source.source) || seen.has(source.source)) throw new Error(`Unknown/duplicate Rust source: ${source.source}`);
    seen.add(source.source);
    const bytes = await readFile(await localFile(source.source));
    if (bytes.length !== source.bytes || createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new Error(`Stale Rust source hash: ${source.source}`);
    const meta = JSON.parse(await readFile(await localFile(source.targets.meta), 'utf8'));
    if (meta.sourcePath !== source.source || meta.sourceSha256 !== source.sha256 || meta.sourceBytes !== source.bytes) throw new Error(`Translation metadata source mismatch: ${source.source}`);
    for (const kind of ['executable','carried','preserved']) {
      const count = meta.items.filter(item => item.status === kind).length;
      if (source[kind] !== count || meta.counts[kind] !== count) throw new Error(`Invalid translation ${kind} count: ${source.source}`);
      totals[kind] += count;
    }
    for (const language of ['javascript','typescript']) await localFile(source.targets[language]);
    totals.sources++;
  }
  for (const source of tracked) if (!seen.has(source)) throw new Error(`Missing tracked Rust source: ${source}`);
  for (const [kind, total] of Object.entries(totals)) if (translation.totals?.[kind] !== total) throw new Error(`Translation total mismatch: ${kind}`);
  // Run the deterministic translator's check mode to reject edited/stale generated artifacts.
  await exec(process.execPath, ['scripts/translate-router.mjs','--check'], { cwd: root, timeout: 60_000, maxBuffer: 4_194_304 });
  if (translation.runtimeParity !== true || totals.carried || translation.sources.some(source => source.runtimeParity !== true))
    gaps.push(`translation: ${totals.carried} carried items; full runtime parity is unverified`);
} catch (error) { errors.push(`Rust source inventory: ${error.message}`); }
for (const error of errors) console.error(error);
console.log(`Native parity inventory: ${ids.size} features; ${operations.size}/${expected.size} operations; ${routes.size}/${expectedRoutes.size} OpenAPI routes; ${gaps.length} draft gaps; ${errors.length} validation errors.`);
if (translation) console.log(`Rust translation inventory: ${translation.totals?.sources} sources; ${translation.totals?.carried} carried items; runtimeParity=${translation.runtimeParity}.`);
if (gaps.length) console.log(`Draft gaps include: ${gaps.slice(0, 8).join(', ')}${gaps.length > 8 ? `, and ${gaps.length - 8} more` : ''}`);
if (strict && gaps.length) console.error('Strict native parity failed: partial/unsupported routes, feature gaps and carried Rust logic do not satisfy full behavioral parity. Rust must remain gated.');
else if (!errors.length && gaps.length) console.log('Draft inventory validation passed; this does not certify feature parity or unlock Rust builds.');
process.exitCode = errors.length || (strict && gaps.length) ? 1 : 0;
