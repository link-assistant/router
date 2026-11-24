// Deferred bookkeeping CLI. Source drafted only; do not run during bulk drafting.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {draftInventoryPath, draftInventorySelection} from '../tools/translation/draft-inventory-reconciliation.mjs';
import {reconcileDraftScope} from '../tools/translation/draft-inventory-scope.mjs';
import {readSelectedGitSizeRecords} from '../tools/translation/selected-git-size-records.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = join(root, 'docs/development/draft-inventory/scope-20261102');
const fail = message => { throw new TypeError('Draft scope report: ' + message); };
const readJSON = path => {
  const raw = readFileSync(path);
  if (raw.length > 8 * 1024 * 1024) fail('JSON byte bound');
  return JSON.parse(raw.toString('utf8'));
};
function chunks(directory, descriptors, prefix) {
  if (!Array.isArray(descriptors) || descriptors.length > 1000) fail('chunk bound');
  const result = [], seen = new Set();
  let totalBytes = 0;
  for (const chunk of descriptors) {
    draftInventoryPath(chunk.path);
    if (!chunk.path.startsWith(prefix + '-') || !/^[a-z-]+-[0-9]{3}\.jsonl$/u.test(chunk.path) ||
        seen.has(chunk.path) || !/^[a-f0-9]{64}$/u.test(chunk.sha256) ||
        !Number.isSafeInteger(chunk.rows) || chunk.rows < 1 || chunk.rows > 200) fail('chunk descriptor');
    seen.add(chunk.path);
    const raw = readFileSync(join(directory, chunk.path));
    totalBytes += raw.length;
    if (totalBytes > 64 * 1024 * 1024) fail('complete chunk byte bound');
    if (raw.length > 8 * 1024 * 1024 || createHash('sha256').update(raw).digest('hex') !== chunk.sha256) fail('chunk byte mismatch');
    const body = raw.toString('utf8');
    if (!body.endsWith('\n')) fail('truncated chunk');
    const lines = body.slice(0, -1).split('\n');
    if (lines.length !== chunk.rows) fail('chunk row mismatch');
    result.push(...lines.map(line => JSON.parse(line)));
    if (result.length > 100_000) fail('row bound');
  }
  return result;
}
export function readDraftScopeArchive(directory = archive) {
  const manifest = readJSON(join(directory, 'manifest.json'));
  if (manifest.schema !== 'router-source-scope-archive-v2' || !/^[a-f0-9]{40}$/u.test(manifest.revision)) fail('archive schema/revision');
  draftInventorySelection(manifest.selection);
  const sources = chunks(directory, manifest.sourceChunks, 'physical-sources');
  const observations = chunks(directory, manifest.observationChunks, 'stored-meta-observations');
  const diagnostics = chunks(directory, manifest.metaDiagnosticChunks, 'stored-meta-diagnostics');
  if (sources.length !== manifest.physicalSourceRecords || observations.length !== manifest.storedMetaObservations ||
      diagnostics.length !== manifest.metaDiagnostics) fail('archive complete row counts');
  const manual = readJSON(join(directory, 'manual-source-review.json'));
  const adoptions = readJSON(join(directory, 'manual-adoptions.json'));
  if (manual.revision !== manifest.revision || manual.schema !== 'router-source-scope-v2' ||
      !Array.isArray(manual.sources) || !Array.isArray(manual.entries) || !Array.isArray(manual.producers)) fail('manual review schema');
  const overrides = new Map(manual.sources.map(source => [source.origin.path, source]));
  if (overrides.size !== manual.sources.length) fail('duplicate manual source');
  const merged = sources.map(source => {
    const replacement = overrides.get(source.origin.path);
    if (!replacement) return source;
    if (JSON.stringify(replacement.origin) !== JSON.stringify(source.origin)) fail('manual origin differs');
    overrides.delete(source.origin.path);
    return replacement;
  });
  if (overrides.size) fail('manual source outside archive');
  return {manifest, observations, diagnostics, adoptions,
    baseline: {...manual, sources: merged}};
}
export function reportDraftScope({revision, directory = archive, run = (args, options) =>
  execFileSync('git', args, {cwd: root, maxBuffer: 32 * 1024 * 1024, ...options})} = {}) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/u.test(revision)) fail('explicit full SHA required');
  const data = readDraftScopeArchive(directory), before = new Map(data.baseline.sources.map(source => [source.origin.path, source]));
  const selected = draftInventorySelection(data.manifest.selection);
  const sources = readSelectedGitSizeRecords({run, revision, select: selected,
    maxPaths: 100_000, maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 512 * 1024 * 1024}).map(record => {
    const tab = record.indexOf('\t'), [mode, , blob, bytes] = record.slice(0, tab).split(' '), path = record.slice(tab + 1);
    const origin = {revision, path, blob, mode, bytes: Number(bytes)}, prior = before.get(path);
    const unchanged = prior && prior.origin.blob === blob && prior.origin.mode === mode && prior.origin.bytes === Number(bytes);
    return unchanged ? {...prior, origin} : {origin, role: 'unclassified', itemReview: 'OPEN',
      unresolved: ['new-or-changed-complete-source-item-role-configuration-producer-and-adoption-review']};
  });
  const after = new Map(sources.map(source => [source.origin.path, source]));
  const unchanged = path => {
    const left = before.get(path)?.origin, right = after.get(path)?.origin;
    return left && right && left.blob === right.blob && left.mode === right.mode && left.bytes === right.bytes;
  };
  // Carry only exact unchanged physical-source observations, never reparse or
  // guess changed entry identities. Missing entry reviews remain explicit.
  const entries = data.baseline.entries.filter(entry => unchanged(entry.origin.path))
    .map(entry => ({...entry, origin: after.get(entry.origin.path).origin}));
  const producers = data.baseline.producers.filter(producer => after.has(producer.sourcePath) &&
    [...producer.inputs, ...producer.outputs].every(path => after.has(path)))
    .map(producer => unchanged(producer.sourcePath) && [...producer.inputs, ...producer.outputs].every(unchanged) ? producer :
      {...producer, expansion: 'unknown', reviewStatus: 'OPEN', unresolved: [...new Set([...producer.unresolved, 'producer-input-or-output-changed'])]});
  const producerIds = new Set(producers.map(producer => producer.id));
  const current = {schema: 'router-source-scope-v2', revision, sources,
    entries: entries.filter(entry => entry.producer === null || producerIds.has(entry.producer)), producers};
  return {baselineRevision: data.manifest.revision, currentRevision: revision,
    scope: 'committed physical-source and manual DATA reconciliation; not a full function census',
    storedMetaObservations: data.observations.length, retainedMetaDiagnostics: data.diagnostics,
    report: reconcileDraftScope({baseline: data.baseline, current, adoptions: data.adoptions})};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1) fail('one explicit immutable SHA required');
  const result = reportDraftScope({revision: args[0]});
  console.log(JSON.stringify(result, null, 2));
  // Refuse acceptance while any source/item/producer/adoption gap remains.
  // A zero exit would still be DATA bookkeeping, never compiler authority.
  if (result.report.hasBlockingChanges) process.exitCode = 2;
}
