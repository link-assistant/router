// Independent bookkeeping cases; UNRUN during bulk drafting. No translator,
// TypeScript, Rust, Cargo, build, installation or generated output is invoked.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {DRAFT_REQUIREMENT_IDS, draftInventoryPath, draftInventorySelection,
  reconcileDraftInventory} from '../draft-inventory-reconciliation.mjs';
import {readDraftInventory} from '../../../scripts/report-router-draft-inventory.mjs';

const selection = {roots: ['rust/src/', 'js/src/', 'ts/src/'], exact: ['rust/Cargo.toml']};
const row = (path, extra = {}) => ({path, blob: 'a'.repeat(40), mode: '100644', bytes: 12,
  role: 'native-application-review', draftIds: ['F01'], reviewStatus: 'OPEN',
  functionReviewAnchors: [[1, 'answer']], unresolved: ['exact-item-review'], ...extra});
const run = (baseline, current) => reconcileDraftInventory({baseline, current, selection});

test('all 70 IDs stay distinct and a matching snapshot grants no completion or authority', () => {
  assert.equal(DRAFT_REQUIREMENT_IDS.length, 70);
  assert.equal(new Set(DRAFT_REQUIREMENT_IDS).size, 70);
  const source = row('rust/src/main.rs'), result = run([source], [source]);
  assert.equal(result.pathSnapshotMatches, true);
  assert.equal(result.scopeReviewComplete, false);
  assert.deepEqual(result.needsReview, ['rust/src/main.rs']);
  for (const key of ['functionCount', 'draftedRequirements', 'translationCoverage']) assert.equal(result[key], null);
  assert.equal(result.semanticAuthority, false);
  assert.equal(result.executionEvidence, 'UNRUN');
  assert.deepEqual(result.affectedRequirements.F01, ['rust/src/main.rs']);
});

test('new removed modified mode-changed and unassigned paths remain explicit', () => {
  const baseline = [row('rust/src/removed.rs'), row('rust/src/changed.rs'),
    row('rust/src/mode.rs'), row('js/src/unassigned.mjs', {draftIds: []})];
  const current = [row('rust/src/changed.rs', {blob: 'b'.repeat(40)}),
    row('rust/src/mode.rs', {mode: '100755'}), row('js/src/unassigned.mjs'), row('ts/src/added.ts')];
  const result = run(baseline, current);
  assert.deepEqual(result.added, ['ts/src/added.ts']);
  assert.deepEqual(result.removed, ['rust/src/removed.rs']);
  assert.deepEqual(result.changed, ['rust/src/changed.rs', 'rust/src/mode.rs']);
  assert.deepEqual(result.unassigned, ['js/src/unassigned.mjs']);
  assert.equal(result.pathSnapshotMatches, false);
  // Identical blob rename candidates remain two explicit edits, never guessed equivalence.
  const renamed = run([row('rust/src/old.rs')], [row('rust/src/new.rs')]);
  assert.deepEqual(renamed.added, ['rust/src/new.rs']);
  assert.deepEqual(renamed.removed, ['rust/src/old.rs']);
});

test('reviewed assignments cannot close semantic or source-draft requirements', () => {
  const source = row('rust/src/lib.rs', {reviewStatus: 'REVIEWED', unresolved: []});
  const result = run([source], [source]);
  assert.equal(result.scopeReviewComplete, true);
  assert.equal(result.draftedRequirements, null);
  assert.equal(result.translationCoverage, null);
  assert.equal(result.semanticAuthority, false);
  const unresolved = row('rust/src/lib.rs', {reviewStatus: 'REVIEWED'});
  assert.equal(run([unresolved], [unresolved]).scopeReviewComplete, false);
});

test('duplicate invalid unselected and falsely assigned metadata refuses', () => {
  const source = row('rust/src/lib.rs');
  for (const bad of [row('../escape.rs'), row('/absolute.rs'), row('rust/src/../escape.rs'),
    row('rust/src//empty.rs'), row('other.rs'), row('rust/src/lib.rs', {bytes: -1}),
    row('rust/src/lib.rs', {blob: 'not-a-blob'}), row('rust/src/lib.rs', {mode: '160000'}),
    row('rust/src/lib.rs', {draftIds: ['F99']}), row('rust/src/lib.rs', {draftIds: ['F01', 'F01']}),
    row('rust/src/lib.rs', {reviewStatus: 'DRAFTED'}), row('rust/src/lib.rs', {unresolved: null}),
    row('rust/src/lib.rs', {functionReviewAnchors: [[0, 'bad']]})]) assert.throws(() => run([bad], []));
  assert.throws(() => run([source, source], []));
  assert.throws(() => run([source], [source, source]));
  assert.throws(() => run([], [row('outside.rs')]));
});

test('selection retains path boundaries and exact build files', () => {
  const selected = draftInventorySelection(selection);
  assert.equal(selected('rust/src/lib.rs'), true);
  assert.equal(selected('rust/Cargo.toml'), true);
  assert.equal(selected('rust/src-other/lib.rs'), false);
  assert.equal(selected('rust/tests/native.rs'), false);
  for (const path of ['', '.', '..', 'rust\\src\\lib.rs', 'a\nb', 'a\0b']) {
    assert.throws(() => draftInventoryPath(path));
  }
  assert.throws(() => draftInventorySelection({roots: ['rust/src'], exact: []}));
  assert.throws(() => draftInventorySelection({roots: ['rust/src/', 'rust/src/'], exact: []}));
});

test('chunk loading retains exact source metadata and refuses truncation or tampering', () => {
  const directory = mkdtempSync(join(tmpdir(), 'router-draft-inventory-case-'));
  try {
    const chunk = JSON.stringify(row('rust/src/lib.rs')) + '\n';
    const descriptor = {path: 'source-paths-01.jsonl', rows: 1,
      sha256: createHash('sha256').update(chunk).digest('hex')};
    const manifest = {schema: 'router-source-draft-inventory-v1', revision: 'c'.repeat(40),
      selection, chunks: [descriptor], trackedPaths: 1};
    writeFileSync(join(directory, descriptor.path), chunk);
    const write = value => writeFileSync(join(directory, 'manifest.json'), JSON.stringify(value));
    write(manifest);
    assert.deepEqual(readDraftInventory(directory).baseline, [row('rust/src/lib.rs')]);
    write({...manifest, trackedPaths: 2}); assert.throws(() => readDraftInventory(directory));
    write({...manifest, chunks: [descriptor, descriptor]}); assert.throws(() => readDraftInventory(directory));
    write({...manifest, chunks: [{...descriptor, path: '../source-paths-01.jsonl'}]});
    assert.throws(() => readDraftInventory(directory));
    write(manifest);
    writeFileSync(join(directory, descriptor.path), chunk.trimEnd());
    assert.throws(() => readDraftInventory(directory));
  } finally { rmSync(directory, {recursive: true, force: true}); }
});
