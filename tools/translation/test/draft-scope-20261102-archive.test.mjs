// Independent archive/SCM adapter case source; all execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {readDraftScopeArchive, reportDraftScope} from '../../../scripts/report-router-draft-inventory-scope.mjs';
const revision = 'a'.repeat(40), nextRevision = 'b'.repeat(40), blob = 'c'.repeat(40);
const source = {origin: {revision, path: 'rust/src/main.rs', mode: '100644', blob, bytes: 19},
  role: 'application', itemReview: 'OPEN', unresolved: ['complete-producer-census']};
function fixture(callback) {
  const directory = mkdtempSync(join(tmpdir(), 'router-draft-scope-archive-'));
  const write = (path, value) => writeFileSync(join(directory, path), JSON.stringify(value) + '\n');
  const chunk = JSON.stringify(source) + '\n';
  const manifest = {schema: 'router-source-scope-archive-v2', revision,
    selection: {roots: ['rust/'], exact: []}, physicalSourceRecords: 1,
    storedMetaObservations: 0, metaDiagnostics: 0, sourceChunks: [{path: 'physical-sources-001.jsonl', rows: 1,
      sha256: createHash('sha256').update(chunk).digest('hex')}], observationChunks: [], metaDiagnosticChunks: []};
  write('manifest.json', manifest);
  writeFileSync(join(directory, 'physical-sources-001.jsonl'), chunk);
  write('manual-source-review.json', {schema: 'router-source-scope-v2', revision, sources: [source], entries: [], producers: []});
  write('manual-adoptions.json', []);
  try { callback({directory, write, manifest}); } finally { rmSync(directory, {recursive: true, force: true}); }
}

test('bounded archive joins physical manual origins and rejects changed bytes, counts and paths', () => fixture(({directory, write, manifest}) => {
  assert.equal(readDraftScopeArchive(directory).baseline.sources.length, 1);
  write('manifest.json', {...manifest, physicalSourceRecords: 2});
  assert.throws(() => readDraftScopeArchive(directory));
  write('manifest.json', {...manifest, sourceChunks: [{...manifest.sourceChunks[0], path: '../physical-sources-001.jsonl'}]});
  assert.throws(() => readDraftScopeArchive(directory));
  write('manifest.json', manifest);
  write('manual-source-review.json', {schema: 'router-source-scope-v2', revision,
    sources: [{...source, origin: {...source.origin, blob: 'd'.repeat(40)}}], entries: [], producers: []});
  assert.throws(() => readDraftScopeArchive(directory));
  writeFileSync(join(directory, 'physical-sources-001.jsonl'), '{}');
  assert.throws(() => readDraftScopeArchive(directory));
}));

test('SCM adapter selects whole physical roots and retains new source review gaps without invoking a parser', () => fixture(({directory}) => {
  const calls = [];
  const run = (args, options) => {
    calls.push(args);
    if (args[0] === 'ls-tree') return Buffer.from('100644 blob ' + blob + '\trust/src/main.rs\0' +
      '100644 blob ' + 'd'.repeat(40) + '\trust/src/added.rs\0' +
      '100644 blob ' + 'e'.repeat(40) + '\tother/ignored.rs\0');
    assert.deepEqual(args, ['cat-file', '--batch-check']);
    assert.equal(options.input, blob + '\n' + 'd'.repeat(40) + '\n');
    return Buffer.from(blob + ' blob 19\n' + 'd'.repeat(40) + ' blob 29\n');
  };
  const result = reportDraftScope({directory, revision: nextRevision, run});
  assert.deepEqual(result.report.addedSources, ['rust/src/added.rs']);
  assert.equal(result.report.productionFunctionDenominator, null);
  assert.equal(result.report.hasBlockingChanges, true);
  assert.ok(result.report.unresolved.some(row => row.key === 'rust/src/added.rs'));
  assert.equal(calls.length, 2);
}));
