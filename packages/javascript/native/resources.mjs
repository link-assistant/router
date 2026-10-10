// Native request-log inspection, following src/log_analysis.rs and lino_json.rs.
import { open, lstat, readdir, mkdir, mkdtemp, rename, chmod, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, join, dirname, parse } from 'node:path';
import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { isIP } from 'node:net';

const exec = promisify(execFile);
const tlsTasks = new Map();
const MAX_BYTES = 256 * 1024 * 1024, MAX_FILES = 10000, MAX_DEPTH = 128;
const unsupported = message => Object.assign(new Error(message), { code:'unsupported' });
const bad = message => Object.assign(new Error(message), { code:'invalid_resource' });
export const supportedResourceOperations = Object.freeze({
  'logs.show': { status:'partial', limitations:['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
  'logs.summary': { status:'partial', limitations:['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
  'logs.anomalies': { status:'partial', limitations:['Local logs only; 256 MiB / 10000-file read budget; symlinks refused; zstd needs a Node runtime with zstdDecompressSync.'] },
  'tls.ca': { status:'partial', limitations:['Local generated certificate only; symlinks refused; PEM size bounded to 1 MiB.'] },
  'tls.generate': { status:'partial', limitations:['Local only; requires openssl on PATH; validates names; symlinks refused; existing complete pair reused.'] },
});

// The three on-disk generations are JSONL, colon-pair lino, and marked lino.
export function decodeLogLine(source) {
  const text = source.trim(); if (!text) return undefined;
  if (/^[\[{]/.test(text)) { try { return JSON.parse(text); } catch { return undefined; } }
  let pos = 0;
  const space = () => { while (/\s/.test(text[pos] ?? '') && pos < text.length) pos++; };
  const expect = char => { if (text[pos++] !== char) throw bad('Malformed log record'); };
  const quoted = escaped => {
    expect('"'); let value = '', closed = false;
    while (pos < text.length) {
      const ch = text[pos++]; if (ch === '"') { closed = true; break; }
      if (ch === '\\') { const next = text[pos++]; if (next === undefined) throw bad('Malformed quoted record'); value += next === 'n' ? '\n' : next === 'r' ? '\r' : next; }
      else value += ch;
    }
    if (!closed) throw bad('Malformed quoted record');
    return escaped ? value === '%z' ? '' : value.replace(/%([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex,16))) : value;
  };
  const value = (escaped = false, depth = 0) => {
    if (depth > MAX_DEPTH) throw bad('Log record nesting exceeds 128');
    space(); if (text[pos] === '"') return quoted(escaped);
    if (text[pos] !== '(') {
      const start = pos; while (pos < text.length && !/[\s()]/.test(text[pos])) pos++;
      const token = text.slice(start,pos);
      if (['null','true','false'].includes(token)) return JSON.parse(token);
      if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) throw bad('Malformed scalar record');
      const number = Number(token); if (!Number.isFinite(number)) throw bad('Invalid number'); return number;
    }
    pos++; space(); let marker = null;
    if (text[pos] === '#') { marker = text.slice(pos,pos+2); pos += 2; if (!['#a','#o'].includes(marker)) throw bad('Invalid marker'); }
    const object = Object.create(null), items = []; let keyed = true, pairs = 0;
    while (true) {
      space(); if (pos >= text.length) throw bad('Unclosed record');
      if (text[pos] === ')') { pos++; break; }
      if (marker === '#o' || (!marker && text[pos] === '(' && text[pos+1] === ':')) {
        expect('('); if (!marker) expect(':'); space(); const name = quoted(marker === '#o');
        object[name] = value(marker === '#o',depth+1); space(); expect(')'); pairs++;
      } else { keyed = false; items.push(value(marker === '#a',depth+1)); }
    }
    if (marker === '#o' || (!marker && keyed && pairs)) return object;
    if (!marker && !pairs && !items.length) return null;
    return items;
  };
  try { const record = value(text[0] !== '('); space(); return pos === text.length ? record : undefined; }
  catch { return undefined; }
}

async function statOptional(path) { try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function noLinks(path) {
  let current = resolve(path), hops = 0;
  while (true) {
    const stat = await statOptional(current); if (stat?.isSymbolicLink()) throw bad(`Resource path contains a symlink: ${current}`);
    if (current === parse(current).root) break;
    current = dirname(current); if (++hops > 256) throw bad('Resource path is too deep');
  }
}
async function boundedFile(path, budget) {
  await noLinks(path);
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await handle.stat(); if (!stat.isFile()) throw bad(`Resource requires a regular file: ${path}`);
    if (stat.size > budget.remaining) throw unsupported(`Resource read exceeds the ${budget.limit} byte budget`);
    const chunks = []; let total = 0;
    while (true) {
      const chunk = Buffer.alloc(Math.min(65536,budget.remaining-total+1));
      const { bytesRead } = await handle.read(chunk,0,chunk.length,null); if (!bytesRead) break;
      total += bytesRead; if (total > budget.remaining) throw unsupported(`Resource read exceeds the ${budget.limit} byte budget`);
      chunks.push(chunk.subarray(0,bytesRead));
    }
    budget.remaining -= total; return Buffer.concat(chunks,total);
  } finally { await handle.close(); }
}
function utf8(bytes,path) {
  try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  catch { throw bad(`Resource is not valid UTF-8: ${path}`); }
}
async function readLogs(root, token) {
  await noLinks(root); const rootStat = await statOptional(root);
  if (!rootStat?.isDirectory()) return { files:[], bytes:0, unparsable:0 };
  const files = [];
  for (const name of (await readdir(root)).sort()) {
    if (token !== undefined && !name.startsWith(token)) continue;
    const directory = join(root,name), stat = await lstat(directory);
    if (stat.isSymbolicLink()) throw bad(`Request-log directory is a symlink: ${directory}`);
    if (!stat.isDirectory()) continue;
    for (const filename of ['requests.lino','requests.jsonl']) {
      const path = join(directory,filename), info = await statOptional(path);
      if (!info) continue;
      if (info.isSymbolicLink() || !info.isFile()) throw bad(`Request-log path is not a regular file: ${path}`);
      files.push(path); if (files.length > MAX_FILES) throw unsupported('Request-log file count exceeds 10000');
    }
  }
  const budget = {remaining:MAX_BYTES,limit:MAX_BYTES}, decoded = []; let unparsable = 0;
  for (const path of files.sort()) {
    const bytes = await boundedFile(path,budget);
    // Rust read_to_string refuses invalid UTF-8; replacement could hide corruption.
    const text = utf8(bytes,path);
    const records = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue; const record = decodeLogLine(line);
      if (record === undefined) unparsable++; else records.push(record);
    }
    decoded.push(records);
  }
  return { files:decoded, bytes:MAX_BYTES-budget.remaining, unparsable };
}
const terminates = text => ['message_stop','[DONE]','response.completed','finishReason'].some(marker => text.includes(marker));
function encoding(header) { return (header ?? 'identity').split(',').map(s=>s.trim()).filter(Boolean).at(-1)?.toLowerCase() ?? 'identity'; }
function base64Bytes(text) { return typeof text === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text) ? Buffer.from(text,'base64') : null; }
function decompress(bytes, kind) {
  if (kind === 'identity' || !bytes.length) return null;
  const decoders = {gzip:zlib.gunzipSync,'x-gzip':zlib.gunzipSync,deflate:zlib.inflateRawSync,br:zlib.brotliDecompressSync,zstd:zlib.zstdDecompressSync};
  if (kind === 'zstd' && !decoders.zstd) throw unsupported('zstd request-log decoding requires a Node runtime with zstdDecompressSync');
  if (!decoders[kind]) return null;
  try {
    const decoded = decoders[kind](bytes,{finishFlush:zlib.constants.Z_SYNC_FLUSH,maxOutputLength:MAX_BYTES});
    return decoded.length ? decoded.toString('utf8') : null;
  } catch (error) {
    if (error.code === 'ERR_BUFFER_TOO_LARGE') throw unsupported('Decoded request body exceeds the 256 MiB budget');
    return null;
  }
}
function exchanges(log) {
  const map = new Map();
  for (const record of log.files.flat()) {
    if (!record || typeof record.correlation_id !== 'string') continue;
    const id = record.correlation_id;
    const x = map.get(id) ?? {id,records:0,streamed:false,evidence:false,requested:false,inspectable:true,terminated:false,undecodable:0,encoded:[],kind:'identity'};
    map.set(id,x); x.records++;
    if (record.phase === 'client_request') {
      if (record.body && typeof record.body === 'object' && 'base64' in record.body) x.undecodable++;
      if (record.body?.json?.stream === true) x.requested = true;
    }
    if (['client_response','upstream_response'].includes(record.phase)) {
      const status = Number.isSafeInteger(record.status) && record.status >= 0 ? record.status : undefined;
      if (record.phase === 'client_response') x.status = status; else x.upstream = status;
      if (typeof record.headers?.['content-encoding'] === 'string') x.kind = encoding(record.headers['content-encoding']);
      const type = record.headers?.['content-type'];
      if (typeof type === 'string' && type.split(';')[0].trim()) { x.evidence = true; x.streamed = type.split(';')[0].trim().toLowerCase() === 'text/event-stream'; }
    }
    if (['client_response_body','upstream_response_body'].includes(record.phase)) {
      if (typeof record.body?.base64 === 'string') {
        if (record.phase === 'upstream_response_body') { x.undecodable++; const bytes = base64Bytes(record.body.base64); if (bytes) x.encoded.push(bytes); }
      } else if (record.body != null && terminates(typeof record.body === 'string' ? record.body : JSON.stringify(record.body))) x.terminated = true;
    }
    if (record.phase === 'stream_end') {
      if (!x.evidence) x.streamed = true;
      x.outcome = typeof record.outcome === 'string' ? record.outcome : undefined;
      x.complete = typeof record.complete === 'boolean' ? record.complete : undefined;
      if (typeof record.inspectable === 'boolean') x.inspectable = record.inspectable;
    }
  }
  for (const x of map.values()) {
    if (!['identity','gzip','x-gzip','deflate','br','zstd'].includes(x.kind)) x.inspectable = false;
    else if (x.kind !== 'identity' && x.encoded.length) {
      const decoded = decompress(Buffer.concat(x.encoded),x.kind);
      if (!decoded) x.inspectable = false;
      else {
        x.inspectable = true; x.undecodable = 0;
        x.error = decoded.split(/\r?\n/).some(line => {
          const text = line.trim(); if (text.toLowerCase() === 'event: error') return true;
          if (!text.startsWith('data:')) return false;
          try { return JSON.parse(text.slice(5).trim()).type === 'error'; } catch { return false; }
        });
        if (terminates(decoded)) { x.terminated = true; if (x.complete === false) {x.complete = true; x.outcome = 'completed';} }
      }
    }
    if (!x.evidence && x.requested) x.streamed = true;
  }
  return [...map.values()].sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
const incomplete = x => x.streamed && x.inspectable && x.complete === false;
const unterminated = x => x.streamed && x.inspectable && x.outcome === undefined && !x.terminated;
const unverifiable = x => x.streamed && !x.inspectable;
function summary(log, all) {
  const result = {exchanges:all.length,records:0,bytes:log.bytes,statuses:{},streamed:0,non_streamed:0,incomplete_streams:0,unterminated_streams:0,unverifiable_streams:0,unparsable_records:log.unparsable,undecodable_bodies:0};
  for (const x of all) {
    result.records += x.records; result.undecodable_bodies += x.undecodable;
    const status = x.status ?? x.upstream; if (status !== undefined) result.statuses[status] = (result.statuses[status] ?? 0)+1;
    result[x.streamed ? 'streamed' : 'non_streamed']++;
    if (incomplete(x)) result.incomplete_streams++;
    if (unterminated(x)) result.unterminated_streams++;
    if (unverifiable(x)) result.unverifiable_streams++;
  }
  return result;
}
function anomalies(all) {
  const result = [], add = (kind, detail, test, minimum = 1) => {
    const ids = all.filter(test).map(x=>x.id); if (ids.length >= minimum) result.push({kind,detail:typeof detail === 'function' ? detail(ids.length) : detail,correlation_ids:ids});
  };
  add('stream_ended_without_terminator','a streamed turn stopped before its dialect terminator; the client saw a truncated answer while the status line said 200',incomplete);
  add('no_terminal_record','a streamed exchange has no terminal record, so how it ended is unknown',unterminated);
  add('stream_carried_an_error','a streamed turn carried an error event while the status line said 200, so the transport reported success for a turn that failed',x=>x.error);
  add('stream_not_verifiable','a streamed exchange was relayed under an encoding this router cannot decode, so its frames cannot be inspected for a terminator; how it ended is not knowable from the log',unverifiable);
  add('repeated_authentication_failure',n=>`${n} exchanges were refused with 401/403, which is misconfiguration rather than load`,x=>[401,403].includes(x.status),2);
  add('rate_limited',n=>`${n} exchanges were rate limited`,x=>x.status === 429);
  add('undecodable_bodies','bodies are compressed or binary, so their contents cannot be inspected from the log; recorded so absence of evidence is not read as evidence',x=>x.undecodable > 0);
  return result;
}
function show(log,id) {
  const records = [];
  for (const file of log.files) {
    const selected = file.filter(record=>record?.correlation_id === id);
    const header = selected.find(record=>typeof record.headers?.['content-encoding'] === 'string')?.headers['content-encoding'];
    const stored = selected.map(record=>base64Bytes(record.body?.base64)).filter(Boolean);
    const decoded = decompress(Buffer.concat(stored),encoding(header));
    const first = selected.findIndex(record=>typeof record.body?.base64 === 'string');
    for (const [index,record] of selected.entries()) records.push(decoded && typeof record.body?.base64 === 'string' ? {...record,body:index === first ? decoded : '[decoded with the first frame: only the whole stream decodes]'} : record);
  }
  const output = records.length ? records.flatMap(record=>JSON.stringify(record,null,2).split('\n')) : [`no records for correlation id ${id}`];
  return {correlation_id:id,records,output};
}

async function tlsGenerate(dataDir,dns) {
  const directory = join(dataDir,'tls'), cert = join(directory,'cert.pem'), key = join(directory,'key.pem');
  await noLinks(directory); await noLinks(cert); await noLinks(key);
  const certStat = await statOptional(cert), keyStat = await statOptional(key);
  if (certStat?.isFile() && keyStat?.isFile()) return {output:[cert]};
  if ((certStat && !certStat.isFile()) || (keyStat && !keyStat.isFile())) throw bad('TLS certificate and key paths must be regular files');
  const names = [...new Set(String(dns ?? 'localhost').split(',').map(s=>s.trim()).filter(Boolean).concat('localhost','127.0.0.1'))];
  if (names.length > 100 || names.some(name=> !isIP(name) && !/^(?:\*\.)?[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(name))) throw bad('TLS names must be DNS names or IP addresses (at most 100 names)');
  await mkdir(directory,{recursive:true,mode:0o700}); await chmod(directory,0o700);
  const temporary = await mkdtemp(join(directory,'.generate-'));
  try {
    await exec('openssl',['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-sha256','-days','3650','-subj','/CN=rcgen self signed cert','-addext',`subjectAltName=${names.map(name=>`${isIP(name) ? 'IP' : 'DNS'}:${name}`).join(',')}`,'-keyout',join(temporary,'key.pem'),'-out',join(temporary,'cert.pem')],{timeout:10000,maxBuffer:1024*1024,windowsHide:true});
    await chmod(join(temporary,'key.pem'),0o600); await chmod(join(temporary,'cert.pem'),0o600);
    await rename(join(temporary,'cert.pem'),cert); await rename(join(temporary,'key.pem'),key);
  } catch (error) {
    if (error.code === 'ENOENT') throw unsupported('Native tls.generate requires openssl on PATH');
    throw bad('Could not generate a self-signed TLS certificate');
  } finally { await rm(temporary,{recursive:true,force:true}); }
  return {output:[cert]};
}

async function serializedTlsGenerate(dataDir,dns) {
  const before = tlsTasks.get(dataDir) ?? Promise.resolve();
  const task = before.catch(()=>{}).then(()=>tlsGenerate(dataDir,dns));
  tlsTasks.set(dataDir,task);
  try { return await task; } finally { if (tlsTasks.get(dataDir) === task) tlsTasks.delete(dataDir); }
}

export async function executeResourceOperation({name,options = {},config = {},core}) {
  if (!supportedResourceOperations[name]) throw unsupported(`Native resource operation ${name} is unavailable`);
  const accepted = new Set(['data_dir','home','local','json',...(name.startsWith('logs.') ? ['token','correlation_id','request_log'] : name === 'tls.generate' ? ['dns'] : [])]);
  for (const [key,value] of Object.entries(options)) if (value !== undefined && value !== false && !accepted.has(key)) throw unsupported(`Native ${name} does not support option ${key}`);
  const resolvedConfig = core?.config ?? config;
  const dataDir = options.data_dir ?? resolvedConfig.data_dir ?? resolvedConfig.dataDir;
  if (typeof dataDir !== 'string' || !dataDir) throw bad('Resource operation requires a resolved data directory');
  if (name === 'tls.generate') return serializedTlsGenerate(resolve(dataDir),options.dns);
  if (name === 'tls.ca') {
    const path = join(resolve(dataDir),'tls','cert.pem');
    try {
      const bytes = await boundedFile(path,{remaining:1024*1024,limit:1024*1024});
      const output = utf8(bytes,path).split(/\r?\n/); if (output.at(-1) === '') output.pop();
      return {output};
    }
    catch (error) { if (error.code === 'ENOENT') throw bad(`no generated certificate at ${path}; start the router with TLS_SELF_SIGNED=1 first`); throw error; }
  }
  if (options.token !== undefined && typeof options.token !== 'string') throw bad('Log token filter must be a string');
  if (name === 'logs.show' && typeof options.correlation_id !== 'string') throw bad('logs.show requires correlation_id');
  const root = options.request_log ?? resolvedConfig.request_log ?? join(dataDir,'requests');
  const log = await readLogs(root,options.token);
  if (name === 'logs.show') return show(log,options.correlation_id);
  const all = exchanges(log);
  if (name === 'logs.summary') return summary(log,all);
  const found = anomalies(all);
  if (found.length) throw Object.assign(new Error('Request-log anomalies found'),{data:found,exitCode:1});
  return found;
}
