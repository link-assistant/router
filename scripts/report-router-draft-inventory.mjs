// Deferred source-bookkeeping CLI. Do not execute during bulk drafting.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {draftInventoryPath, draftInventorySelection, reconcileDraftInventory} from '../tools/translation/draft-inventory-reconciliation.mjs';
import {readSelectedGitSizeRecords} from '../tools/translation/selected-git-size-records.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = join(root, 'docs/development/draft-inventory');
const fail = message => { throw new Error('Draft inventory report: ' + message); };
const hash = value => createHash('sha256').update(value).digest('hex');

export function readDraftInventory(directory) {
  const raw = readFileSync(join(directory, 'manifest.json'));
  if (raw.length > 1024 * 1024) fail('manifest byte bound');
  const manifest = JSON.parse(raw.toString('utf8'));
  if (manifest.schema !== 'router-source-draft-inventory-v1' ||
      !/^[a-f0-9]{40}$/u.test(manifest.revision) || !Array.isArray(manifest.chunks) ||
      manifest.chunks.length > 100 || !Number.isSafeInteger(manifest.trackedPaths) ||
      manifest.trackedPaths < 0 || manifest.trackedPaths > 20_000) fail('complete manifest required');
  draftInventorySelection(manifest.selection);
  const baseline = [], seen = new Set();
  for (const chunk of manifest.chunks) {
    draftInventoryPath(chunk.path);
    if (!/^source-paths-[0-9]{2}\.jsonl$/u.test(chunk.path) || seen.has(chunk.path) ||
        !/^[a-f0-9]{64}$/u.test(chunk.sha256) || !Number.isSafeInteger(chunk.rows) ||
        chunk.rows < 1 || chunk.rows > 250) fail('bounded unique chunk required');
    seen.add(chunk.path);
    const bytes = readFileSync(join(directory, chunk.path));
    if (bytes.length > 8 * 1024 * 1024 || hash(bytes) !== chunk.sha256) fail('chunk bytes changed');
    const text = bytes.toString('utf8');
    if (!text.endsWith('\n')) fail('truncated chunk');
    const lines = text.slice(0, -1).split('\n');
    if (lines.length !== chunk.rows) fail('chunk row count differs');
    baseline.push(...lines.map(line => JSON.parse(line)));
  }
  if (baseline.length !== manifest.trackedPaths) fail('complete path count differs');
  return {manifest, baseline};
}

export function reportDraftInventory({revision, run = (args, options) =>
  execFileSync('git', args, {cwd: root, maxBuffer: 32 * 1024 * 1024, ...options}),
  inventoryDirectory = directory} = {}) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/u.test(revision)) fail('explicit immutable revision required');
  const {manifest, baseline} = readDraftInventory(inventoryDirectory);
  const current = readSelectedGitSizeRecords({run, revision,
    select: draftInventorySelection(manifest.selection), maxPaths: 20_000,
    maxFileBytes: 8 * 1024 * 1024, maxTotalBytes: 256 * 1024 * 1024,
  }).map(record => {
    const tab = record.indexOf('\t'), fields = record.slice(0, tab).split(' ');
    return {path: record.slice(tab + 1), mode: fields[0], blob: fields[2], bytes: Number(fields[3])};
  });
  return {baselineRevision: manifest.revision, currentRevision: revision,
    scope: 'selected committed paths only; not working-tree edits or semantic coverage',
    report: reconcileDraftInventory({baseline, current, selection: manifest.selection})};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !/^[a-f0-9]{40}$/u.test(args[0])) fail('use one full commit SHA');
  console.log(JSON.stringify(reportDraftInventory({revision: args[0]}), null, 2));
}
