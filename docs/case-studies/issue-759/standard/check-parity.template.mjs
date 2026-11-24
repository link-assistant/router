#!/usr/bin/env node
// Inventory checks supplement shared behavior tests; they do not prove equivalence.
import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
const args = process.argv.slice(2);
const manifestPath = args.shift();
if (!manifestPath) throw new Error('Usage: node check-parity.template.mjs MANIFEST [--root DIR] [--strict]');
let root = path.dirname(path.resolve(manifestPath)), strict = false;
while (args.length) {
  const argument = args.shift();
  if (argument === '--strict') strict = true;
  else if (argument === '--root' && args.length) root = path.resolve(args.shift());
  else throw new Error(`Unsupported argument: ${argument}`);
}
root = await realpath(root);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const errors = [];
const states = new Set(['generated', 'ported', 'native-carried', 'partial', 'missing']);
const proven = new Set(['generated', 'ported']);
function safe(relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => ['.', '..', ''].includes(part))) throw new Error(`Unsafe path: ${JSON.stringify(relative)}`);
  return path.join(root, relative);
}
async function exists(relative) {
  try {
    const resolved = await realpath(safe(relative));
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error(`Symlink escapes root: ${relative}`);
    if (!(await stat(resolved)).isFile()) throw new Error(`Not a file: ${relative}`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return false;
  }
}
if (manifest.version !== 1 || !Array.isArray(manifest.entries) || !Array.isArray(manifest.inventoryRoots) || !manifest.inventoryRoots.length || !Array.isArray(manifest.exclusions)) throw new Error('Manifest requires version:1, entries, nonempty inventoryRoots and exclusions');
const ids = new Set(), covered = new Set();
for (const entry of manifest.entries) {
  if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) errors.push(`Missing/duplicate entry id: ${entry.id}`);
  ids.add(entry.id);
  if (!states.has(entry.state)) errors.push(`${entry.id}: unsupported state ${entry.state}`);
  if (!Array.isArray(entry.inputs) || !entry.inputs.length || !Array.isArray(entry.outputs) || !Array.isArray(entry.fixtures)) throw new Error(`${entry.id}: inputs, outputs and fixtures arrays required`);
  if (proven.has(entry.state) && (!entry.outputs.length || !entry.fixtures.length)) errors.push(`${entry.id}: completed state needs output and behavioral fixture paths`);
  if (strict && !proven.has(entry.state)) errors.push(`${entry.id}: ${entry.state} is incomplete in strict mode`);
  if (!proven.has(entry.state) && (typeof entry.reason !== 'string' || !entry.reason.trim())) errors.push(`${entry.id}: incomplete state needs a reason`);
  for (const relative of [...entry.inputs, ...entry.outputs]) {
    safe(relative);
    if (covered.has(relative)) errors.push(`Duplicate coverage: ${relative}`);
    covered.add(relative);
    if (!await exists(relative) && entry.state !== 'missing') errors.push(`${entry.id}: file missing: ${relative}`);
  }
  for (const relative of entry.fixtures) if (!await exists(relative)) errors.push(`${entry.id}: fixture missing: ${relative}`);
}
for (const exclusion of manifest.exclusions) {
  safe(exclusion.path);
  if (!exclusion.reason?.trim()) errors.push(`Exclusion needs reason: ${exclusion.path}`);
  if (covered.has(exclusion.path)) errors.push(`Excluded and covered: ${exclusion.path}`);
  covered.add(exclusion.path);
  if (!await exists(exclusion.path)) errors.push(`Exclusion file missing: ${exclusion.path}`);
  if (strict) errors.push(`Excluded file prevents complete parity: ${exclusion.path}`);
}
async function inventory(relative, extensions) {
  const directory = await realpath(safe(relative));
  if (directory !== root && !directory.startsWith(`${root}${path.sep}`)) throw new Error(`Inventory root escapes repository: ${relative}`);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) await inventory(child, extensions);
    else if (entry.isSymbolicLink()) throw new Error(`Inventory symlink is unsupported: ${child}`);
    else if (entry.isFile() && extensions.some(extension => child.endsWith(extension)) && !covered.has(child)) errors.push(`Uninventoried file: ${child}`);
  }
}
for (const entry of manifest.inventoryRoots) {
  if (!Array.isArray(entry.extensions) || !entry.extensions.length || entry.extensions.some(value => typeof value !== 'string' || !value.startsWith('.'))) throw new Error('Inventory extensions must be explicit suffixes');
  await inventory(entry.path, entry.extensions);
}
if (errors.length) {
  errors.forEach(error => console.error(error));
  process.exitCode = 1;
} else console.log(`${strict ? 'Strict' : 'Declared'} inventory validated; shared behavior and generator checks remain required.`);
