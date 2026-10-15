// File adapters keep logical fixture identities while physical structured data moves
// to inspectable LiNo. External JSON boundaries can be requested explicitly.
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readStructuredDataLino, structuredDataToLino } from './structured-data-links.js';

function pathString(file) {
  if (file instanceof URL) return fileURLToPath(file);
  if (typeof file !== 'string' || !file) throw new TypeError('project data needs a file path or URL');
  return file;
}

function selectedFormat(file, format) {
  if (!['auto', 'json', 'lino'].includes(format)) throw new TypeError('project data format must be auto, json or lino');
  return format === 'auto' ? extname(file).slice(1) : format;
}

export function resolveProjectDataPath(file, { format = 'auto' } = {}) {
  const logical = pathString(file);
  selectedFormat(logical, format);
  if (format === 'json') return logical;
  const extension = extname(logical);
  if (format === 'auto' && extension !== '.json' && extension !== '.lino') return logical;
  const stem = extension === '.json' || extension === '.lino' ? logical.slice(0, -extension.length) : logical;
  const json = `${stem}.json`;
  const lino = `${stem}.lino`;
  if (existsSync(json) && existsSync(lino)) throw new Error(`project data has duplicate JSON and LiNo storage: ${logical}`);
  if (format === 'lino' || extension === '.lino') return lino;
  return existsSync(lino) || !existsSync(json) ? lino : json;
}

export function readProjectFileBytes(file, options) {
  return readFileSync(resolveProjectDataPath(file, options));
}

export function readProjectData(file, { format = 'auto', limits } = {}) {
  const actual = resolveProjectDataPath(file, { format });
  const text = readFileSync(actual, 'utf8');
  const encoding = selectedFormat(actual, format);
  if (encoding === 'lino') return readStructuredDataLino(text, limits);
  if (encoding === 'json') return JSON.parse(text);
  throw new TypeError(`project data has an unsupported storage extension: ${actual}`);
}

export function serializeProjectData(value, file, { format = 'auto' } = {}) {
  const actual = resolveProjectDataPath(file, { format });
  const encoding = selectedFormat(actual, format);
  if (encoding === 'lino') return structuredDataToLino(value);
  if (encoding === 'json') {
    const text = JSON.stringify(value, null, 2);
    if (text === undefined) throw new TypeError('project data has no JSON representation');
    return `${text}\n`;
  }
  throw new TypeError(`project data has an unsupported storage extension: ${actual}`);
}

export function checkProjectData(file, value, options) {
  const actual = resolveProjectDataPath(file, options);
  const expected = serializeProjectData(value, file, options);
  if (readFileSync(actual, 'utf8') !== expected) throw new Error(`project data is stale: ${pathString(file)} (stored at ${actual})`);
  return true;
}

export function writeProjectData(file, value, options) {
  const actual = resolveProjectDataPath(file, options);
  const text = serializeProjectData(value, file, options);
  mkdirSync(dirname(actual), { recursive: true });
  const temporary = join(dirname(actual), `.${basename(actual)}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, text, { encoding: 'utf8', flag: 'wx' });
    renameSync(temporary, actual);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return actual;
}
