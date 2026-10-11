import { mkdir, open, readFile, rename, unlink, rm, stat } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { rustLockPath, withAdvisoryFileLock } from './file-lock.mjs';
import { encodeBinaryTokenRecords, readBinaryTokenRecords } from './doublets.mjs';

const queues = new Map();
export async function serialized(key, operation) {
  const previous = queues.get(key) ?? Promise.resolve();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => held);
  queues.set(key, tail);
  await previous.catch(() => {});
  try { return await operation(); }
  finally { release(); if (queues.get(key) === tail) queues.delete(key); }
}
export async function atomicWrite(path, text) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let file;
  try {
    file = await open(temporary, 'wx', 0o600);
    await file.writeFile(text, 'utf8'); await file.sync(); await file.close(); file = null;
    await rename(temporary, path);
    await syncDirectory(dirname(path));
  } finally { await file?.close(); await unlink(temporary).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
}
// Separate from Rust's advisory flock file: native writers coordinate via an
// exclusive directory. Mixed Rust/native writers are deliberately unsupported.
export async function withNativeFileLock(path, operation, timeout = 30000) {
  const lock = `${path}.native-lock`;
  await mkdir(dirname(path), {recursive:true,mode:0o700});
  const started = Date.now();
  for (;;) {
    try {
      await mkdir(lock,{mode:0o700});
      try { await atomicWrite(`${lock}/owner.json`,JSON.stringify({pid:process.pid})); }
      catch (error) { await rm(lock,{recursive:true,force:true}); throw error; }
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let dead = false;
      try {
        const owner = JSON.parse(await readFile(`${lock}/owner.json`,'utf8'));
        if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0) throw new Error('Invalid native lock owner');
        try { process.kill(owner.pid,0); } catch (error) { if (error.code === 'ESRCH') dead = true; else if (error.code !== 'EPERM') throw error; }
      } catch (error) {
        if (error.code === 'ENOENT') {
          try { dead = Date.now()-(await stat(lock)).mtimeMs > timeout; } catch (e) { if (e.code !== 'ENOENT') throw e; }
        } else throw error;
      }
      if (dead) {
        const reaper = `${lock}.reap`;
        try {
          await mkdir(reaper,{mode:0o700});
          try {
            let stillDead = false;
            try {
              const owner = JSON.parse(await readFile(`${lock}/owner.json`,'utf8'));
              try { process.kill(owner.pid,0); } catch (e) { stillDead = e.code === 'ESRCH'; }
            } catch (e) { if (e.code === 'ENOENT') { try { stillDead = Date.now()-(await stat(lock)).mtimeMs > timeout; } catch {} } }
            if (stillDead) await rm(lock,{recursive:true,force:true});
          } finally { await rm(reaper,{recursive:true,force:true}); }
        } catch (e) { if (e.code !== 'EEXIST') throw e; }
        continue;
      }
      if (Date.now()-started >= timeout) throw new Error('Timed out waiting for native storage lock');
      await new Promise(resolve => setTimeout(resolve,20));
    }
  }
  try { return await operation(); }
  finally { await rm(lock,{recursive:true,force:true}); }
}
export async function readOptional(path, fallback = '') {
  try { return await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
const transactionPaths = path => ({rollback:join(dirname(path),`.${basename(path)}.router-rollback`),commit:join(dirname(path),`.${basename(path)}.router-commit`)});
const removeOptional = async path => { try { await unlink(path); } catch (error) { if (error.code !== 'ENOENT') throw error; } };
async function syncDirectory(path) {
  if (process.platform === 'win32') return;
  const directory = await open(path,'r'); try { await directory.sync(); } finally { await directory.close(); }
}
export async function recoverTransactionalWrite(path) {
  const {rollback,commit} = transactionPaths(path);
  const marker = await readOptional(commit,null);
  if (marker != null) { await removeOptional(rollback); await syncDirectory(dirname(path)); await removeOptional(commit); await syncDirectory(dirname(path)); return; }
  let previous;
  try { previous = await readFile(rollback); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (previous[0] === 0) await removeOptional(path);
  else if (previous[0] === 1) await atomicWrite(path,previous.subarray(1));
  else throw new Error('Invalid transactional rollback document');
  await unlink(rollback); await syncDirectory(dirname(path));
}
export async function transactionalWrite(path,contents) {
  await recoverTransactionalWrite(path);
  const {rollback,commit} = transactionPaths(path);
  let previous;
  try { previous = Buffer.concat([Buffer.from([1]),await readFile(path)]); }
  catch (error) { if (error.code !== 'ENOENT') throw error; previous = Buffer.from([0]); }
  await atomicWrite(rollback,previous);
  try { await atomicWrite(path,contents); await atomicWrite(commit,'committed\n'); }
  catch (error) { await removeOptional(commit); await syncDirectory(dirname(path)); await recoverTransactionalWrite(path); throw error; }
  await recoverTransactionalWrite(path).catch(() => {});
}

function quote(text) {
  if (!text.includes('"')) return `"${text}"`;
  if (!text.includes("'")) return `'${text}'`;
  const delimiter = text.startsWith('"') ? "'" : '"';
  const runs = text.match(new RegExp(`${delimiter}+`, 'g')) ?? [];
  const count = Math.max(3, ...runs.map(run => run.length + 1));
  return delimiter.repeat(count) + text + delimiter.repeat(count);
}
// Rust lino-objects-codec 0.7 readable format. Strings are literal, not JSON escaped.
export function encodeLino(value, level = 0) {
  if (typeof value === 'string') {
    if (/[\x00-\x08\x0b-\x1f\x7f]/.test(value)) {
      const escaped = value.replace(/[%\x00-\x08\x0b-\x1f\x7f]/g, c => `%${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`);
      return `(escaped ${quote(escaped)})`;
    }
    return quote(value);
  }
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'number') { if (!Number.isSafeInteger(value)) throw new Error('Storage numbers must be safe integers'); return String(value); }
  const indent = '  '.repeat(level + 1), close = '  '.repeat(level);
  if (Array.isArray(value)) return value.length ? `(\n${value.map(v => indent + encodeLino(v, level + 1)).join('\n')}\n${close})` : '()';
  const entries = Object.entries(value);
  return `(\n${entries.map(([key, v]) => `${indent}${key} ${encodeLino(v, level + 1)}`).join('\n')}${entries.length ? '\n' : ''}${close})`;
}
export function decodeLino(text) {
  let i = 0;
  const skip = () => { while (text[i] === ' ' || text[i] === '\t' || text[i] === '\r') i++; };
  function scalar(raw, quoted = false) {
    if (quoted) return raw;
    if (raw === 'null') return null;
    if (raw === 'true' || raw === 'false') return raw === 'true';
    if (/^-?\d+$/.test(raw)) { const n = Number(raw); if (!Number.isSafeInteger(n)) throw new Error('Unsafe storage integer'); return n; }
    return raw;
  }
  function value() {
    skip();
    if (text[i] === '(') {
      i++; skip();
      const rows = []; let row = [], multiline = false;
      while (i < text.length && text[i] !== ')') {
        if (text[i] === '\n') { multiline = true; if (row.length) rows.push(row); row = []; i++; skip(); continue; }
        row.push(value()); skip();
      }
      if (text[i++] !== ')') throw new Error('Unclosed Links Notation container');
      if (row.length) rows.push(row);
      if (rows.length === 1 && rows[0][0] === 'escaped' && rows[0].length === 2) {
        return rows[0][1].replace(/(?:%[0-9A-Fa-f]{2})+/g, run => Buffer.from(run.replaceAll('%', ''), 'hex').toString('utf8'));
      }
      if (rows.length === 1 && rows[0][0] === 'o:') {
        const object = Object.create(null);
        for (const pair of rows[0].slice(1)) {
          const entries = Array.isArray(pair) ? [pair] : Object.entries(pair);
          if (entries.length !== 1 || entries[0].length !== 2) throw new Error('Invalid Lino object pair');
          object[entries[0][0]] = entries[0][1];
        }
        return object;
      }
      if (multiline && rows.every(r => r.length === 2 && typeof r[0] === 'string')) {
        const object = Object.create(null);
        for (const [key, v] of rows) { if (Object.hasOwn(object, key)) throw new Error('Duplicate Lino key'); object[key] = v; }
        return object;
      }
      return rows.flat();
    }
    if (text[i] === '"' || text[i] === "'" || text[i] === '`') {
      const delimiter = text[i]; let count = 0;
      while (text[i + count] === delimiter) count++;
      if (count === 2) { i += 2; return ''; }
      i += count; let raw = '';
      while (i < text.length) {
        if (text[i] !== delimiter) { raw += text[i++]; continue; }
        let run = 0; while (text[i+run] === delimiter) run++;
        if (count === 1) {
          if (run >= 2) { raw += delimiter; i += 2; continue; }
          i++; return scalar(raw,true);
        }
        if (run >= count) { raw += delimiter.repeat(run-count); i += run; return scalar(raw,true); }
        raw += delimiter.repeat(run); i += run;
      }
      throw new Error('Unclosed Lino string');
    }
    const start = i;
    while (i < text.length && !/[\s()]/.test(text[i])) i++;
    if (i === start) throw new Error('Invalid Links Notation input');
    return scalar(text.slice(start, i));
  }
  while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  const result = value();
  while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  if (i !== text.length) throw new Error('Trailing Links Notation data');
  return result;
}

const strings = ['max_requests', 'used_requests', 'max_tokens', 'used_tokens', 'reserved_tokens', 'rate_limit_per_minute', 'rate_window_started_at', 'rate_window_requests', 'sliding_window_seconds', 'run_lease_expires_at'];
export function encodeTokenRecords(records) {
  const values = records.slice().sort((a,b) => a.id.localeCompare(b.id)).map(record => {
    const value = { ...record };
    for (const field of strings) if (value[field] != null) value[field] = String(value[field]);
    value.github_repos = (value.github_repos ?? []).join(',');
    value.model_policy = JSON.stringify(value.model_policy ?? {});
    return { type: 'TokenRecord', subtype: record.id, value };
  });
  return encodeLino({ type: 'RouterState', subtype: 'TokenStore', value: values });
}
export function decodeTokenRecords(text) {
  if (!text.trim()) return [];
  const root = decodeLino(text);
  if (root.type !== 'RouterState' || root.subtype !== 'TokenStore' || !Array.isArray(root.value)) throw new Error('Unsupported token storage format');
  const ids = new Set();
  return root.value.map(row => {
    if (row.type !== 'TokenRecord' || row.subtype !== row.value?.id || ids.has(row.subtype)) throw new Error('Invalid/duplicate token record');
    ids.add(row.subtype);
    const record = { ...row.value };
    for (const field of strings) if (record[field] != null) {
      if (!/^-?\d+$/.test(String(record[field]))) throw new Error(`Invalid token field ${field}`);
      record[field] = Number(record[field]);
      if (!Number.isSafeInteger(record[field]) || (field !== 'rate_window_started_at' && record[field] < 0)) throw new Error(`Unsafe token field ${field}`);
    }
    if (typeof record.id !== 'string' || typeof record.revoked !== 'boolean' || !Number.isSafeInteger(record.expires_at) || !Number.isSafeInteger(record.issued_at)) throw new Error('Invalid token record');
    record.github_repos = record.github_repos ? record.github_repos.split(',') : [];
    record.model_policy = JSON.parse(record.model_policy ?? '{}');
    return record;
  });
}
export class MemoryTokenStore {
  constructor(records = []) { this.records = new Map(records.map(r => [r.id, structuredClone(r)])); this.key = {}; }
  async transaction(operation) {
    return serialized(this.key, async () => {
      const records = new Map([...this.records].map(([id,r]) => [id, structuredClone(r)]));
      const result = await operation(records); this.records = records; return structuredClone(result);
    });
  }
  async list() { return structuredClone([...this.records.values()]); }
  async get(id) { return structuredClone(this.records.get(id) ?? null); }
  async put(record) { return this.transaction(records => records.set(record.id, structuredClone(record)) && record); }
  async delete(id) { return this.transaction(records => records.delete(id)); }
}
export class TextTokenStore extends MemoryTokenStore {
  constructor(path) { super(); this.path = path; }
  // Refresh under the native process lock before every mutation; read access
  // sees either complete projection because replacement is atomic.
  async transaction(operation) {
    return serialized(this.path, () => withAdvisoryFileLock(rustLockPath(this.path), async () => {
      await recoverTransactionalWrite(this.path);
      const records = new Map(decodeTokenRecords(await readOptional(this.path)).map(r => [r.id, r]));
      const result = await operation(records);
      await transactionalWrite(this.path, encodeTokenRecords([...records.values()]));
      this.records = records; return structuredClone(result);
    }));
  }
  async list() { return withAdvisoryFileLock(rustLockPath(this.path),async () => { await recoverTransactionalWrite(this.path); return decodeTokenRecords(await readOptional(this.path)); }); }
  async get(id) { return (await this.list()).find(r => r.id === id) ?? null; }
}
export class BinaryTokenStore extends MemoryTokenStore {
  constructor(path) { super(); this.path = path; }
  async transaction(operation) {
    return serialized(this.path,() => withAdvisoryFileLock(rustLockPath(this.path),async () => {
      const records = new Map((await readBinaryTokenRecords(this.path)).map(record => [record.id,record]));
      const result = await operation(records);
      await atomicWrite(this.path,encodeBinaryTokenRecords([...records.values()]));
      this.records = records; return structuredClone(result);
    }));
  }
  async list() { return withAdvisoryFileLock(rustLockPath(this.path),() => readBinaryTokenRecords(this.path),{shared:true}); }
  async get(id) { return (await this.list()).find(record => record.id === id) ?? null; }
}
export function mergeSaferRecord(current,other) {
  current.revoked ||= other.revoked;
  for (const field of ['used_requests','used_tokens','reserved_tokens']) current[field] = Math.max(current[field] ?? 0,other[field] ?? 0);
  if ((other.rate_window_started_at ?? 0) > (current.rate_window_started_at ?? 0)) {
    current.rate_window_started_at = other.rate_window_started_at; current.rate_window_requests = other.rate_window_requests;
  } else if (other.rate_window_started_at === current.rate_window_started_at) current.rate_window_requests = Math.max(current.rate_window_requests ?? 0,other.rate_window_requests ?? 0);
  return current;
}
export class DualTokenStore extends MemoryTokenStore {
  constructor(dataDir) {
    super(); this.path = join(dataDir,'tokens.transaction.lock'); this.journal = join(dataDir,'tokens.transaction.json');
    this.text = new TextTokenStore(join(dataDir,'tokens.lino')); this.binary = new BinaryTokenStore(join(dataDir,'tokens.bin'));
  }
  async install(records) {
    await this.text.transaction(current => { current.clear(); for (const record of records) current.set(record.id,record); });
    const projection = await this.binary.list();
    const canonical = rows => encodeTokenRecords(rows);
    if (canonical(projection) !== canonical(records)) await this.binary.transaction(current => { current.clear(); for (const record of records) current.set(record.id,record); });
    await removeOptional(this.journal); await syncDirectory(dirname(this.journal));
  }
  async recover() {
    const source = await readOptional(this.journal,null);
    if (source != null) {
      const records = source.trimStart().startsWith('[') ? JSON.parse(source) : decodeLino(source);
      if (!Array.isArray(records)) throw new Error('Invalid token transaction journal');
      await this.install(records);
    }
  }
  async mergedRecords() {
    const records = new Map((await this.text.list()).map(record => [record.id,record]));
    for (const record of await this.binary.list()) {
      if (records.has(record.id)) mergeSaferRecord(records.get(record.id),record); else records.set(record.id,record);
    }
    return records;
  }
  async transaction(operation) {
    return serialized(this.path,() => withAdvisoryFileLock(this.path,async () => {
      await this.recover();
      const records = await this.mergedRecords(), result = await operation(records);
      const sorted = [...records.values()].sort((left,right) => Buffer.compare(Buffer.from(left.id),Buffer.from(right.id)));
      await atomicWrite(this.journal,encodeLino(sorted)); await this.install(sorted);
      this.records = records; return structuredClone(result);
    }));
  }
  async list() {
    const read = async () => {
      const records = await this.text.list();
      return records.length ? records : [...(await this.mergedRecords()).values()];
    };
    const result = await withAdvisoryFileLock(this.path,async () => (await readOptional(this.journal,null)) != null ? null : read(),{shared:true});
    if (result != null) return result;
    return withAdvisoryFileLock(this.path,async () => { await this.recover(); return read(); });
  }
  async get(id) { return (await this.list()).find(record => record.id === id) ?? null; }
}
export function createTokenStore({ storage_policy = 'memory', data_dir = '.', storage } = {}) {
  if (storage) return storage;
  if (['memory','mem','none'].includes(storage_policy)) return new MemoryTokenStore();
  if (['text','txt','lino'].includes(storage_policy)) return new TextTokenStore(`${data_dir}/tokens.lino`);
  if (['binary','bin','link-cli','linkcli','clink'].includes(storage_policy)) return new BinaryTokenStore(`${data_dir}/tokens.bin`);
  if (['both','dual'].includes(storage_policy)) return new DualTokenStore(data_dir);
  throw Object.assign(new Error(`Unknown token storage policy '${storage_policy}'`),{code:'invalid_config'});
}
